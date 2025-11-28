import { CanvasSink, type InputVideoTrack, type VideoSample, VideoSampleSink, type WrappedCanvas } from 'mediabunny';
import type { IRenderer, RendererType } from './renderers';
import { Canvas2DRenderer, RendererFactory } from './renderers';

/** @internal */
interface PrefetchedVideoData {
  canvasSink: CanvasSink;
  firstFrame: WrappedCanvas | null;
}

// Internal registry for prefetched video data, keyed by track
const prefetchedVideoDataRegistry = new WeakMap<InputVideoTrack, PrefetchedVideoData>();

/** @internal */
export function registerPrefetchedVideoData(track: InputVideoTrack, data: PrefetchedVideoData): void {
  prefetchedVideoDataRegistry.set(track, data);
}

/** @internal */
export function consumePrefetchedVideoData(track: InputVideoTrack): PrefetchedVideoData | undefined {
  const data = prefetchedVideoDataRegistry.get(track);
  if (data) {
    prefetchedVideoDataRegistry.delete(track);
  }
  return data;
}

export interface VideoRendererOptions {
  canvas?: HTMLCanvasElement | OffscreenCanvas;
  width?: number;
  height?: number;
  fit?: 'fill' | 'contain' | 'cover';
  rotation?: 0 | 90 | 180 | 270;
  poolSize?: number;
  rendererType?: RendererType;
  /** Enable debug logging for renderer operations (default: false) */
  debug?: boolean;
}

export class VideoRenderer {
  private canvas: HTMLCanvasElement | OffscreenCanvas | null = null;
  private canvasSink: CanvasSink | null = null;
  private sampleSink: VideoSampleSink | null = null;
  private options: VideoRendererOptions;
  private frameIterator: AsyncGenerator<WrappedCanvas, void, unknown> | null = null;
  private currentFrame: WrappedCanvas | null = null;
  private nextFrame: WrappedCanvas | null = null;
  private disposed = false;
  private renderingId = 0;
  private renderer: IRenderer | null = null;
  private rendererType: RendererType = 'canvas2d';
  private onRendererChange?: (type: RendererType) => void;
  private onRendererFallback?: (from: RendererType, to: RendererType) => void;
  private initPromise: Promise<void> | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private lastObservedWidth = 0;
  private lastObservedHeight = 0;
  private videoAspectRatio: string | null = null;
  private debug = false;

  constructor(options: VideoRendererOptions = {}) {
    this.options = {
      poolSize: options.poolSize ?? 2,
      rendererType: options.rendererType ?? 'webgpu',
      ...options,
    };

    this.rendererType = this.options.rendererType ?? 'webgpu';
    this.debug = options.debug ?? false;
    this.initPromise = null;

    if (options.canvas) {
      this.canvas = options.canvas;

      // Set canvas backing buffer dimensions if provided in options
      if (this.options.width !== undefined) {
        options.canvas.width = this.options.width;
      }
      if (this.options.height !== undefined) {
        options.canvas.height = this.options.height;
      }

      // Start initialization immediately but store the promise
      // We'll await it when needed
      this.initPromise = this.initializeRenderer(options.canvas, this.rendererType).catch((err) => {
        if (this.debug) console.error('Failed to initialize renderer:', err);
        // Don't create fallback here - let initializeRenderer handle it
      });

      // Setup automatic resize handling for HTMLCanvasElement
      this.setupResizeObserver(options.canvas);
    }
  }

