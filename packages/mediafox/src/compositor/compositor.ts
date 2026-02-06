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
  FitMode,
  FrameExportOptions,
  PreviewOptions,
} from './types';
import { CompositorWorkerClient } from './worker-client';
import type { CompositorWorkerFrame, CompositorWorkerSourceInfo } from './worker-types';

interface CompositorState {
  playing: boolean;
  currentTime: number;
  duration: number;
  seeking: boolean;
}

// Pre-allocated arrays for render loop to reduce GC pressure
interface RenderBuffers {
  visibleLayers: CompositorLayer[];
  framePromises: Promise<CanvasImageSource | null>[];
  frameImages: (CanvasImageSource | null)[];
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
  private fitMode: FitMode;
  private sourcePool: SourcePool;
  private audioManager: CompositorAudioManager | null = null;
  private workerClient: CompositorWorkerClient | null = null;
  private workerSources = new Map<string, CompositorSource>();
  private workerAudioSources = new Map<string, CompositorSource>();
  private emitter: EventEmitter<CompositorEventMap>;
  private state: CompositorState;
  private animationFrameId: number | null = null;
  private lastFrameTime = 0;
  private lastRenderTime = 0;
  private previewOptions: PreviewOptions | null = null;
  private disposed = false;

  // Performance optimizations
  private renderBuffers: RenderBuffers = { visibleLayers: [], framePromises: [], frameImages: [] };
  private lastTimeUpdateEmit = 0;
  private timeUpdateThrottleMs = 100; // ~10Hz
  private renderPending = false;

  // Audio state
  private activeAudioSourceIds = new Set<string>();
  private audioScratch = {
    nextActiveSourceIds: new Set<string>(),
    newSourceIds: [] as string[],
    newSourceTimes: [] as number[],
  };
  private registeredAudioSources = new Set<string>();

  // Seek/Play synchronization
  private pendingPlayAfterSeek = false;

