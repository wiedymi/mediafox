import { CanvasSink, type InputVideoTrack, type VideoSample, VideoSampleSink, type WrappedCanvas } from 'mediabunny';

export interface VideoRendererOptions {
  canvas?: HTMLCanvasElement | OffscreenCanvas;
  width?: number;
  height?: number;
  fit?: 'fill' | 'contain' | 'cover';
  rotation?: 0 | 90 | 180 | 270;
  poolSize?: number;
}

export class VideoRenderer {
  private canvas: HTMLCanvasElement | OffscreenCanvas | null = null;
  private context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null = null;
  private canvasSink: CanvasSink | null = null;
  private sampleSink: VideoSampleSink | null = null;
  private options: VideoRendererOptions;
  private frameIterator: AsyncGenerator<WrappedCanvas, void, unknown> | null = null;
  private currentFrame: WrappedCanvas | null = null;
  private nextFrame: WrappedCanvas | null = null;
  private disposed = false;
  private renderingId = 0;

  constructor(options: VideoRendererOptions = {}) {
    this.options = {
      poolSize: options.poolSize ?? 2,
      fit: options.fit ?? 'contain',
      ...options,
    };

    if (options.canvas) {
      this.setCanvas(options.canvas);
    }
  }

  setCanvas(canvas: HTMLCanvasElement | OffscreenCanvas): void {
    this.canvas = canvas;
    this.context = canvas.getContext('2d', {
      alpha: false,
      desynchronized: true,
    }) as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;

    if (!this.context) {
      throw new Error('Failed to get 2D context from canvas');
    }

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
    if (!this.context || !this.canvas) return;

    this.context.drawImage(frame.canvas, 0, 0, this.canvas.width, this.canvas.height);
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

  dispose(): void {
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
    // Track reference cleared through dispose of iterators
  }
}
