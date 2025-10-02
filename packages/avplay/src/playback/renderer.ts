import { CanvasSink, type InputVideoTrack, type VideoSample, VideoSampleSink, type WrappedCanvas } from 'mediabunny';

import { Canvas2DRenderer, RendererFactory } from './renderers';
import type { IRenderer, RendererType } from './renderers';

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
  private rendererType: RendererType = 'auto';
  private onRendererChange?: (type: RendererType) => void;
  private onRendererFallback?: (from: RendererType, to: RendererType) => void;

  constructor(options: VideoRendererOptions = {}) {
    this.options = {
      poolSize: options.poolSize ?? 2,
      fit: options.fit ?? 'contain',
      rendererType: options.rendererType ?? 'auto',
      ...options,
    };

    this.rendererType = this.options.rendererType ?? 'auto';

    if (options.canvas) {
      // Initialize canvas synchronously for immediate rendering
      this.canvas = options.canvas;

      // Create a Canvas2D renderer synchronously for immediate use
      // This ensures rendering works immediately, even before async initialization completes
      this.renderer = new Canvas2DRenderer({ canvas: options.canvas });

      // Then initialize the requested renderer asynchronously
      // This will replace Canvas2D if a different renderer was requested
      void this.initializeRenderer(options.canvas, this.rendererType);

      // Configure canvas size if specified
      if (this.options.width) {
        options.canvas.width = this.options.width;
      }
      if (this.options.height) {
        options.canvas.height = this.options.height;
      }
    }
  }

  private async initializeRenderer(canvas: HTMLCanvasElement | OffscreenCanvas, type: RendererType): Promise<void> {
    // Skip if requesting Canvas2D (already initialized synchronously)
    if (type === 'canvas2d') {
      return;
    }

    const factory = new RendererFactory({ canvas });
    const result = await factory.createRendererWithFallback(type);

    // Skip if the result is Canvas2D and we already have it
    if (result.actualType === 'canvas2d' && this.renderer instanceof Canvas2DRenderer) {
      return;
    }

    // Clean up old renderer
    if (this.renderer) {
      this.renderer.dispose();
    }

    this.renderer = result.renderer;
    this.rendererType = result.actualType;

    // Emit events if renderer changed
    if (result.actualType !== type) {
      if (this.onRendererFallback) {
        this.onRendererFallback(type, result.actualType);
      }
    }

    if (this.onRendererChange) {
      this.onRendererChange(this.rendererType);
    }
  }

  async setCanvas(canvas: HTMLCanvasElement | OffscreenCanvas): Promise<void> {
    this.canvas = canvas;

    // Initialize renderer with fallback
    await this.initializeRenderer(canvas, this.rendererType);

    // Configure canvas size if specified
    if (this.options.width) {
      canvas.width = this.options.width;
    }
    if (this.options.height) {
      canvas.height = this.options.height;
    }
  }

  async setVideoTrack(track: InputVideoTrack): Promise<void> {
    this.dispose();

    // Check if we can decode before throwing
    if (track.codec === null) {
      throw new Error(`Unsupported video codec`);
    }

    const canDecode = await track.canDecode();
    if (!canDecode) {
      throw new Error(`Cannot decode video track with codec: ${track.codec}`);
    }

    // Create sinks
    // Track is set and used through iterators and sinks
    this.canvasSink = new CanvasSink(track, {
      width: this.options.width,
      height: this.options.height,
      fit: this.options.fit,
      rotation: this.options.rotation,
      poolSize: this.options.poolSize,
    });

    this.sampleSink = new VideoSampleSink(track);

    // Update canvas size if not specified
    if (this.canvas) {
      if (!this.options.width) {
        this.canvas.width = track.displayWidth;
      }
      if (!this.options.height) {
        this.canvas.height = track.displayHeight;
      }
    }

    // Allow rendering again now that resources are initialized
    this.disposed = false;

    // Initialize the first frame
    await this.seek(0);
  }

  async seek(timestamp: number): Promise<void> {
    if (!this.canvasSink) return;

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

      // Draw the first frame
      if (firstFrame) {
        this.currentFrame = firstFrame;
        this.renderFrame(firstFrame);
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
      // Draw the frame
      this.renderFrame(this.nextFrame);
      this.currentFrame = this.nextFrame;
      this.nextFrame = null;

      // Request the next frame asynchronously
      void this.fetchNextFrame(currentTime);
      return true;
    }

    return false;
  }

  private async fetchNextFrame(currentTime: number): Promise<void> {
    if (!this.frameIterator || this.disposed) return;

    const currentRenderingId = this.renderingId;

    // Loop until we find a frame in the future or run out of frames
    while (true) {
      const result = await this.frameIterator.next();
      const frame = result.value ?? null;

      if (!frame || currentRenderingId !== this.renderingId || this.disposed) {
        break;
      }

      if (frame.timestamp <= currentTime) {
        // This frame is in the past, draw it immediately and continue
        this.renderFrame(frame);
        this.currentFrame = frame;
      } else {
        // This frame is in the future, save it for later
        this.nextFrame = frame;
        break;
      }
    }
  }

  private renderFrame(frame: WrappedCanvas): void {
    if (!this.renderer || !this.canvas) return;
    if (!this.renderer.isReady()) return;

    // Use renderer to draw frame
    // TypeScript has issues with union type inference here, but this is safe
    // @ts-expect-error - IRenderer.render accepts HTMLCanvasElement | OffscreenCanvas
    this.renderer.render(frame.canvas, this.canvas);
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

  async switchRenderer(type: RendererType): Promise<void> {
    if (!this.canvas) {
      throw new Error('Cannot switch renderer: No canvas set');
    }

    const previousType = this.rendererType;
    this.rendererType = type;

    const factory = new RendererFactory({ canvas: this.canvas });
    const result = await factory.createRendererWithFallback(type);

    // Clean up old renderer
    if (this.renderer) {
      this.renderer.dispose();
    }

    this.renderer = result.renderer;

    // Update type if fallback occurred
    if (result.actualType !== type) {
      if (this.onRendererFallback) {
        this.onRendererFallback(type, result.actualType);
      }
      this.rendererType = result.actualType;
    }

    // Emit change event
    if (this.onRendererChange && this.rendererType !== previousType) {
      this.onRendererChange(this.rendererType);
    }

    // Re-render current frame with new renderer
    if (this.currentFrame) {
      this.renderFrame(this.currentFrame);
    }
  }

  setRendererChangeCallback(callback: (type: RendererType) => void): void {
    this.onRendererChange = callback;
  }

  setRendererFallbackCallback(callback: (from: RendererType, to: RendererType) => void): void {
    this.onRendererFallback = callback;
  }

  static getSupportedRenderers(): RendererType[] {
    return RendererFactory.getSupportedRenderers();
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

    this.currentFrame = null;
    this.nextFrame = null;
    this.canvasSink = null;
    this.sampleSink = null;
    this.onRendererChange = undefined;
    this.onRendererFallback = undefined;
    // Track reference cleared through dispose of iterators
  }
}