  /**
   * Creates a new Compositor instance.
   * @param options - Configuration options for the compositor
   */
  constructor(options: CompositorOptions) {
    this.canvas = options.canvas;
    this.width = options.width ?? (this.canvas.width || 1920);
    this.height = options.height ?? (this.canvas.height || 1080);
    this.backgroundColor = options.backgroundColor ?? '#000000';
    this.fitMode = options.fitMode ?? 'fill';
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

    const workerEnabled =
      typeof options.worker === 'boolean' ? options.worker : options.worker ? (options.worker.enabled ?? true) : false;
    const canUseWorker =
      workerEnabled &&
      typeof Worker !== 'undefined' &&
      typeof OffscreenCanvas !== 'undefined' &&
      typeof (this.canvas as HTMLCanvasElement).transferControlToOffscreen === 'function' &&
      !(this.canvas instanceof OffscreenCanvas);

    if (workerEnabled && !canUseWorker) {
      throw new Error('Worker compositor requires HTMLCanvasElement, OffscreenCanvas, and Worker support');
    }

    this.sourcePool = new SourcePool();

    if (canUseWorker) {
      try {
        this.workerClient = new CompositorWorkerClient({
          canvas: this.canvas as HTMLCanvasElement,
          width: this.width,
          height: this.height,
          backgroundColor: this.backgroundColor,
          worker: options.worker ?? true,
        });
      } catch (err) {
        console.warn('[Compositor] Worker initialization failed, falling back to main thread rendering:', err);
        this.workerClient = null;
      }
    }

    if (options.enableAudio !== false) {
      this.audioManager = new CompositorAudioManager();
    }

    if (!this.workerClient) {
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
    if (this.workerClient) {
      const info = await this.workerClient.loadSource(source, options);
      const proxy = this.createWorkerSource(info);
      if (this.audioManager && info.hasAudio) {
        await this.loadWorkerAudio(source, proxy.id);
      }
      this.emitter.emit('sourceloaded', { id: proxy.id, source: proxy });
      return proxy;
    }

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
    if (this.workerClient) {
      const info = await this.workerClient.loadImage(source);
      const proxy = this.createWorkerSource(info);
      this.emitter.emit('sourceloaded', { id: proxy.id, source: proxy });
      return proxy;
    }

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
    if (this.workerClient) {
      const info = await this.workerClient.loadAudio(source, options);
      const proxy = this.createWorkerSource(info);
      if (this.audioManager) {
        await this.loadWorkerAudio(source, proxy.id);
      }
      this.emitter.emit('sourceloaded', { id: proxy.id, source: proxy });
      return proxy;
    }

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
    if (this.workerClient) {
      const source = this.workerSources.get(id);
      if (!source) return false;
      void this.workerClient.unloadSource(id);
      this.workerSources.delete(id);
      this.unloadWorkerAudio(id);
      this.emitter.emit('sourceunloaded', { id });
      return true;
    }

    // Unregister audio before unloading
    if (this.registeredAudioSources.has(id)) {
      this.audioManager?.unregisterSource(id);
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
    if (!this.audioManager) return;
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
    if (!this.audioManager) return;
    const newSourceIds = this.audioScratch.newSourceIds;
    const newSourceTimes = this.audioScratch.newSourceTimes;
    const nextActiveSourceIds = this.audioScratch.nextActiveSourceIds;
    const previousActiveSourceIds = this.activeAudioSourceIds;

    newSourceIds.length = 0;
    newSourceTimes.length = 0;
    nextActiveSourceIds.clear();

    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      if (layer.muted) continue;

      const sourceId = layer.source.id;
      if (!this.audioManager.hasSource(sourceId)) continue;

      nextActiveSourceIds.add(sourceId);

      if (!previousActiveSourceIds.has(sourceId)) {
        newSourceIds.push(sourceId);
        newSourceTimes.push(layer.sourceTime ?? mediaTime);
      }
    }

    // Update active sources
    if (previousActiveSourceIds.size > 0) {
      previousActiveSourceIds.clear();
    }
    for (const sourceId of nextActiveSourceIds) {
      previousActiveSourceIds.add(sourceId);
    }

    // Process layers with audio manager
    this.audioManager.processAudioLayers(layers, mediaTime);

    // Start playback for new sources
    for (let i = 0; i < newSourceIds.length; i++) {
      this.audioManager.startSourcePlayback(newSourceIds[i], newSourceTimes[i]);
    }
  }

  /**
   * Gets a source by ID from the source pool.
   * @param id - The source ID
   * @returns The source if found, undefined otherwise
   */
  getSource(id: string): CompositorSource | undefined {
    if (this.workerClient) {
      return this.workerSources.get(id);
    }
    return this.sourcePool.getSource(id);
  }

  /**
   * Gets all sources currently loaded in the source pool.
   * @returns Array of all loaded sources
   */
  getAllSources(): CompositorSource[] {
    if (this.workerClient) {
      return Array.from(this.workerSources.values());
    }
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
    if (this.workerClient) {
      const workerFrame = this.serializeWorkerFrame(frame);
      return this.workerClient.render(workerFrame);
    }
    const ctx = this.ctx;
    if (!ctx) return false;

    // Reuse pre-allocated arrays
    const { visibleLayers, framePromises, frameImages } = this.renderBuffers;
    visibleLayers.length = 0;
    framePromises.length = 0;
    frameImages.length = 0;

    // Filter visible layers into pre-allocated array, track sort order
    let needsSort = false;
    let lastZIndex = -Infinity;
    const layers = frame.layers;
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      if (layer.visible === false) continue;

      const zIndex = layer.zIndex ?? 0;
      if (zIndex < lastZIndex) {
        needsSort = true;
      }
      lastZIndex = zIndex;

      visibleLayers.push(layer);
    }

    if (visibleLayers.length === 0) {
      ctx.fillStyle = this.backgroundColor;
      ctx.fillRect(0, 0, this.width, this.height);
      return true;
    }

    if (needsSort) {
      visibleLayers.sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
    }

    // Fetch all frames in parallel (promises already in flight), store results densely
    for (let i = 0; i < visibleLayers.length; i++) {
      const layer = visibleLayers[i];
      const sourceTime = layer.sourceTime ?? frame.time;
      framePromises[i] = layer.source.getFrameAt(sourceTime);
    }

    const images = await Promise.all(framePromises);
    for (let i = 0; i < images.length; i++) {
      frameImages[i] = images[i] ?? null;
    }

    // Clear and render - synchronous to prevent flicker
    ctx.fillStyle = this.backgroundColor;
    ctx.fillRect(0, 0, this.width, this.height);

    // Render in order, skip null entries (failed fetches)
    for (let i = 0; i < visibleLayers.length; i++) {
      const image = frameImages[i];
      if (image) {
        this.renderLayer(image, visibleLayers[i]);
      }
    }

    return true;
  }

