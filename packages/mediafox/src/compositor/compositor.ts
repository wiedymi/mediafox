import { EventEmitter } from '../events/emitter';
import type { MediaSource } from '../types';
import { CompositorAudioManager } from './audio-manager';
import { SourcePool } from './source-pool';
import type {
  AudioLayer,
  CompositionFrame,
  CompositorEventListener,
  CompositorEventMap,
  CompositorLayer,
  CompositorOptions,
  CompositorSource,
  CompositorSourceOptions,
  FrameExportOptions,
  PreviewOptions,
} from './types';

interface CompositorState {
  playing: boolean;
  currentTime: number;
  duration: number;
  seeking: boolean;
}

// Pre-allocated arrays for render loop to reduce GC pressure
interface RenderBuffers {
  frameData: { layer: CompositorLayer; image: CanvasImageSource }[];
  visibleLayers: CompositorLayer[];
}

/**
 * Canvas-based video compositor for composing multiple media sources into a single output.
 * Supports layered rendering with transforms, opacity, and rotation.
 *
 * @example
 * ```ts
 * const compositor = new Compositor({
 *   canvas: document.querySelector('canvas'),
 *   width: 1920,
 *   height: 1080
 * });
 *
 * const source = await compositor.loadSource('video.mp4');
 * compositor.preview({
 *   duration: 10,
 *   getComposition: (time) => ({
 *     time,
 *     layers: [{ source, transform: { opacity: 1 } }]
 *   })
 * });
 * compositor.play();
 * ```
 */
export class Compositor {
  private canvas: HTMLCanvasElement | OffscreenCanvas;
  private ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null = null;
  private width: number;
  private height: number;
  private backgroundColor: string;
  private sourcePool: SourcePool;
  private audioManager: CompositorAudioManager;
  private emitter: EventEmitter<CompositorEventMap>;
  private state: CompositorState;
  private animationFrameId: number | null = null;
  private lastFrameTime = 0;
  private previewOptions: PreviewOptions | null = null;
  private disposed = false;

  // Performance optimizations
  private renderBuffers: RenderBuffers = { frameData: [], visibleLayers: [] };
  private lastTimeUpdateEmit = 0;
  private timeUpdateThrottleMs = 100; // ~10Hz
  private renderPending = false;

  // Audio state
  private activeAudioLayers: AudioLayer[] = [];
  private registeredAudioSources = new Set<string>();

  /**
   * Creates a new Compositor instance.
   * @param options - Configuration options for the compositor
   */
  constructor(options: CompositorOptions) {
    this.canvas = options.canvas;
    this.width = options.width ?? (this.canvas.width || 1920);
    this.height = options.height ?? (this.canvas.height || 1080);
    this.backgroundColor = options.backgroundColor ?? '#000000';
    this.sourcePool = new SourcePool();
    this.audioManager = new CompositorAudioManager();
    this.emitter = new EventEmitter({ maxListeners: 50 });
    this.state = {
      playing: false,
      currentTime: 0,
      duration: 0,
      seeking: false,
    };

    // Set canvas dimensions
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    // Get 2D context
    this.ctx = this.canvas.getContext('2d', {
      alpha: false,
      desynchronized: true,
    }) as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;

    if (!this.ctx) {
      throw new Error('Failed to get 2D context for compositor canvas');
    }

    // Initial clear
    this.clear();
  }

  // Source Management

  /**
   * Loads a video source into the compositor's source pool.
   * @param source - Video source (URL, File, Blob, or MediaStream)
   * @param options - Optional loading configuration
   * @returns The loaded compositor source
   */
  async loadSource(source: MediaSource, options?: CompositorSourceOptions): Promise<CompositorSource> {
    this.checkDisposed();
    const loaded = await this.sourcePool.loadVideo(source, options);

    // Register audio with audio manager if available
    this.registerSourceAudio(loaded);

    this.emitter.emit('sourceloaded', { id: loaded.id, source: loaded });
    return loaded;
  }

  /**
   * Loads an image source into the compositor's source pool.
   * @param source - Image source (URL, File, or Blob)
   * @returns The loaded compositor source
   */
  async loadImage(source: string | Blob | File): Promise<CompositorSource> {
    this.checkDisposed();
    const loaded = await this.sourcePool.loadImage(source);
    this.emitter.emit('sourceloaded', { id: loaded.id, source: loaded });
    return loaded;
  }

  /**
   * Loads an audio source into the compositor's source pool.
   * @param source - Audio source (URL, File, Blob, or MediaStream)
   * @param options - Optional loading configuration
   * @returns The loaded compositor source
   */
  async loadAudio(source: MediaSource, options?: CompositorSourceOptions): Promise<CompositorSource> {
    this.checkDisposed();
    const loaded = await this.sourcePool.loadAudio(source, options);

    // Register audio with audio manager
    this.registerSourceAudio(loaded);

    this.emitter.emit('sourceloaded', { id: loaded.id, source: loaded });
    return loaded;
  }

