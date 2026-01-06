import type { IRenderer, Rotation } from './types';

export interface Canvas2DRendererOptions {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  rotation?: Rotation;
}

export class Canvas2DRenderer implements IRenderer {
  private canvas: HTMLCanvasElement | OffscreenCanvas;
  private ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null = null;
  private isInitialized = false;
  private rotation: Rotation = 0;

  constructor(options: Canvas2DRendererOptions) {
    this.canvas = options.canvas;
    this.rotation = options.rotation ?? 0;
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

      const canvasWidth = this.canvas.width;
      const canvasHeight = this.canvas.height;

      if (canvasWidth === 0 || canvasHeight === 0) {
        return false;
      }

      // For 90/270 rotation, swap source dimensions for aspect ratio calculation
      const isRotated90or270 = this.rotation === 90 || this.rotation === 270;
      const effectiveSourceWidth = isRotated90or270 ? sourceHeight : sourceWidth;
      const effectiveSourceHeight = isRotated90or270 ? sourceWidth : sourceHeight;

      // Calculate letterbox dimensions to preserve aspect ratio
      const scale = Math.min(canvasWidth / effectiveSourceWidth, canvasHeight / effectiveSourceHeight);
      const destW = Math.round(effectiveSourceWidth * scale);
      const destH = Math.round(effectiveSourceHeight * scale);
      const dx = Math.round((canvasWidth - destW) / 2);
      const dy = Math.round((canvasHeight - destH) / 2);

      // Clear and fill with black for letterboxing
      this.ctx.fillStyle = 'black';
      this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Save context state
      this.ctx.save();

      // Move to center of destination area
      this.ctx.translate(dx + destW / 2, dy + destH / 2);

      // Apply rotation
      if (this.rotation !== 0) {
        this.ctx.rotate((this.rotation * Math.PI) / 180);
      }

      // Draw the video frame (swap dimensions for 90/270 rotation)
      if (isRotated90or270) {
        this.ctx.drawImage(source, 0, 0, sourceWidth, sourceHeight, -destH / 2, -destW / 2, destH, destW);
      } else {
        this.ctx.drawImage(source, 0, 0, sourceWidth, sourceHeight, -destW / 2, -destH / 2, destW, destH);
      }

      // Restore context state
      this.ctx.restore();

      return true;
    } catch {
      return false;
    }
  }

  public clear(): void {
    if (!this.isReady() || !this.ctx) {
      return;
    }
    this.ctx.fillStyle = 'black';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  public setRotation(rotation: Rotation): void {
    this.rotation = rotation;
  }

  public getRotation(): Rotation {
    return this.rotation;
  }

  public dispose(): void {
    this.ctx = null;
    this.isInitialized = false;
  }
}