  private renderLayer(image: CanvasImageSource, layer: CompositorLayer): void {
    const ctx = this.ctx;
    if (!ctx) return;

    const transform = layer.transform;
    const sourceWidth = layer.source.width ?? this.width;
    const sourceHeight = layer.source.height ?? this.height;
    const hasExplicitFitMode = layer.fitMode !== undefined && layer.fitMode !== 'auto';
    const effectiveFitMode = hasExplicitFitMode ? layer.fitMode : this.fitMode;

    let fittedWidth = sourceWidth;
    let fittedHeight = sourceHeight;
    let fittedX = 0;
    let fittedY = 0;

    if (sourceWidth === 0 || sourceHeight === 0) {
      fittedWidth = this.width;
      fittedHeight = this.height;
    } else {
      const sourceAspect = sourceWidth / sourceHeight;
      const canvasAspect = this.width / this.height;

      switch (effectiveFitMode) {
        case 'fill':
          // Stretch to fill canvas - ignore aspect ratio
          fittedWidth = this.width;
          fittedHeight = this.height;
          break;

        case 'cover':
          // Scale to cover entire canvas - may crop
          if (sourceAspect > canvasAspect) {
            fittedHeight = this.height;
            fittedWidth = this.height * sourceAspect;
            fittedX = (this.width - fittedWidth) / 2;
          } else {
            fittedWidth = this.width;
            fittedHeight = this.width / sourceAspect;
            fittedY = (this.height - fittedHeight) / 2;
          }
          break;

        default:
          // Scale to fit entirely within canvas - may letterbox
          if (sourceAspect > canvasAspect) {
            fittedWidth = this.width;
            fittedHeight = this.width / sourceAspect;
            fittedY = (this.height - fittedHeight) / 2;
          } else {
            fittedHeight = this.height;
            fittedWidth = this.height * sourceAspect;
            fittedX = (this.width - fittedWidth) / 2;
          }
          break;
      }
    }

    if (!transform) {
      ctx.drawImage(image, fittedX, fittedY, fittedWidth, fittedHeight);
      return;
    }

    const x = (transform.x ?? 0) + fittedX;
    const y = (transform.y ?? 0) + fittedY;
    const destWidth = transform.width ?? fittedWidth;
    const destHeight = transform.height ?? fittedHeight;
    const rotation = transform.rotation ?? 0;
    const scaleX = transform.scaleX ?? 1;
    const scaleY = transform.scaleY ?? 1;
    const opacity = transform.opacity ?? 1;

    // Check if we need context state changes
    const needsOpacity = opacity !== 1;
    const needsTransform = rotation !== 0 || scaleX !== 1 || scaleY !== 1;

    // Fast path: simple position/size only, no rotation/scale/opacity
    if (!needsOpacity && !needsTransform) {
      ctx.drawImage(image, x, y, destWidth, destHeight);
      return;
    }

    const anchorX = transform.anchorX ?? 0.5;
    const anchorY = transform.anchorY ?? 0.5;

    // Save context state only when needed
    ctx.save();

    if (needsOpacity) {
      ctx.globalAlpha = opacity;
    }

    // Move to layer position
    ctx.translate(x + destWidth * anchorX, y + destHeight * anchorY);

    if (rotation !== 0) {
      ctx.rotate((rotation * Math.PI) / 180);
    }

    if (scaleX !== 1 || scaleY !== 1) {
      ctx.scale(scaleX, scaleY);
    }

    // Draw image centered on anchor point
    ctx.drawImage(image, -destWidth * anchorX, -destHeight * anchorY, destWidth, destHeight);

    ctx.restore();
  }