  /**
   * Unloads a source from the compositor's source pool.
   * @param id - The source ID to unload
   * @returns True if the source was found and unloaded
   */
  unloadSource(id: string): boolean {
    // Unregister audio before unloading
    if (this.registeredAudioSources.has(id)) {
      this.audioManager.unregisterSource(id);
      this.registeredAudioSources.delete(id);
    }

    const result = this.sourcePool.unloadSource(id);
    if (result) {
      this.emitter.emit('sourceunloaded', { id });
    }
    return result;
  }

  /**
   * Registers a source's audio with the audio manager.
   */
  private registerSourceAudio(source: CompositorSource): void {
    if (this.registeredAudioSources.has(source.id)) return;

    const audioBufferSink = source.getAudioBufferSink?.();
    if (audioBufferSink) {
      this.audioManager.registerSource(source, audioBufferSink);
      this.registeredAudioSources.add(source.id);
    }
  }

  /**
   * Processes audio layers for the current frame.
   */
  private processAudioLayers(layers: AudioLayer[], mediaTime: number): void {
    // Track new sources that need playback started
    const newSources: string[] = [];

    for (const layer of layers) {
      if (layer.muted) continue;

      const sourceId = layer.source.id;
      if (!this.audioManager.hasSource(sourceId)) continue;

      // Check if this is a newly active audio source
      const wasActive = this.activeAudioLayers.some((l) => l.source.id === sourceId);
      if (!wasActive) {
        newSources.push(sourceId);
      }
    }

    // Update active layers
    this.activeAudioLayers = layers;

    // Process layers with audio manager
    this.audioManager.processAudioLayers(layers, mediaTime);

    // Start playback for new sources
    for (const sourceId of newSources) {
      const layer = layers.find((l) => l.source.id === sourceId);
      if (layer) {
        const sourceTime = layer.sourceTime ?? mediaTime;
        this.audioManager.startSourcePlayback(sourceId, sourceTime);
      }
    }
  }

  /**
   * Gets a source by ID from the source pool.
   * @param id - The source ID
   * @returns The source if found, undefined otherwise
   */
  getSource(id: string): CompositorSource | undefined {
    return this.sourcePool.getSource(id);
  }

  /**
   * Gets all sources currently loaded in the source pool.
   * @returns Array of all loaded sources
   */
  getAllSources(): CompositorSource[] {
    return this.sourcePool.getAllSources();
  }

  // Rendering

  /**
   * Renders a composition frame to the canvas.
   * Fetches all layer frames in parallel before drawing to prevent flicker.
   * @param frame - The composition frame to render
   * @returns True if rendering succeeded
   */
  async render(frame: CompositionFrame): Promise<boolean> {
    this.checkDisposed();
    if (!this.ctx) return false;

    // Reuse pre-allocated arrays
    const { frameData, visibleLayers } = this.renderBuffers;
    frameData.length = 0;
    visibleLayers.length = 0;

    // Filter visible layers into pre-allocated array
    for (let i = 0; i < frame.layers.length; i++) {
      const layer = frame.layers[i];
      if (layer.visible !== false) {
        visibleLayers.push(layer);
      }
    }

    // Sort visible layers by zIndex (in-place)
    visibleLayers.sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

    // Fetch all frames in parallel, maintaining sort order via indexed insertion
    const fetchPromises: Promise<void>[] = [];
    for (let i = 0; i < visibleLayers.length; i++) {
      const layer = visibleLayers[i];
      const index = i; // Capture index for closure
      fetchPromises.push(
        (async () => {
          const sourceTime = layer.sourceTime ?? frame.time;
          const frameImage = await layer.source.getFrameAt(sourceTime);
          if (frameImage) {
            frameData[index] = { layer, image: frameImage };
          }
        })()
      );
    }

    await Promise.all(fetchPromises);

    // Clear and render - synchronous to prevent flicker
    this.ctx.fillStyle = this.backgroundColor;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Render in order, skip undefined entries (failed fetches)
    for (let i = 0; i < frameData.length; i++) {
      const entry = frameData[i];
      if (entry) {
        this.renderLayer(entry.image, entry.layer);
      }
    }

    return true;
  }

