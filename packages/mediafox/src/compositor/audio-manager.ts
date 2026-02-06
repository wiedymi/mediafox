import type { AudioBufferSink, WrappedAudioBuffer } from 'mediabunny';
import type { AudioLayer, CompositorSource } from './types';

interface ActiveAudioSource {
  sourceId: string;
  bufferSink: AudioBufferSink;
  iterator: AsyncGenerator<WrappedAudioBuffer, void, unknown> | null;
  gainNode: GainNode;
  panNode: StereoPannerNode;
  queuedNodes: Set<AudioBufferSourceNode>;
  volume: number;
  pan: number;
  muted: boolean;
  startSourceTime: number; // Where in the source we started playing (fixed at playback start)
  currentSourceTime: number; // Current expected position (updated each frame for drift detection)
  iteratorStartTime: number; // AudioContext time when iterator was started
  lastScheduledTime: number;
}

export interface CompositorAudioManagerOptions {
  audioContext?: AudioContext;
}

/**
 * Audio manager for the compositor that handles multiple concurrent audio sources.
 * Each audio layer can have independent volume, pan, and mute controls.
 */
export class CompositorAudioManager {
  private audioContext: AudioContext;
  private masterGain: GainNode;
  private activeSources = new Map<string, ActiveAudioSource>();
  private activeSourceIdsScratch = new Set<string>();
  private playing = false;
  private disposed = false;
  private playbackId = 0;
  private startContextTime = 0;
  private startMediaTime = 0;
  private pauseTime = 0;
  private masterVolume = 1;
  private masterMuted = false;

  constructor(options: CompositorAudioManagerOptions = {}) {
    if (options.audioContext) {
      this.audioContext = options.audioContext;
    } else {
      const windowGlobal = globalThis as typeof globalThis & {
        webkitAudioContext?: typeof AudioContext;
      };
      const AudioContextClass = windowGlobal.AudioContext || windowGlobal.webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error('AudioContext is not supported in this environment');
      }
      this.audioContext = new AudioContextClass();
    }

