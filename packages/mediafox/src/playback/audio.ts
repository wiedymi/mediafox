import {
  AudioBufferSink,
  type AudioSample,
  AudioSampleSink,
  type InputAudioTrack,
  type WrappedAudioBuffer,
} from 'mediabunny';

export interface AudioManagerOptions {
  audioContext?: AudioContext;
  volume?: number;
  muted?: boolean;
}

export class AudioManager {
  private audioContext: AudioContext;
  private gainNode: GainNode | null = null;
  private bufferSink: AudioBufferSink | null = null;
  private sampleSink: AudioSampleSink | null = null;
  private bufferIterator: AsyncGenerator<WrappedAudioBuffer, void, unknown> | null = null;
  private queuedNodes: Set<AudioBufferSourceNode> = new Set();
  private startContextTime = 0;
  private startMediaTime = 0;
  private pauseTime = 0;
  private playing = false;
  private volume = 1;
  private muted = false;
  private disposed = false;
  private playbackId = 0;
  private playbackRate = 1;

  constructor(options: AudioManagerOptions = {}) {
    // Create or use provided AudioContext
    if (options.audioContext) {
      this.audioContext = options.audioContext;
    } else {
      const windowGlobal = window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      };
      const AudioContextClass = windowGlobal.AudioContext || windowGlobal.webkitAudioContext;
      this.audioContext = new AudioContextClass();
    }

    // Set initial volume and mute state
    this.volume = options.volume ?? 1;
    this.muted = options.muted ?? false;