  private renderLayer(image: CanvasImageSource, layer: CompositorLayer): void {
    if (!this.ctx) return;

    const transform = layer.transform;
    const sourceWidth = layer.source.width ?? this.width;
    const sourceHeight = layer.source.height ?? this.height;

    // Fast path: no transform object means draw at origin with source dimensions
    if (!transform) {
      this.ctx.drawImage(image, 0, 0, sourceWidth, sourceHeight);
      return;
    }

    const destWidth = transform.width ?? sourceWidth;
    const destHeight = transform.height ?? sourceHeight;
    const x = transform.x ?? 0;
    const y = transform.y ?? 0;
    const rotation = transform.rotation ?? 0;
    const scaleX = transform.scaleX ?? 1;
    const scaleY = transform.scaleY ?? 1;
    const opacity = transform.opacity ?? 1;

    // Check if we need context state changes
    const needsOpacity = opacity !== 1;
    const needsTransform = rotation !== 0 || scaleX !== 1 || scaleY !== 1;

    // Fast path: simple position/size only, no rotation/scale/opacity
    if (!needsOpacity && !needsTransform) {
      this.ctx.drawImage(image, x, y, destWidth, destHeight);
      return;
    }

    const anchorX = transform.anchorX ?? 0.5;
    const anchorY = transform.anchorY ?? 0.5;

    // Save context state only when needed
    this.ctx.save();

    if (needsOpacity) {
      this.ctx.globalAlpha = opacity;
    }

    // Move to layer position
    this.ctx.translate(x + destWidth * anchorX, y + destHeight * anchorY);

    if (rotation !== 0) {
      this.ctx.rotate((rotation * Math.PI) / 180);
    }

    if (scaleX !== 1 || scaleY !== 1) {
      this.ctx.scale(scaleX, scaleY);
    }

    // Draw image centered on anchor point
    this.ctx.drawImage(image, -destWidth * anchorX, -destHeight * anchorY, destWidth, destHeight);

    this.ctx.restore();
  }