    this.masterGain = this.audioContext.createGain();
    this.masterGain.connect(this.audioContext.destination);
  }

  /**
   * Registers an audio source that can be used in audio layers.
   * Must be called before using the source in processAudioLayers.
   */
  registerSource(source: CompositorSource, bufferSink: AudioBufferSink): void {
    if (this.disposed) return;

    // Create audio nodes for this source
    const gainNode = this.audioContext.createGain();
    const panNode = this.audioContext.createStereoPanner();

    gainNode.connect(panNode);
    panNode.connect(this.masterGain);

    this.activeSources.set(source.id, {
      sourceId: source.id,
      bufferSink,
      iterator: null,
      gainNode,
      panNode,
      queuedNodes: new Set(),
      volume: 1,
      pan: 0,
      muted: false,
      startSourceTime: 0,
      currentSourceTime: 0,
      iteratorStartTime: 0,
      lastScheduledTime: 0,
    });
  }

  /**
   * Unregisters an audio source.
   */
  unregisterSource(sourceId: string): void {
    const source = this.activeSources.get(sourceId);
    if (!source) return;

    this.stopSourceAudio(source);
    source.gainNode.disconnect();
    source.panNode.disconnect();
    this.activeSources.delete(sourceId);
  }

  /**
   * Checks if a source is registered.
   */
  hasSource(sourceId: string): boolean {
    return this.activeSources.has(sourceId);
  }

  /**
   * Processes audio layers for the current frame.
   * Updates which sources are playing and their parameters.
   */
  processAudioLayers(layers: AudioLayer[], mediaTime: number): void {
    if (this.disposed) return;

    // Track which sources are active in this frame
    const activeSourceIds = this.activeSourceIdsScratch;
    activeSourceIds.clear();

    for (const layer of layers) {
      const sourceId = layer.source.id;
      activeSourceIds.add(sourceId);

      const source = this.activeSources.get(sourceId);
      if (!source) continue;

      // Update source parameters
      const volume = layer.volume ?? 1;
      const pan = layer.pan ?? 0;
      const muted = layer.muted ?? false;
      const sourceTime = layer.sourceTime ?? mediaTime;

      // Update gain and pan if changed
      if (source.volume !== volume || source.muted !== muted) {
        source.volume = volume;
        source.muted = muted;
        source.gainNode.gain.value = muted ? 0 : volume * volume;
      }

      if (source.pan !== pan) {
        source.pan = pan;
        source.panNode.pan.value = Math.max(-1, Math.min(1, pan));
      }

      // Check if we need to restart from a different source time (seek detected)
      const timeDrift = Math.abs(sourceTime - source.currentSourceTime);
      if (timeDrift > 0.5 && source.iterator !== null) {
        // Source time changed significantly, restart iterator
        this.restartSourceIterator(source, sourceTime);
      }

      // Update current position for drift detection (not used in scheduling)
      source.currentSourceTime = sourceTime;
    }

    // Stop sources that are no longer in the layers
    for (const [sourceId, source] of this.activeSources) {
      if (!activeSourceIds.has(sourceId) && source.iterator !== null) {
        this.stopSourceAudio(source);
      }
    }
  }

  /**
   * Starts audio playback from the specified time.
   */
  async play(fromTime: number = this.pauseTime): Promise<void> {
    if (this.playing || this.disposed) return;

    // Resume audio context if suspended
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.playbackId++;
    this.playing = true;
    this.startContextTime = this.audioContext.currentTime;
    this.startMediaTime = fromTime;
    this.pauseTime = fromTime;

    // Clear any stale iterators so sources can be restarted fresh
    for (const source of this.activeSources.values()) {
      if (source.iterator) {
        void source.iterator.return();
        source.iterator = null;
      }
    }
  }

  /**
   * Starts scheduling audio for a specific layer.
   * Should be called after processAudioLayers when a new source becomes active.
   */
  startSourcePlayback(sourceId: string, sourceTime: number): void {
    const source = this.activeSources.get(sourceId);
    if (!source || source.iterator !== null) return;

    this.restartSourceIterator(source, sourceTime);
  }

  private restartSourceIterator(source: ActiveAudioSource, sourceTime: number): void {
    // Stop existing audio
    this.stopSourceAudio(source);

    // Store the source time where we're starting from (used for scheduling)
    source.startSourceTime = sourceTime;
    source.currentSourceTime = sourceTime;
    source.iteratorStartTime = this.audioContext.currentTime;

    // Start new iterator from the source time
    source.iterator = source.bufferSink.buffers(sourceTime);
    source.lastScheduledTime = sourceTime;

    // Schedule audio buffers
    this.scheduleSourceBuffers(source, this.playbackId);
  }

  private async scheduleSourceBuffers(source: ActiveAudioSource, playbackId: number): Promise<void> {
    const iterator = source.iterator;
    if (!iterator) return;

    try {
      for await (const { buffer, timestamp } of iterator) {
        if (playbackId !== this.playbackId || this.disposed || !this.playing) {
          break;
        }

        const node = this.audioContext.createBufferSource();
        node.buffer = buffer;
        node.connect(source.gainNode);

        // Calculate when to play this buffer
        // timestamp is the buffer's position in the source
        // startSourceTime is where we started playing from in the source
        // The offset from the start is: timestamp - startSourceTime
        // Schedule at: iteratorStartTime + offset
        const offsetFromStart = timestamp - source.startSourceTime;
        const scheduledContextTime = source.iteratorStartTime + offsetFromStart;

        if (scheduledContextTime >= this.audioContext.currentTime) {
          node.start(scheduledContextTime);
        } else {
          const elapsed = this.audioContext.currentTime - scheduledContextTime;
          if (elapsed < buffer.duration) {
            node.start(this.audioContext.currentTime, elapsed);
          } else {
            continue;
          }
        }

        source.queuedNodes.add(node);
        node.onended = () => {
          source.queuedNodes.delete(node);
        };

        source.lastScheduledTime = timestamp;

        // Throttle if we're too far ahead (more than 1 second of audio buffered)
        const elapsedSinceStart = this.audioContext.currentTime - source.iteratorStartTime;
        const bufferedAhead = timestamp - source.startSourceTime - elapsedSinceStart;
        if (bufferedAhead > 1) {
          await this.waitForCatchup(source, timestamp);
        }
      }
    } catch {
      // Iterator was closed or disposed
    }
  }

  private async waitForCatchup(source: ActiveAudioSource, targetSourceTime: number): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!this.playing || this.disposed) {
          clearInterval(checkInterval);
          resolve();
          return;
        }

        // Calculate how far ahead we've buffered
        const elapsedSinceStart = this.audioContext.currentTime - source.iteratorStartTime;
        const bufferedAhead = targetSourceTime - source.startSourceTime - elapsedSinceStart;
        if (bufferedAhead < 1) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  /**
   * Pauses audio playback.
   */
  pause(): void {
    if (!this.playing) return;

    this.pauseTime = this.getCurrentTime();
    this.playing = false;

    // Stop all source audio
    for (const source of this.activeSources.values()) {
      this.stopSourceAudio(source);
    }
  }

  /**
   * Stops audio playback and resets to beginning.
   */
  stop(): void {
    this.pause();
    this.pauseTime = 0;
    this.startContextTime = 0;
    this.startMediaTime = 0;
  }

  /**
   * Seeks to a specific time.
   */
  async seek(timestamp: number): Promise<void> {
    const wasPlaying = this.playing;

    this.pause();
    this.pauseTime = timestamp;
    this.startMediaTime = timestamp;

    if (wasPlaying) {
      await this.play(timestamp);
    }
  }

  private stopSourceAudio(source: ActiveAudioSource): void {
    // Stop all queued nodes
    for (const node of source.queuedNodes) {
      try {
        node.stop();
      } catch {
        // Node might have already ended
      }
    }
    source.queuedNodes.clear();

    // Stop iterator
    if (source.iterator) {
      void source.iterator.return();
      source.iterator = null;
    }
  }

  /**
   * Gets the current playback time.
   */
  getCurrentTime(): number {
    if (this.playing) {
      return this.startMediaTime + (this.audioContext.currentTime - this.startContextTime);
    }
    return this.pauseTime;
  }

  /**
   * Sets the master volume (0-1).
   */
  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.updateMasterGain();
  }

  /**
   * Sets the master mute state.
   */
  setMasterMuted(muted: boolean): void {
    this.masterMuted = muted;
    this.updateMasterGain();
  }

  private updateMasterGain(): void {
    const actualVolume = this.masterMuted ? 0 : this.masterVolume;
    this.masterGain.gain.value = actualVolume * actualVolume;
  }

  /**
   * Gets the audio context.
   */
  getAudioContext(): AudioContext {
    return this.audioContext;
  }

  /**
   * Checks if currently playing.
   */
  isPlaying(): boolean {
    return this.playing;
  }

  /**
   * Disposes the audio manager and releases resources.
   */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    this.playbackId++;
    this.stop();

    // Clean up all sources
    for (const source of this.activeSources.values()) {
      this.stopSourceAudio(source);
      source.gainNode.disconnect();
      source.panNode.disconnect();
    }
    this.activeSources.clear();

    this.masterGain.disconnect();

    if (this.audioContext.state !== 'closed') {
      void this.audioContext.close();
    }
  }
}