  private createWorkerSource(info: CompositorWorkerSourceInfo): CompositorSource {
    const proxy: CompositorSource = {
      id: info.id,
      type: info.type,
      duration: info.duration,
      width: info.width,
      height: info.height,
      async getFrameAt(): Promise<CanvasImageSource | null> {
        throw new Error('getFrameAt is not available when worker rendering is enabled');
      },
      getAudioBufferSink(): import('mediabunny').AudioBufferSink | null {
        return null;
      },
      hasAudio(): boolean {
        return info.hasAudio ?? false;
      },
      dispose(): void {
        // Managed by the compositor worker
      },
    };

    this.workerSources.set(proxy.id, proxy);
    return proxy;
  }

  private async loadWorkerAudio(source: MediaSource, id: string): Promise<void> {
    if (!this.audioManager) return;

    if (this.workerAudioSources.has(id)) {
      this.unloadWorkerAudio(id);
    }

    try {
      const audioSource = await this.sourcePool.loadAudio(source, { id });
      this.workerAudioSources.set(id, audioSource);
      this.registerSourceAudio(audioSource);
    } catch {
      // Ignore audio load failures in worker mode
    }
  }

  private unloadWorkerAudio(id: string): void {
    if (!this.audioManager) return;

    if (this.workerAudioSources.has(id)) {
      this.audioManager.unregisterSource(id);
      this.registeredAudioSources.delete(id);
      this.sourcePool.unloadSource(id);
      this.workerAudioSources.delete(id);
    }
  }

  private serializeWorkerFrame(frame: CompositionFrame): CompositorWorkerFrame {
    if (!this.workerClient) {
      throw new Error('Worker compositor not initialized');
    }

    const layers = frame.layers;
    const serializedLayers = new Array(layers.length);
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      const sourceId = layer.source.id;
      if (!this.workerSources.has(sourceId)) {
        throw new Error(`Layer source ${sourceId} is not managed by this compositor`);
      }
      serializedLayers[i] = {
        sourceId,
        sourceTime: layer.sourceTime,
        transform: layer.transform,
        fitMode: layer.fitMode,
        visible: layer.visible,
        zIndex: layer.zIndex,
      };
    }

