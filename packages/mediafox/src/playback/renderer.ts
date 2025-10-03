import { CanvasSink, type InputVideoTrack, type VideoSample, VideoSampleSink, type WrappedCanvas } from 'mediabunny';
import type { IRenderer, RendererType } from './renderers';
import { Canvas2DRenderer, RendererFactory } from './renderers';

export interface VideoRendererOptions {
  canvas?: HTMLCanvasElement | OffscreenCanvas;
  width?: number;
  height?: number;
  fit?: 'fill' | 'contain' | 'cover';
  rotation?: 0 | 90 | 180 | 270;
  poolSize?: number;
  rendererType?: RendererType;
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

  constructor(options: VideoRendererOptions = {}) {
    this.options = {
      poolSize: options.poolSize ?? 2,
      rendererType: options.rendererType ?? 'webgpu',
      ...options,
    };

    this.rendererType = this.options.rendererType ?? 'webgpu';
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
        console.error('Failed to initialize renderer:', err);
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
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const dpr = window.devicePixelRatio || 1;

        // Calculate new dimensions
        const newWidth = Math.round(width * dpr);
        const newHeight = Math.round(height * dpr);

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

    // Start observing
    this.resizeObserver.observe(htmlCanvas);

    // Defer initial dimensions to ensure proper layout
    // Use requestAnimationFrame to wait for browser layout
    requestAnimationFrame(() => {
      const rect = htmlCanvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const initialWidth = Math.round(rect.width * dpr);
      const initialHeight = Math.round(rect.height * dpr);

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

  private cleanupResizeObserver(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
      this.lastObservedWidth = 0;
      this.lastObservedHeight = 0;
    }
  }

  private updateCanvasAspectRatio(): void {
    if (!this.canvas || !this.videoAspectRatio || !('style' in this.canvas)) {
      return;
    }

    this.canvas.style.aspectRatio = this.videoAspectRatio;
  }

  private updateCanvasBackingBuffer(canvas: HTMLCanvasElement): boolean {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.round(rect.width * dpr);
    const height = Math.round(rect.height * dpr);

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      return true;
    }
    return false;
  }

  private async initializeRenderer(canvas: HTMLCanvasElement | OffscreenCanvas, type: RendererType): Promise<void> {
    console.log(`Initializing renderer: ${type}`);

    const factory = new RendererFactory({ canvas });
    const result = await factory.createRendererWithFallback(type);

    console.log(`Renderer factory result: ${result.actualType}`);

    // Verify new renderer is ready
    if (!result.renderer.isReady()) {
      console.warn(`VideoRenderer: Renderer (${result.actualType}) not ready`);
      result.renderer.dispose();
      throw new Error(`Failed to initialize renderer: ${result.actualType}`);
    }

    // Set the renderer (first time initialization)
    this.renderer = result.renderer;
    this.rendererType = result.actualType;

    console.log(`Initialized renderer: ${this.rendererType}`);

    // Emit events
    if (result.actualType !== type) {
      if (this.onRendererFallback) {
        this.onRendererFallback(type, result.actualType);
      }
    }

    // Always emit renderer change on initialization
    if (this.onRendererChange) {
      console.log(`Emitting renderer change: ${this.rendererType}`);
      this.onRendererChange(this.rendererType);
    }

    // IMPORTANT: Re-render current frame immediately if we have one
    // This fixes the black screen on initial load
    if (this.currentFrame && this.renderer && this.renderer.isReady()) {
      console.log(`Rendering initial frame with ${this.rendererType}`);

      // Check if canvas has dimensions, if not, wait for them
      if (this.currentFrame.canvas.width === 0 || this.currentFrame.canvas.height === 0) {
        console.log('Initial frame has zero dimensions, scheduling render when ready...');
        // Use requestAnimationFrame for better rendering timing
        let frameCount = 0;
        const tryRender = () => {
          frameCount++;
          if (this.currentFrame && this.currentFrame.canvas.width > 0 && this.currentFrame.canvas.height > 0) {
            console.log(
              `Canvas ready (${this.currentFrame.canvas.width}x${this.currentFrame.canvas.height}), rendering initial frame`
            );
            this.renderFrame(this.currentFrame);
          } else if (frameCount < 60) {
            // About 1 second at 60fps
            requestAnimationFrame(tryRender);
          } else {
            console.warn('Canvas dimensions timeout, forcing render');
            if (this.currentFrame) this.renderFrame(this.currentFrame);
          }
        };
        requestAnimationFrame(tryRender);
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
      console.error('Failed to initialize renderer:', err);
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
    this.disposeVideoResources();

    // Check if we can decode before throwing
    if (track.codec === null) {
      throw new Error(`Unsupported video codec`);
    }

    const canDecode = await track.canDecode();
    if (!canDecode) {
      throw new Error(`Cannot decode video track with codec: ${track.codec}`);
    }

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
        console.error('Renderer initialization failed:', err);
        // Continue anyway, we'll handle it later
      }
    }

    // If still no renderer, create Canvas2D fallback
    if (!this.renderer) {
      console.warn('Renderer not ready, creating Canvas2D fallback');
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

    // Create sinks
    // CanvasSink creates intermediate canvases at native video size
    // Renderers handle scaling to display canvas (downscale or 1:1, never upscale beyond native)
    this.canvasSink = new CanvasSink(track, {
      // Use native video dimensions for maximum quality
      // Renderers will letterbox when rendering to display canvas
      rotation: this.options.rotation,
      poolSize: this.options.poolSize,
    });

    this.sampleSink = new VideoSampleSink(track);

    // Allow rendering again now that resources are initialized
    this.disposed = false;

    // Initialize the first frame
    try {
      await this.seek(0);
    } catch (err) {
      console.error('Initial seek failed:', err);
    }

    queueMicrotask(() => {
      if (this.currentFrame && this.renderer && this.renderer.isReady()) {
        this.renderFrame(this.currentFrame);
      }
    });

    requestAnimationFrame(() => {
      if (this.resizeObserver && this.canvas && 'getBoundingClientRect' in this.canvas) {
        this.updateCanvasBackingBuffer(this.canvas as HTMLCanvasElement);
      }

      if (this.currentFrame && this.renderer && this.renderer.isReady()) {
        this.renderFrame(this.currentFrame);
      }
    });

    setTimeout(() => {
      if (this.resizeObserver && this.canvas && 'getBoundingClientRect' in this.canvas) {
        this.updateCanvasBackingBuffer(this.canvas as HTMLCanvasElement);
      }

      if (this.currentFrame && this.renderer && this.renderer.isReady()) {
        this.renderFrame(this.currentFrame);
      }
    }, 100);
  }

  async seek(timestamp: number): Promise<void> {
    if (!this.canvasSink) {
      return;
    }

    this.renderingId++;
    const currentRenderingId = this.renderingId;

    // Dispose current iterator
    if (this.frameIterator) {
      await this.frameIterator.return();
      this.frameIterator = null;
    }

    // Create a new iterator starting from the timestamp
    this.frameIterator = this.canvasSink.canvases(timestamp);

    // Get the first two frames
    const firstResult = await this.frameIterator.next();
    const secondResult = await this.frameIterator.next();

    if (currentRenderingId === this.renderingId) {
      const firstFrame = firstResult.value ?? null;
      const secondFrame = secondResult.value ?? null;

      // Store the frame first
      if (firstFrame) {
        this.currentFrame = firstFrame;

        // Wait a tick to ensure renderer is ready if it was just switched
        await new Promise((resolve) => setTimeout(resolve, 0));

        // Draw the first frame
        // Ensure canvas has dimensions before rendering
        if (firstFrame.canvas.width === 0 || firstFrame.canvas.height === 0) {
          // Use requestAnimationFrame for canvas dimensions check
          let frameCount = 0;
          const checkDimensions = () => {
            frameCount++;
            if (firstFrame.canvas.width > 0 && firstFrame.canvas.height > 0) {
              this.renderFrame(firstFrame);
            } else if (frameCount < 30) {
              // About 0.5 seconds at 60fps
              requestAnimationFrame(checkDimensions);
            } else {
              // Try to render anyway
              this.renderFrame(firstFrame);
            }
          };
          requestAnimationFrame(checkDimensions);
        } else {
          this.renderFrame(firstFrame);
        }
      }

      // Store the second frame for later
      this.nextFrame = secondFrame;

      // If we don't have a next frame yet, try to fetch one
      if (!this.nextFrame) {
        void this.fetchNextFrame(timestamp);
      }
    }
  }

  updateFrame(currentTime: number): boolean {
    if (this.disposed) return false;

    // If we don't have a next frame, request one
    if (!this.nextFrame && this.frameIterator) {
      void this.fetchNextFrame(currentTime);
      return false;
    }

    if (!this.nextFrame) return false;

    // Check if the current playback time has caught up to the next frame
    if (this.nextFrame.timestamp <= currentTime) {
      // Store the frame first
      this.currentFrame = this.nextFrame;
      this.nextFrame = null;

      // Draw the frame (renderer might not be ready yet)
      this.renderFrame(this.currentFrame);

      // Request the next frame asynchronously
      void this.fetchNextFrame(currentTime);
      return true;
    }

    return false;
  }

  private async fetchNextFrame(currentTime: number): Promise<void> {
    if (!this.frameIterator || this.disposed) return;

    const currentRenderingId = this.renderingId;

    // Get the next frame from iterator
    const result = await this.frameIterator.next();
    const frame = result.value ?? null;

    if (!frame || currentRenderingId !== this.renderingId || this.disposed) {
      return;
    }

    // Store the frame for later use
    this.nextFrame = frame;
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
            console.log('Rendering frame after renderer initialization');
            this.renderer.render(frame.canvas);
          }
        });
      }
      return;
    }

    if (!this.renderer.isReady()) {
      console.warn(`VideoRenderer: Renderer (${this.rendererType}) not ready, skipping frame`);
      return;
    }

    // Use renderer to draw frame
    const success = this.renderer.render(frame.canvas);
    if (!success) {
      console.warn(
        `Failed to render frame with ${this.rendererType} (canvas: ${frame.canvas.width}x${frame.canvas.height})`
      );

      // If render failed due to zero dimensions, retry on next frame
      if (frame.canvas.width === 0 || frame.canvas.height === 0) {
        requestAnimationFrame(() => {
          if (this.currentFrame === frame && this.renderer && this.renderer.isReady()) {
            const retrySuccess = this.renderer.render(frame.canvas);
            if (!retrySuccess) {
              console.warn('Retry render also failed');
            }
          }
        });
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
        console.error(`Failed to switch to ${type}:`, err);
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
      console.warn('Runtime switching for OffscreenCanvas may not work if context is already set');

      // Clean up old renderer
      if (this.renderer) {
        this.renderer.dispose();
        this.renderer = null;
      }

      try {
        await this.initializeRenderer(this.canvas, type);
      } catch (err) {
        console.error(`Failed to switch to ${type}:`, err);
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
      console.log(`Re-rendering after switch to ${this.rendererType}`);
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
      console.log(`Renderer already initialized as ${this.rendererType}, emitting change event`);
      callback(this.rendererType);
    }
  }

  setRendererFallbackCallback(callback: (from: RendererType, to: RendererType) => void): void {
    this.onRendererFallback = callback;
  }

  static getSupportedRenderers(): RendererType[] {
    return RendererFactory.getSupportedRenderers();
  }

  private disposeVideoResources(): void {
    this.disposed = true;
    this.renderingId++;

    if (this.frameIterator) {
      // fire-and-forget – safe cleanup without throwing
      void this.frameIterator.return();
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