    this.setupAudioGraph();
  }

  private setupAudioGraph(): void {
    this.gainNode = this.audioContext.createGain();
    this.gainNode.connect(this.audioContext.destination);
    this.updateGain();
  }

  async setAudioTrack(track: InputAudioTrack): Promise<void> {
    this.dispose();

    // Check if we can decode before throwing
    if (track.codec === null) {
      throw new Error(`Unsupported audio codec`);
    }

    const canDecode = await track.canDecode();
    if (!canDecode) {
      throw new Error(`Cannot decode audio track with codec: ${track.codec}`);
    }

    // Create sinks with matching sample rate
    // Track is set and used through iterators and sinks
    this.bufferSink = new AudioBufferSink(track);
    this.sampleSink = new AudioSampleSink(track);

    // Ready for playback again after successful initialization
    this.disposed = false;
  }

  async play(fromTime: number = this.pauseTime): Promise<void> {
    if (this.playing || !this.bufferSink) return;

    // Resume audio context if suspended
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.playbackId++;
    const currentPlaybackId = this.playbackId;

    this.playing = true;
    this.startContextTime = this.audioContext.currentTime;
    this.startMediaTime = fromTime;
    this.pauseTime = fromTime;

    // Start iterator from current position
    this.bufferIterator = this.bufferSink.buffers(fromTime);

    // Start playing audio buffers
    this.scheduleAudioBuffers(currentPlaybackId);
  }

  private async scheduleAudioBuffers(playbackId: number): Promise<void> {
    const iterator = this.bufferIterator;
    if (!iterator || !this.gainNode) return;

    try {
      for await (const { buffer, timestamp } of iterator) {
        if (playbackId !== this.playbackId || this.disposed || !this.playing) {
          break;
        }

        const node = this.audioContext.createBufferSource();
        node.buffer = buffer;
        node.connect(this.gainNode);
        node.playbackRate.value = this.playbackRate;
        node.playbackRate.setValueAtTime(this.playbackRate, this.audioContext.currentTime);

        const scheduledContextTime = this.startContextTime + (timestamp - this.startMediaTime) / this.playbackRate;

        if (scheduledContextTime >= this.audioContext.currentTime) {
          node.start(scheduledContextTime);
        } else {
          const elapsedMedia = Math.max(0, (this.audioContext.currentTime - scheduledContextTime) * this.playbackRate);
          if (elapsedMedia < buffer.duration) {
            node.start(this.audioContext.currentTime, elapsedMedia);
          } else {
            continue;
          }
        }

        this.queuedNodes.add(node);
        node.onended = () => {
          this.queuedNodes.delete(node);
        };

        // Throttle if we're too far ahead
        if (timestamp - this.getCurrentTime() >= 1) {
          await this.waitForCatchup(timestamp);
        }
      }
    } catch {
      // Iterator was closed or disposed during scheduling
    }
  }

  private async waitForCatchup(targetTime: number): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (targetTime - this.getCurrentTime() < 1 || !this.playing) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  pause(): void {
    if (!this.playing) return;

    const currentTime = this.getCurrentTime();
    this.playing = false;
    this.pauseTime = currentTime;

    // Stop all queued audio nodes
    this.stopQueuedNodes();

    // Stop iterator
    if (this.bufferIterator) {
      // fire-and-forget cleanup; do not await in dispose path
      void this.bufferIterator.return();
      this.bufferIterator = null;
    }
  }

  stop(): void {
    this.pause();
    this.pauseTime = 0;
    this.startContextTime = 0;
    this.startMediaTime = 0;
  }

  async seek(timestamp: number): Promise<void> {
    const wasPlaying = this.playing;

    if (wasPlaying) {
      this.pause();
    }

    this.pauseTime = timestamp;

    if (wasPlaying) {
      await this.play(timestamp);
    }
  }

  getCurrentTime(): number {
    if (this.playing) {
      const elapsedContext = this.audioContext.currentTime - this.startContextTime;
      return this.startMediaTime + elapsedContext * this.playbackRate;
    }
    return this.pauseTime;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    this.updateGain();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.updateGain();
  }

  private updateGain(): void {
    if (!this.gainNode) return;

    const actualVolume = this.muted ? 0 : this.volume;
    // Use quadratic curve for more natural volume control
    this.gainNode.gain.value = actualVolume * actualVolume;
  }

  getVolume(): number {
    return this.volume;
  }

  isMuted(): boolean {
    return this.muted;
  }

  isPlaying(): boolean {
    return this.playing;
  }

  setPlaybackRate(rate: number): void {
    const clampedRate = Math.max(0.25, Math.min(4, rate));
    if (this.playbackRate === clampedRate) {
      return;
    }

    const wasPlaying = this.playing;
    const currentTime = this.getCurrentTime();

    this.playbackRate = clampedRate;

    if (wasPlaying) {
      this.pause();
      this.pauseTime = currentTime;
      void this.play(currentTime);
    }
  }

  getAudioContext(): AudioContext {
    return this.audioContext;
  }

  async getBufferAt(timestamp: number): Promise<WrappedAudioBuffer | null> {
    if (!this.bufferSink) return null;
    return this.bufferSink.getBuffer(timestamp);
  }

  async getSampleAt(timestamp: number): Promise<AudioSample | null> {
    if (!this.sampleSink) return null;
    return this.sampleSink.getSample(timestamp);
  }

  private stopQueuedNodes(): void {
    for (const node of this.queuedNodes) {
      try {
        node.stop();
      } catch {
        // Node might have already ended
      }
    }
    this.queuedNodes.clear();
  }

  /**
   * Clears iterators to stop any in-flight async operations.
   * Called before disposing the input to prevent accessing disposed resources.
   */
  async clearIterators(): Promise<void> {
    this.playbackId++;
    this.stop();

    if (this.bufferIterator) {
      try {
        await this.bufferIterator.return();
      } catch {
        // Iterator may already be closed
      }
      this.bufferIterator = null;
    }
  }

  dispose(): void {
    this.disposed = true;
    this.playbackId++;
    this.stop();

    if (this.bufferIterator) {
      void this.bufferIterator.return();
      this.bufferIterator = null;
    }

    this.bufferSink = null;
    this.sampleSink = null;
    // Track reference cleared through dispose of iterators
  }

  destroy(): void {
    this.dispose();

    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }

    if (this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}