  private setupResizeObserver(canvas: HTMLCanvasElement | OffscreenCanvas): void {
    // Only setup for HTMLCanvasElement in DOM
    if (!('getBoundingClientRect' in canvas) || typeof ResizeObserver === 'undefined') {
      return;
    }

    // Don't auto-resize if user provided explicit dimensions
    if (this.options.width !== undefined || this.options.height !== undefined) {
      return;
    }

    // Clean up any existing observer
    this.cleanupResizeObserver();

    const htmlCanvas = canvas as HTMLCanvasElement;

    // Create resize observer to automatically update canvas dimensions
    this.resizeObserver = new ResizeObserver((entries) => {
      // Check if disposed to prevent memory leaks
      if (this.disposed || !this.resizeObserver) {
        return;
      }

      for (const entry of entries) {
        const { width: newWidth, height: newHeight } = this.getCanvasDimensionsFromEntry(entry, htmlCanvas);

        // Only update if dimensions changed
        if (newWidth !== this.lastObservedWidth || newHeight !== this.lastObservedHeight) {
          this.lastObservedWidth = newWidth;
          this.lastObservedHeight = newHeight;

          // Update canvas backing buffer
          if (htmlCanvas.width !== newWidth || htmlCanvas.height !== newHeight) {
            htmlCanvas.width = newWidth;
            htmlCanvas.height = newHeight;

            // Apply video aspect ratio if available
            this.updateCanvasAspectRatio();

            // Re-render current frame with new dimensions
            if (this.currentFrame && this.renderer && this.renderer.isReady()) {
              this.renderFrame(this.currentFrame);
            }
          }
        }
      }
    });

    // Try to observe with device-pixel-content-box first, fallback to content-box
    try {
      this.resizeObserver.observe(htmlCanvas, { box: 'device-pixel-content-box' });
    } catch {
      try {
        this.resizeObserver.observe(htmlCanvas, { box: 'content-box' });
      } catch {
        // If both fail, observe without options
        this.resizeObserver.observe(htmlCanvas);
      }
    }

    // Defer initial dimensions to ensure proper layout
    // Use requestAnimationFrame to wait for browser layout
    requestAnimationFrame(() => {
      // Check if disposed before applying dimensions
      if (this.disposed || !this.resizeObserver) {
        return;
      }

      const { width: initialWidth, height: initialHeight } = this.getCanvasDimensionsFromCanvas(htmlCanvas);

      // Store dimensions
      this.lastObservedWidth = initialWidth;
      this.lastObservedHeight = initialHeight;

      // Apply initial dimensions to canvas if they differ
      if (htmlCanvas.width !== initialWidth || htmlCanvas.height !== initialHeight) {
        htmlCanvas.width = initialWidth;
        htmlCanvas.height = initialHeight;

        // Apply video aspect ratio if available
        this.updateCanvasAspectRatio();

        // Re-render if we have a frame
        if (this.currentFrame && this.renderer && this.renderer.isReady()) {
          this.renderFrame(this.currentFrame);
        }
      }
    });
  }

  private getCanvasDimensionsFromEntry(
    entry: ResizeObserverEntry,
    canvas: HTMLCanvasElement
  ): { width: number; height: number } {
    let width = 0;
    let height = 0;
    const dpr = window.devicePixelRatio || 1;

    // Try device-pixel-content-box first (Chrome/Edge) - most accurate for canvas
    if (entry.devicePixelContentBoxSize?.length) {
      width = entry.devicePixelContentBoxSize[0].inlineSize;
      height = entry.devicePixelContentBoxSize[0].blockSize;
    }
    // Fallback to contentBoxSize (Firefox/Safari)
    else if (entry.contentBoxSize?.length) {
      width = Math.round(entry.contentBoxSize[0].inlineSize * dpr);
      height = Math.round(entry.contentBoxSize[0].blockSize * dpr);
    }
    // Fallback to contentRect
    else if (entry.contentRect) {
      width = Math.round(entry.contentRect.width * dpr);
      height = Math.round(entry.contentRect.height * dpr);
    }

    // If still zero, get from canvas directly
    if (width === 0 || height === 0) {
      return this.getCanvasDimensionsFromCanvas(canvas);
    }

    // Return dimensions with minimum 1x1 guard
    return {
      width: Math.max(1, width),
      height: Math.max(1, height),
    };
  }

  private getCanvasDimensionsFromCanvas(canvas: HTMLCanvasElement): { width: number; height: number } {
    let width = 0;
    let height = 0;
    const dpr = window.devicePixelRatio || 1;

    // Try getBoundingClientRect first
    const rect = canvas.getBoundingClientRect();
    width = Math.round(rect.width * dpr);
    height = Math.round(rect.height * dpr);

    // If zero, fallback to clientWidth/clientHeight
    if (width === 0 || height === 0) {
      width = Math.round(canvas.clientWidth * dpr) || width;
      height = Math.round(canvas.clientHeight * dpr) || height;
    }

    // Guard against zero dimensions - use minimum 1x1
    if (width === 0 || height === 0) {
      console.warn('Canvas has zero dimensions after all fallbacks, using 1x1');
    }
    return {
      width: Math.max(1, width),
      height: Math.max(1, height),
    };
  }