    return {
      time: frame.time,
      layers: serializedLayers,
    };
  }

  /**
   * Clears the canvas with the background color.
   */
  clear(): void {
    if (this.workerClient) {
      void this.workerClient.clear();
      return;
    }
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
    this.lastRenderTime = 0;
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

    // If currently seeking, queue play to execute after seek completes
    if (this.state.seeking) {
      this.pendingPlayAfterSeek = true;
      return;
    }

    this.state.playing = true;
    this.lastFrameTime = performance.now();
    this.lastRenderTime = this.lastFrameTime;
    this.emitter.emit('play', undefined);

    // Start audio playback
    if (this.audioManager) {
      // Reset active audio tracking so sources restart after pause/seek.
      this.activeAudioSourceIds.clear();
      await this.audioManager.play(this.state.currentTime);

      // Process audio layers immediately to start sources right away
      // instead of waiting for render loop which might skip first frame
      const frame = this.previewOptions.getComposition(this.state.currentTime);
      this.processAudioLayers(frame.audio ?? [], this.state.currentTime);
    }

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
    this.pendingPlayAfterSeek = false;
    this.stopRenderLoop();
    if (this.audioManager) {
      this.audioManager.pause();
    }
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
    if (this.audioManager) {
      await this.audioManager.seek(clampedTime);
      // Clear tracking so sources are treated as new and restarted
      this.activeAudioSourceIds.clear();
    }

    // Render frame at new time and process audio layers during seek
    const frame = this.previewOptions.getComposition(clampedTime);
    if (this.audioManager) {
      this.processAudioLayers(frame.audio ?? [], clampedTime);
    }
    await this.render(frame);

    this.state.seeking = false;
    this.emitter.emit('seeked', { time: clampedTime });
    this.emitter.emit('timeupdate', { currentTime: clampedTime });

    // Execute pending play if one was queued during seek
    if (this.pendingPlayAfterSeek) {
      this.pendingPlayAfterSeek = false;
      await this.play();
    }
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

      const fps = this.previewOptions.fps ?? 0;
      const frameIntervalMs = fps > 0 ? 1000 / fps : 0;
      const shouldRender =
        !this.renderPending && (frameIntervalMs === 0 || now - this.lastRenderTime >= frameIntervalMs);

      if (shouldRender) {
        // Get composition and render (non-blocking)
        this.renderPending = true;
        this.lastRenderTime = now;

        const frame = this.previewOptions.getComposition(this.state.currentTime);

        // Process audio layers
        if (this.audioManager) {
          this.processAudioLayers(frame.audio ?? [], this.state.currentTime);
        }

        this.render(frame)
          .catch(() => {
            // Ignore render errors, will retry next frame
          })
          .finally(() => {
            this.renderPending = false;
          });
      }

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

    if (this.workerClient) {
      const workerFrame = this.serializeWorkerFrame(frame);
      return this.workerClient.exportFrame(workerFrame, options);
    }

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
   * When worker mode is active, delegates resizing to the worker thread
   * since the OffscreenCanvas cannot be resized from the main thread.
   * @param width - New width in pixels
   * @param height - New height in pixels
   * @param fitMode - Optional fit mode for scaling sources to the canvas
   */
  resize(width: number, height: number, fitMode?: FitMode): void {
    this.checkDisposed();
    this.width = width;
    this.height = height;
    if (fitMode !== undefined) {
      this.fitMode = fitMode;
    }

    // When worker mode is active, the canvas control has been transferred
    // to OffscreenCanvas via transferControlToOffscreen(). Attempting to
    // modify the HTMLCanvasElement's width/height would throw InvalidStateError.
    // Delegate resizing entirely to the worker in this case.
    if (this.workerClient) {
      void this.workerClient.resize(width, height, this.fitMode);
      return;
    }

    // Main thread rendering: update DOM canvas dimensions directly
    this.canvas.width = width;
    this.canvas.height = height;
    this.clear();
  }

  /**
   * Sets the fit mode for scaling sources to the canvas.
   * @param fitMode - The fit mode to use
   */
  setFitMode(fitMode: FitMode): void {
    this.checkDisposed();
    this.fitMode = fitMode;
    if (this.workerClient) {
      void this.workerClient.resize(this.width, this.height, fitMode);
    }
  }

  /**
   * Gets the current fit mode.
   * @returns The current fit mode
   */
  getFitMode(): FitMode {
    return this.fitMode;
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
    this.audioManager?.setMasterVolume(volume);
  }

  /**
   * Sets the master mute state for all audio layers.
   * @param muted - Whether audio is muted
   */
  setMuted(muted: boolean): void {
    this.audioManager?.setMasterMuted(muted);
  }

  /**
   * Gets the audio context used by the compositor.
   * Useful for advanced audio processing.
   */
  getAudioContext(): AudioContext {
    if (!this.audioManager) {
      throw new Error('Audio is disabled for this compositor');
    }
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
    this.audioManager?.dispose();
    this.workerClient?.dispose();
    this.workerClient = null;
    this.sourcePool.dispose();
    this.registeredAudioSources.clear();
    this.activeAudioSourceIds.clear();
    this.audioScratch.nextActiveSourceIds.clear();
    this.audioScratch.newSourceIds.length = 0;
    this.audioScratch.newSourceTimes.length = 0;
    this.workerSources.clear();
    this.workerAudioSources.clear();
    this.emitter.removeAllListeners();
    this.ctx = null;
    this.previewOptions = null;
  }
}