  /**
   * Clears the canvas with the background color.
   */
  clear(): void {
    if (!this.ctx) return;
    this.ctx.fillStyle = this.backgroundColor;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  // Preview Playback

  /**
   * Configures the preview playback with a composition callback.
   * Must be called before play() or seek().
   * @param options - Preview configuration including duration and composition callback
   */
  preview(options: PreviewOptions): void {
    this.checkDisposed();
    this.previewOptions = options;
    this.state.duration = options.duration;
    this.emitter.emit('compositionchange', undefined);
  }

  /**
   * Starts playback of the preview composition.
   * @throws Error if preview() has not been called first
   */
  async play(): Promise<void> {
    this.checkDisposed();
    if (this.state.playing) return;
    if (!this.previewOptions) {
      throw new Error('No preview configured. Call preview() first.');
    }

    this.state.playing = true;
    this.lastFrameTime = performance.now();
    this.emitter.emit('play', undefined);

    // Start audio playback
    await this.audioManager.play(this.state.currentTime);

    // Start render loop
    this.startRenderLoop();
  }

  /**
   * Pauses playback of the preview composition.
   */
  pause(): void {
    this.checkDisposed();
    if (!this.state.playing) return;

    this.state.playing = false;
    this.stopRenderLoop();
    this.audioManager.pause();
    this.emitter.emit('pause', undefined);
  }

  /**
   * Seeks to a specific time in the preview composition.
   * @param time - Time in seconds to seek to
   */
  async seek(time: number): Promise<void> {
    this.checkDisposed();
    if (!this.previewOptions) return;

    const clampedTime = Math.max(0, Math.min(time, this.state.duration));
    this.state.seeking = true;
    this.emitter.emit('seeking', { time: clampedTime });

    this.state.currentTime = clampedTime;

    // Seek audio
    await this.audioManager.seek(clampedTime);

    // Render frame at new time
    const frame = this.previewOptions.getComposition(clampedTime);
    await this.render(frame);

    this.state.seeking = false;
    this.emitter.emit('seeked', { time: clampedTime });
    this.emitter.emit('timeupdate', { currentTime: clampedTime });
  }

  private startRenderLoop(): void {
    if (this.animationFrameId !== null) return;

    const tick = () => {
      if (!this.state.playing || !this.previewOptions) return;

      // Schedule next frame IMMEDIATELY to maintain consistent timing
      this.animationFrameId = requestAnimationFrame(tick);

      const now = performance.now();
      const deltaTime = (now - this.lastFrameTime) / 1000;
      this.lastFrameTime = now;

      // Update current time
      this.state.currentTime += deltaTime;

      // Check for end
      if (this.state.currentTime >= this.state.duration) {
        if (this.previewOptions.loop) {
          this.state.currentTime = 0;
        } else {
          this.state.currentTime = this.state.duration;
          this.pause();
          this.emitter.emit('ended', undefined);
          return;
        }
      }

      // Skip rendering if previous frame is still being processed
      if (this.renderPending) {
        return;
      }

      // Get composition and render (non-blocking)
      this.renderPending = true;

      const frame = this.previewOptions.getComposition(this.state.currentTime);

      // Process audio layers
      this.processAudioLayers(frame.audio ?? [], this.state.currentTime);

      this.render(frame)
        .catch(() => {
          // Ignore render errors, will retry next frame
        })
        .finally(() => {
          this.renderPending = false;
        });

      // Throttle timeupdate events to ~10Hz
      if (now - this.lastTimeUpdateEmit >= this.timeUpdateThrottleMs) {
        this.lastTimeUpdateEmit = now;
        this.emitter.emit('timeupdate', { currentTime: this.state.currentTime });
      }
    };

    this.animationFrameId = requestAnimationFrame(tick);
  }

  private stopRenderLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  // Frame Export

  /**
   * Exports a single frame at the specified time as an image blob.
   * @param time - Time in seconds to export
   * @param options - Export options (format, quality)
   * @returns Image blob or null if export failed
   */
  async exportFrame(time: number, options: FrameExportOptions = {}): Promise<Blob | null> {
    this.checkDisposed();
    if (!this.previewOptions) return null;

    // Render frame at specified time
    const frame = this.previewOptions.getComposition(time);
    await this.render(frame);

    // Export canvas to blob
    if ('toBlob' in this.canvas) {
      return new Promise((resolve) => {
        (this.canvas as HTMLCanvasElement).toBlob(
          (blob) => resolve(blob),
          `image/${options.format ?? 'png'}`,
          options.quality
        );
      });
    } else {
      return (this.canvas as OffscreenCanvas).convertToBlob({
        type: `image/${options.format ?? 'png'}`,
        quality: options.quality,
      });
    }
  }

  // State Getters

  /** Current playback time in seconds. */
  get currentTime(): number {
    return this.state.currentTime;
  }

  /** Total duration of the preview composition in seconds. */
  get duration(): number {
    return this.state.duration;
  }

  /** Whether the compositor is currently playing. */
  get playing(): boolean {
    return this.state.playing;
  }

  /** Whether the compositor is currently paused. */
  get paused(): boolean {
    return !this.state.playing;
  }

  /** Whether the compositor is currently seeking. */
  get seeking(): boolean {
    return this.state.seeking;
  }

  /**
   * Gets the current canvas width.
   * @returns Width in pixels
   */
  getWidth(): number {
    return this.width;
  }

  /**
   * Gets the current canvas height.
   * @returns Height in pixels
   */
  getHeight(): number {
    return this.height;
  }

  /**
   * Resizes the compositor canvas without disposing loaded sources.
   * @param width - New width in pixels
   * @param height - New height in pixels
   */
  resize(width: number, height: number): void {
    this.checkDisposed();
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.clear();
  }

  // Events

  /**
   * Subscribes to a compositor event.
   * @param event - Event name to listen for
   * @param listener - Callback function
   * @returns Unsubscribe function
   */
  on<K extends keyof CompositorEventMap>(event: K, listener: CompositorEventListener<K>): () => void {
    return this.emitter.on(event, listener);
  }

  /**
   * Subscribes to a compositor event for a single invocation.
   * @param event - Event name to listen for
   * @param listener - Callback function
   * @returns Unsubscribe function
   */
  once<K extends keyof CompositorEventMap>(event: K, listener: CompositorEventListener<K>): () => void {
    return this.emitter.once(event, listener);
  }

  /**
   * Unsubscribes from a compositor event.
   * @param event - Event name to unsubscribe from
   * @param listener - Optional specific listener to remove
   */
  off<K extends keyof CompositorEventMap>(event: K, listener?: CompositorEventListener<K>): void {
    this.emitter.off(event, listener);
  }

  // Audio Control

  /**
   * Sets the master volume for all audio layers.
   * @param volume - Volume level (0 to 1)
   */
  setVolume(volume: number): void {
    this.audioManager.setMasterVolume(volume);
  }

  /**
   * Sets the master mute state for all audio layers.
   * @param muted - Whether audio is muted
   */
  setMuted(muted: boolean): void {
    this.audioManager.setMasterMuted(muted);
  }

  /**
   * Gets the audio context used by the compositor.
   * Useful for advanced audio processing.
   */
  getAudioContext(): AudioContext {
    return this.audioManager.getAudioContext();
  }

  // Lifecycle

  private checkDisposed(): void {
    if (this.disposed) {
      throw new Error('Compositor has been disposed');
    }
  }

  /**
   * Disposes the compositor and releases all resources.
   * After disposal, the compositor cannot be used.
   */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    this.stopRenderLoop();
    this.audioManager.dispose();
    this.sourcePool.dispose();
    this.registeredAudioSources.clear();
    this.activeAudioLayers = [];
    this.emitter.removeAllListeners();
    this.ctx = null;
    this.previewOptions = null;
  }
}