  private cleanupResizeObserver(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
      this.lastObservedWidth = 0;
      this.lastObservedHeight = 0;
    }
  }

  private retryUntilCanvasReady(frame: WrappedCanvas, action: () => void, maxRetries = 60): void {
    let count = 0;
    const retry = () => {
      count++;
      if (frame.canvas.width > 0 && frame.canvas.height > 0) {
        action();
      } else if (count < maxRetries) {
        requestAnimationFrame(retry);
      } else {
        if (this.debug) console.warn('Canvas dimensions timeout, forcing action');
        action(); // Try anyway
      }
    };
    requestAnimationFrame(retry);
  }

  private updateCanvasAspectRatio(): void {
    if (!this.canvas || !this.videoAspectRatio || !('style' in this.canvas)) {
      return;
    }

    this.canvas.style.aspectRatio = this.videoAspectRatio;
  }

  private updateCanvasBackingBuffer(canvas: HTMLCanvasElement): boolean {
    const { width, height } = this.getCanvasDimensionsFromCanvas(canvas);

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      return true;
    }
    return false;
  }

  private async initializeRenderer(canvas: HTMLCanvasElement | OffscreenCanvas, type: RendererType): Promise<void> {
    if (this.debug) console.log(`Initializing renderer: ${type}`);

    const factory = new RendererFactory({ canvas });
    const result = await factory.createRendererWithFallback(type);

    if (this.debug) console.log(`Renderer factory result: ${result.actualType}`);

    // Verify new renderer is ready
    if (!result.renderer.isReady()) {
      if (this.debug) console.warn(`VideoRenderer: Renderer (${result.actualType}) not ready`);
      result.renderer.dispose();
      throw new Error(`Failed to initialize renderer: ${result.actualType}`);
    }

    // Set the renderer (first time initialization)
    this.renderer = result.renderer;
    this.rendererType = result.actualType;

    if (this.debug) console.log(`Initialized renderer: ${this.rendererType}`);

    // Emit events
    if (result.actualType !== type) {
      if (this.onRendererFallback) {
        this.onRendererFallback(type, result.actualType);
      }
    }

    // Always emit renderer change on initialization
    if (this.onRendererChange) {
      if (this.debug) console.log(`Emitting renderer change: ${this.rendererType}`);
      this.onRendererChange(this.rendererType);
    }

    // IMPORTANT: Re-render current frame immediately if we have one
    // This fixes the black screen on initial load
    if (this.currentFrame && this.renderer && this.renderer.isReady()) {
      if (this.debug) console.log(`Rendering initial frame with ${this.rendererType}`);

      // Check if canvas has dimensions, if not, wait for them
      if (this.currentFrame.canvas.width === 0 || this.currentFrame.canvas.height === 0) {
        if (this.debug) console.log('Initial frame has zero dimensions, scheduling render when ready...');
        this.retryUntilCanvasReady(this.currentFrame, () => {
          if (this.currentFrame && this.debug) {
            console.log(
              `Canvas ready (${this.currentFrame.canvas.width}x${this.currentFrame.canvas.height}), rendering initial frame`
            );
          }
          if (this.currentFrame) this.renderFrame(this.currentFrame);
        });
      } else {
        this.renderFrame(this.currentFrame);
      }
    }
  }

  async setCanvas(canvas: HTMLCanvasElement | OffscreenCanvas): Promise<void> {
    this.canvas = canvas;

    // Clean up old renderer
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }

    // Set canvas backing buffer dimensions if provided in options
    if (this.options.width !== undefined) {
      canvas.width = this.options.width;
    }
    if (this.options.height !== undefined) {
      canvas.height = this.options.height;
    }

    // Setup automatic resize handling for HTMLCanvasElement
    this.setupResizeObserver(canvas);

    // Initialize renderer without pre-creating Canvas2D
    try {
      await this.initializeRenderer(canvas, this.rendererType);
    } catch (err) {
      if (this.debug) console.error('Failed to initialize renderer:', err);
      // If all else fails, create Canvas2D as last resort
      if (!this.renderer) {
        this.renderer = new Canvas2DRenderer({ canvas });
        this.rendererType = 'canvas2d';
        if (this.onRendererChange) {
          this.onRendererChange('canvas2d');
        }
      }
    }
  }

  async setVideoTrack(track: InputVideoTrack): Promise<void> {
    // Dispose only video track resources, not the renderer
    await this.disposeVideoResources();

    // Check if we can decode before throwing
    if (track.codec === null) {
      throw new Error(`Unsupported video codec`);
    }

    const canDecode = await track.canDecode();
    if (!canDecode) {
      throw new Error(`Cannot decode video track with codec: ${track.codec}`);
    }

    // Check for prefetched data (internal optimization)
    const prefetchedData = consumePrefetchedVideoData(track);

    // Calculate the video's aspect ratio from its dimensions (only once per track)
    if (!this.videoAspectRatio && track.displayWidth && track.displayHeight) {
      const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
      const divisor = gcd(track.displayWidth, track.displayHeight);
      const aspectWidth = track.displayWidth / divisor;
      const aspectHeight = track.displayHeight / divisor;
      this.videoAspectRatio = `${aspectWidth}/${aspectHeight}`;

      // Apply aspect ratio to canvas
      this.updateCanvasAspectRatio();
    }

    // Wait for renderer initialization to complete
    if (this.initPromise) {
      try {
        await this.initPromise;
      } catch (err) {
        if (this.debug) console.error('Renderer initialization failed:', err);
        // Continue anyway, we'll handle it later
      }
    }

    // If still no renderer, create Canvas2D fallback
    if (!this.renderer) {
      if (this.debug) console.warn('Renderer not ready, creating Canvas2D fallback');
      if (this.canvas) {
        this.renderer = new Canvas2DRenderer({ canvas: this.canvas });
        this.rendererType = 'canvas2d';
        if (this.onRendererChange) {
          this.onRendererChange('canvas2d');
        }
      }
    }

    // Set canvas backing buffer dimensions for optimal quality
    if (this.canvas) {
      // If user provided explicit dimensions, use those
      if (this.options.width !== undefined || this.options.height !== undefined) {
        const targetWidth = this.options.width ?? track.displayWidth;
        const targetHeight = this.options.height ?? track.displayHeight;

        if (this.canvas.width !== targetWidth || this.canvas.height !== targetHeight) {
          this.canvas.width = targetWidth;
          this.canvas.height = targetHeight;

          // Apply video aspect ratio if available
          this.updateCanvasAspectRatio();
        }
      }
      // If ResizeObserver is active, it will handle dimensions
      else if (!this.resizeObserver) {
        // No ResizeObserver and no explicit dimensions, default to video dimensions
        if (this.canvas.width === 0 || this.canvas.height === 0) {
          this.canvas.width = track.displayWidth;
          this.canvas.height = track.displayHeight;

          // Apply video aspect ratio if available
          this.updateCanvasAspectRatio();
        }
      }
      // Otherwise ResizeObserver is handling dimensions automatically
    }

    // Use prefetched sink if available, otherwise create new
    if (prefetchedData?.canvasSink) {
      this.canvasSink = prefetchedData.canvasSink;
    } else {
      // Create sinks
      // CanvasSink creates intermediate canvases at native video size
      // Renderers handle scaling to display canvas (downscale or 1:1, never upscale beyond native)
      this.canvasSink = new CanvasSink(track, {
        // Use native video dimensions for maximum quality
        // Renderers will letterbox when rendering to display canvas
        rotation: this.options.rotation,
        poolSize: this.options.poolSize,
      });
    }

    this.sampleSink = new VideoSampleSink(track);

    // Allow rendering again now that resources are initialized
    this.disposed = false;

    // Use prefetched first frame if available for instant display
    if (prefetchedData?.firstFrame) {
      this.currentFrame = prefetchedData.firstFrame;

      // Render immediately
      if (this.currentFrame.canvas.width > 0 && this.currentFrame.canvas.height > 0) {
        this.renderFrame(this.currentFrame);
      } else {
        this.retryUntilCanvasReady(this.currentFrame, () => {
          if (this.currentFrame) this.renderFrame(this.currentFrame);
        }, 30);
      }

      // Start iterator from 0 for next frames
      this.frameIterator = this.canvasSink.canvases(0);
      // Skip first frame since we already have it
      void this.frameIterator.next().then(() => {
        void this.fetchNextFrame();
      });
    } else {
      // Initialize the first frame normally
      try {
        await this.seek(0);
      } catch (err) {
        if (this.debug) console.error('Initial seek failed:', err);
      }
    }

    // Single render attempt after layout
    requestAnimationFrame(() => {
      if (this.resizeObserver && this.canvas && 'getBoundingClientRect' in this.canvas) {
        this.updateCanvasBackingBuffer(this.canvas as HTMLCanvasElement);
      }

      if (this.currentFrame && this.renderer && this.renderer.isReady()) {
        this.renderFrame(this.currentFrame);
      }
    });
  }

  async seek(timestamp: number): Promise<void> {
    if (!this.canvasSink) {
      return;
    }

    this.renderingId++;
    const currentRenderingId = this.renderingId;

    // Dispose current iterator
    if (this.frameIterator) {
      try {
        await this.frameIterator.return();
      } catch {
        // Iterator may already be closed
      }
      this.frameIterator = null;
    }

    // Create a new iterator starting from the timestamp
    const iterator = this.canvasSink.canvases(timestamp);
    this.frameIterator = iterator;

    try {
      // Get the first two frames
      const firstResult = await iterator.next();
      const secondResult = await iterator.next();

      if (currentRenderingId !== this.renderingId) {
        return;
      }

      const firstFrame = firstResult.value ?? null;
      const secondFrame = secondResult.value ?? null;

      // Store the frame first
      if (firstFrame) {
        this.currentFrame = firstFrame;

        // Draw the first frame immediately if canvas has dimensions
        if (firstFrame.canvas.width > 0 && firstFrame.canvas.height > 0) {
          this.renderFrame(firstFrame);
        } else {
          this.retryUntilCanvasReady(firstFrame, () => this.renderFrame(firstFrame), 30);
        }
      }

      // Store the second frame for later
      this.nextFrame = secondFrame;

      // If we don't have a next frame yet, try to fetch one
      if (!this.nextFrame) {
        void this.fetchNextFrame();
      }
    } catch {
      // Iterator was closed or disposed during seek
    }
  }

  updateFrame(currentTime: number): { frameUpdated: boolean; isStarving: boolean } {
    if (this.disposed) return { frameUpdated: false, isStarving: false };

    // If we don't have a next frame, request one (if iterator exists)
    // This is frame starvation - we're playing but have no frame ready
    if (!this.nextFrame) {
      if (this.frameIterator) {
        void this.fetchNextFrame();
      }
      return { frameUpdated: false, isStarving: true };
    }

    // Check if the current playback time has caught up to the next frame
    if (this.nextFrame.timestamp <= currentTime) {
      // Store the frame first
      this.currentFrame = this.nextFrame;
      this.nextFrame = null;

      // Draw the frame (renderer might not be ready yet)
      this.renderFrame(this.currentFrame);

      // Request the next frame asynchronously (only if iterator still exists)
      if (this.frameIterator) {
        void this.fetchNextFrame();
      }
      return { frameUpdated: true, isStarving: false };
    }

    return { frameUpdated: false, isStarving: false };
  }

  private async fetchNextFrame(): Promise<void> {
    const iterator = this.frameIterator;
    if (!iterator || this.disposed) return;

    const currentRenderingId = this.renderingId;

    try {
      // Get the next frame from iterator
      const result = await iterator.next();
      const frame = result.value ?? null;

      if (!frame || currentRenderingId !== this.renderingId || this.disposed) {
        return;
      }

      // Store the frame for later use
      this.nextFrame = frame;
    } catch {
      // Iterator was closed or disposed during fetch
    }
  }

  private renderFrame(frame: WrappedCanvas): void {
    // Store current frame for potential re-rendering
    this.currentFrame = frame;

    if (!this.renderer || !this.canvas) {
      // This can happen if rendering is attempted before setup completes
      // Try to render once renderer is ready
      if (this.initPromise) {
        this.initPromise.then(() => {
          if (this.currentFrame === frame && this.renderer && this.renderer.isReady()) {
            if (this.debug) console.log('Rendering frame after renderer initialization');
            this.renderer.render(frame.canvas);
          }
        });
      }
      return;
    }

    if (!this.renderer.isReady()) {
      if (this.debug) console.warn(`VideoRenderer: Renderer (${this.rendererType}) not ready, skipping frame`);
      return;
    }

    // Use renderer to draw frame
    const success = this.renderer.render(frame.canvas);
    if (!success) {
      if (this.debug) {
        console.warn(
          `Failed to render frame with ${this.rendererType} (canvas: ${frame.canvas.width}x${frame.canvas.height})`
        );
      }

      // If render failed due to zero dimensions, retry on next frame
      if (frame.canvas.width === 0 || frame.canvas.height === 0) {
        this.retryUntilCanvasReady(
          frame,
          () => {
            if (this.currentFrame === frame && this.renderer && this.renderer.isReady()) {
              const retrySuccess = this.renderer.render(frame.canvas);
              if (!retrySuccess && this.debug) {
                console.warn('Retry render also failed');
              }
            }
          },
          1
        ); // Just one retry for render failures
      }
    }
  }

  async getFrameAt(timestamp: number): Promise<WrappedCanvas | null> {
    if (!this.canvasSink) return null;
    return this.canvasSink.getCanvas(timestamp);
  }

  async getSampleAt(timestamp: number): Promise<VideoSample | null> {
    if (!this.sampleSink) return null;
    return this.sampleSink.getSample(timestamp);
  }

  async extractFrames(startTime: number, endTime: number, interval: number = 1): Promise<WrappedCanvas[]> {
    if (!this.canvasSink) return [];

    const frames: WrappedCanvas[] = [];
    const timestamps: number[] = [];

    for (let t = startTime; t <= endTime; t += interval) {
      timestamps.push(t);
    }

    for await (const frame of this.canvasSink.canvasesAtTimestamps(timestamps)) {
      if (frame) frames.push(frame);
    }

    return frames;
  }

  async screenshot(
    timestamp?: number,
    options: {
      format?: 'png' | 'jpeg' | 'webp';
      quality?: number;
    } = {}
  ): Promise<Blob | null> {
    if (!this.canvas) return null;

    // If timestamp provided, render that frame first
    if (timestamp !== undefined && this.canvasSink) {
      const frame = await this.canvasSink.getCanvas(timestamp);
      if (frame) {
        this.renderFrame(frame);
      }
    }

    // Convert canvas to blob
    if ('toBlob' in this.canvas) {
      return new Promise((resolve) => {
        (this.canvas as HTMLCanvasElement).toBlob(
          (blob) => resolve(blob),
          `image/${options.format ?? 'png'}`,
          options.quality
        );
      });
    } else {
      // OffscreenCanvas
      const offscreenCanvas = this.canvas as OffscreenCanvas;
      return offscreenCanvas.convertToBlob({
        type: `image/${options.format ?? 'png'}`,
        quality: options.quality,
      });
    }
  }

  getCurrentFrame(): WrappedCanvas | null {
    return this.currentFrame;
  }

  getNextFrame(): WrappedCanvas | null {
    return this.nextFrame;
  }

  getRendererType(): RendererType {
    return this.rendererType;
  }

  getCanvas(): HTMLCanvasElement | OffscreenCanvas | null {
    return this.canvas;
  }

  /**
   * Updates canvas backing buffer dimensions to match its CSS display size.
   * Call this after changing CSS dimensions to prevent stretching.
   * Only works for HTMLCanvasElement in DOM.
   */
  updateCanvasDimensions(): void {
    if (!this.canvas || !('getBoundingClientRect' in this.canvas)) {
      return;
    }

    const htmlCanvas = this.canvas as HTMLCanvasElement;
    const dimensionsChanged = this.updateCanvasBackingBuffer(htmlCanvas);

    if (dimensionsChanged && this.currentFrame && this.renderer && this.renderer.isReady()) {
      this.renderFrame(this.currentFrame);
    }
  }

  async switchRenderer(type: RendererType): Promise<void> {
    if (!this.canvas) {
      throw new Error('Cannot switch renderer: No canvas set');
    }

    const previousType = this.rendererType;

    // If switching to the same type, do nothing
    if (type === previousType) {
      return;
    }

    if (this.debug)
      console.warn(`Switching renderer from ${previousType} to ${type}. This will recreate the canvas element.`);

    // For HTMLCanvasElement, we need to recreate it to switch context types
    if (this.canvas instanceof HTMLCanvasElement) {
      const oldCanvas = this.canvas;
      const parent = oldCanvas.parentElement;

      if (!parent) {
        throw new Error('Cannot switch renderer: Canvas has no parent element');
      }

      // Create new canvas with same properties
      const newCanvas = document.createElement('canvas');
      newCanvas.width = oldCanvas.width;
      newCanvas.height = oldCanvas.height;
      newCanvas.className = oldCanvas.className;
      newCanvas.id = oldCanvas.id;
      newCanvas.style.cssText = oldCanvas.style.cssText;

      // Copy all attributes
      Array.from(oldCanvas.attributes).forEach((attr) => {
        if (attr.name !== 'id' && attr.name !== 'class' && attr.name !== 'style') {
          newCanvas.setAttribute(attr.name, attr.value);
        }
      });

      // Clean up old renderer
      if (this.renderer) {
        this.renderer.dispose();
        this.renderer = null;
      }

      // Replace canvas in DOM
      parent.replaceChild(newCanvas, oldCanvas);
      this.canvas = newCanvas;

      // Initialize new renderer
      try {
        await this.initializeRenderer(newCanvas, type);
      } catch (err) {
        if (this.debug) console.error(`Failed to switch to ${type}:`, err);
        // Try to fall back to Canvas2D
        if (!this.renderer) {
          this.renderer = new Canvas2DRenderer({ canvas: newCanvas });
          this.rendererType = 'canvas2d';
          if (this.onRendererChange) {
            this.onRendererChange('canvas2d');
          }
        }
      }
    } else {
      // For OffscreenCanvas, we can't recreate it, so just try to switch
      // This will likely fail if the context is already set
      if (this.debug) console.warn('Runtime switching for OffscreenCanvas may not work if context is already set');

      // Clean up old renderer
      if (this.renderer) {
        this.renderer.dispose();
        this.renderer = null;
      }

      try {
        await this.initializeRenderer(this.canvas, type);
      } catch (err) {
        if (this.debug) console.error(`Failed to switch to ${type}:`, err);
        // Try to fall back to Canvas2D
        if (!this.renderer) {
          this.renderer = new Canvas2DRenderer({ canvas: this.canvas });
          this.rendererType = 'canvas2d';
          if (this.onRendererChange) {
            this.onRendererChange('canvas2d');
          }
        }
      }
    }

    // Re-render current frame with new renderer
    if (this.currentFrame && this.renderer && this.renderer.isReady()) {
      if (this.debug) console.log(`Re-rendering after switch to ${this.rendererType}`);
      // Use microtask for immediate re-render after context switch
      queueMicrotask(() => {
        if (this.currentFrame && this.renderer && this.renderer.isReady()) {
          this.renderFrame(this.currentFrame);
        }
      });
    }
  }

  setRendererChangeCallback(callback: (type: RendererType) => void): void {
    this.onRendererChange = callback;

    // If renderer is already initialized, emit immediately
    if (this.renderer && this.rendererType) {
      if (this.debug) console.log(`Renderer already initialized as ${this.rendererType}, emitting change event`);
      callback(this.rendererType);
    }
  }

  setRendererFallbackCallback(callback: (from: RendererType, to: RendererType) => void): void {
    this.onRendererFallback = callback;
  }

  static getSupportedRenderers(): RendererType[] {
    return RendererFactory.getSupportedRenderers();
  }

  /**
   * Clears iterators to stop any in-flight async operations.
   * Called before disposing the input to prevent accessing disposed resources.
   */
  async clearIterators(): Promise<void> {
    this.renderingId++;

    if (this.frameIterator) {
      try {
        await this.frameIterator.return();
      } catch {
        // Iterator may already be closed
      }
      this.frameIterator = null;
    }

    this.currentFrame = null;
    this.nextFrame = null;
  }

  private async disposeVideoResources(): Promise<void> {
    this.disposed = true;
    this.renderingId++;

    if (this.frameIterator) {
      try {
        await this.frameIterator.return();
      } catch {
        // Iterator may already be closed
      }
      this.frameIterator = null;
    }

    this.currentFrame = null;
    this.nextFrame = null;
    this.canvasSink = null;
    this.sampleSink = null;
    this.videoAspectRatio = null;
  }

  dispose(): void {
    this.disposed = true;
    this.renderingId++;

    if (this.frameIterator) {
      // fire-and-forget – safe cleanup without throwing
      void this.frameIterator.return();
      this.frameIterator = null;
    }

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }

    // Clean up resize observer
    this.cleanupResizeObserver();

    this.currentFrame = null;
    this.nextFrame = null;
    this.canvasSink = null;
    this.sampleSink = null;
    this.onRendererChange = undefined;
    this.onRendererFallback = undefined;
    // Track reference cleared through dispose of iterators
  }
}
