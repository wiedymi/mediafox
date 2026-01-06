import { EventEmitter } from '../events/emitter';
import type { MediaSource } from '../types';
import { SourcePool } from './source-pool';
import type {
  CompositorEventListener,
  CompositorEventMap,
  CompositorLayer,
  CompositorOptions,
  CompositorSource,
  CompositorSourceOptions,
  CompositionFrame,
  FrameExportOptions,
  PreviewOptions,
} from './types';

interface CompositorState {
  playing: boolean;
  currentTime: number;
  duration: number;
  seeking: boolean;
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
  private emitter: EventEmitter<CompositorEventMap>;
  private state: CompositorState;
  private animationFrameId: number | null = null;
  private lastFrameTime = 0;
  private previewOptions: PreviewOptions | null = null;
  private disposed = false;

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
    this.emitter.emit('sourceloaded', { id: loaded.id, source: loaded });
    return loaded;
  }

  /**
   * Unloads a source from the compositor's source pool.
   * @param id - The source ID to unload
   * @returns True if the source was found and unloaded
   */
  unloadSource(id: string): boolean {
    const result = this.sourcePool.unloadSource(id);
    if (result) {
      this.emitter.emit('sourceunloaded', { id });
    }
    return result;
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

    // Sort layers by zIndex
    const sortedLayers = [...frame.layers].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

    // Fetch all frames FIRST (in parallel) before clearing canvas
    const frameData: { layer: CompositorLayer; image: CanvasImageSource }[] = [];
    const fetchPromises = sortedLayers
      .filter(layer => layer.visible !== false)
      .map(async (layer) => {
        const sourceTime = layer.sourceTime ?? frame.time;
        const frameImage = await layer.source.getFrameAt(sourceTime);
        if (frameImage) {
          frameData.push({ layer, image: frameImage });
        }
      });

    await Promise.all(fetchPromises);

    // Sort frameData by original layer order (zIndex)
    frameData.sort((a, b) => (a.layer.zIndex ?? 0) - (b.layer.zIndex ?? 0));

    // Now clear and render - this is synchronous so no flicker
    this.ctx.fillStyle = this.backgroundColor;
    this.ctx.fillRect(0, 0, this.width, this.height);

    for (const { layer, image } of frameData) {
      this.renderLayer(image, layer);
    }

    return true;
  }

  private renderLayer(image: CanvasImageSource, layer: CompositorLayer): void {
    if (!this.ctx) return;

    const transform = layer.transform ?? {};
    const sourceWidth = layer.source.width ?? this.width;
    const sourceHeight = layer.source.height ?? this.height;

    // Get dimensions
    const destWidth = transform.width ?? sourceWidth;
    const destHeight = transform.height ?? sourceHeight;
    const x = transform.x ?? 0;
    const y = transform.y ?? 0;
    const rotation = transform.rotation ?? 0;
    const scaleX = transform.scaleX ?? 1;
    const scaleY = transform.scaleY ?? 1;
    const opacity = transform.opacity ?? 1;
    const anchorX = transform.anchorX ?? 0.5;
    const anchorY = transform.anchorY ?? 0.5;

    // Save context state
    this.ctx.save();

    // Set opacity
    this.ctx.globalAlpha = opacity;

    // Move to layer position
    this.ctx.translate(x + destWidth * anchorX, y + destHeight * anchorY);

    // Apply rotation
    if (rotation !== 0) {
      this.ctx.rotate((rotation * Math.PI) / 180);
    }

    // Apply scale
    if (scaleX !== 1 || scaleY !== 1) {
      this.ctx.scale(scaleX, scaleY);
    }

    // Draw image centered on anchor point
    this.ctx.drawImage(
      image,
      -destWidth * anchorX,
      -destHeight * anchorY,
      destWidth,
      destHeight
    );

    // Restore context state
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

    // Render frame at new time
    const frame = this.previewOptions.getComposition(clampedTime);
    await this.render(frame);

    this.state.seeking = false;
    this.emitter.emit('seeked', { time: clampedTime });
    this.emitter.emit('timeupdate', { currentTime: clampedTime });
  }

  private startRenderLoop(): void {
    if (this.animationFrameId !== null) return;

    const render = async () => {
      if (!this.state.playing || !this.previewOptions) return;

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

      // Get composition for current time
      const frame = this.previewOptions.getComposition(this.state.currentTime);
      await this.render(frame);

      this.emitter.emit('timeupdate', { currentTime: this.state.currentTime });

      // Schedule next frame
      if (this.state.playing) {
        this.animationFrameId = requestAnimationFrame(() => render());
      }
    };

    this.animationFrameId = requestAnimationFrame(() => render());
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
  on<K extends keyof CompositorEventMap>(
    event: K,
    listener: CompositorEventListener<K>
  ): () => void {
    return this.emitter.on(event, listener);
  }

  /**
   * Subscribes to a compositor event for a single invocation.
   * @param event - Event name to listen for
   * @param listener - Callback function
   * @returns Unsubscribe function
   */
  once<K extends keyof CompositorEventMap>(
    event: K,
    listener: CompositorEventListener<K>
  ): () => void {
    return this.emitter.once(event, listener);
  }

  /**
   * Unsubscribes from a compositor event.
   * @param event - Event name to unsubscribe from
   * @param listener - Optional specific listener to remove
   */
  off<K extends keyof CompositorEventMap>(
    event: K,
    listener?: CompositorEventListener<K>
  ): void {
    this.emitter.off(event, listener);
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
    this.sourcePool.dispose();
    this.emitter.removeAllListeners();
    this.ctx = null;
    this.previewOptions = null;
  }
}
