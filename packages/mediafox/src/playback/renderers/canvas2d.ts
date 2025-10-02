import type { IRenderer } from './types';

export interface Canvas2DRendererOptions {
  canvas: HTMLCanvasElement | OffscreenCanvas;
}

export class Canvas2DRenderer implements IRenderer {
  private canvas: HTMLCanvasElement | OffscreenCanvas;
  private ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null = null;
  private isInitialized = false;

  constructor(options: Canvas2DRendererOptions) {
    this.canvas = options.canvas;
    this.initialize();
  }

  private initialize(): boolean {
    try {
      this.ctx = this.canvas.getContext('2d', {
        alpha: false,
        desynchronized: true,
      }) as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;

      if (!this.ctx) {
        return false;
      }

      this.ctx.imageSmoothingEnabled = true;
      this.ctx.imageSmoothingQuality = 'high';

      this.isInitialized = true;
      return true;
    } catch {
      return false;
    }
  }

  public isReady(): boolean {
    return this.isInitialized && this.ctx !== null;
  }

  public render(source: HTMLCanvasElement | OffscreenCanvas): boolean {
    if (!this.isReady() || !this.ctx) {
      return false;
    }

    try {
      const sourceWidth = source.width;
      const sourceHeight = source.height;

      if (sourceWidth === 0 || sourceHeight === 0) {
        return false;
      }

      // Use this.canvas dimensions
      const canvasWidth = this.canvas.width;
      const canvasHeight = this.canvas.height;

      // Calculate letterbox dimensions
      const scale = Math.min(canvasWidth / sourceWidth, canvasHeight / sourceHeight);
      const destW = Math.floor(sourceWidth * scale);
      const destH = Math.floor(sourceHeight * scale);
      const dx = Math.floor((canvasWidth - destW) / 2);
      const dy = Math.floor((canvasHeight - destH) / 2);

      // Clear and render
      this.ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      this.ctx.drawImage(source, 0, 0, sourceWidth, sourceHeight, dx, dy, destW, destH);

      return true;
    } catch {
      return false;
    }
  }

  public clear(): void {
    if (!this.isReady() || !this.ctx) {
      return;
    }
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  public dispose(): void {
    this.ctx = null;
    this.isInitialized = false;
  }
}
