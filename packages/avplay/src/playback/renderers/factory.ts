import { Canvas2DRenderer } from './canvas2d';
import type { IRenderer, RendererCreationResult, RendererOptions, RendererType } from './types';
import { WebGLRenderer } from './webgl';
import { WebGPURenderer } from './webgpu';

export class RendererFactory {
  private canvas: HTMLCanvasElement | OffscreenCanvas;
  private powerPreference: 'high-performance' | 'low-power';

  constructor(options: RendererOptions) {
    this.canvas = options.canvas;
    this.powerPreference = options.powerPreference || 'high-performance';
  }

  public async createRenderer(type: RendererType): Promise<IRenderer | null> {
    try {
      if (type === 'auto') {
        const result = await this.createRendererWithFallback('webgpu');
        return result.renderer;
      }

      switch (type) {
        case 'webgpu':
          return await this.createWebGPURenderer();
        case 'webgl':
          return this.createWebGLRenderer();
        case 'canvas2d':
          return this.createCanvas2DRenderer();
        default:
          return null;
      }
    } catch {
      return null;
    }
  }

  public async createRendererWithFallback(preferredType: RendererType): Promise<RendererCreationResult> {
    // Determine fallback order based on preference
    let fallbackOrder: RendererType[];

    if (preferredType === 'auto') {
      fallbackOrder = ['webgpu', 'webgl', 'canvas2d'];
    } else {
      fallbackOrder = [preferredType];
      if (preferredType !== 'webgl') fallbackOrder.push('webgl');
      if (preferredType !== 'canvas2d') fallbackOrder.push('canvas2d');
    }

    for (const type of fallbackOrder) {
      if (type === 'auto') continue;

      const renderer = await this.createRenderer(type);
      if (renderer?.isReady()) {
        return { renderer, actualType: type };
      }

      // Clean up failed renderer
      if (renderer) {
        renderer.dispose();
      }
    }

    // Last resort: canvas2d always works
    const fallbackRenderer = this.createCanvas2DRenderer();
    return { renderer: fallbackRenderer, actualType: 'canvas2d' };
  }

  private async createWebGPURenderer(): Promise<IRenderer | null> {
    const nav = navigator as Navigator & { gpu?: GPU };
    if (!nav.gpu) return null;

    const renderer = new WebGPURenderer({
      canvas: this.canvas,
      powerPreference: this.powerPreference,
    });

    // Wait for async initialization (max 300ms)
    for (let i = 0; i < 10; i++) {
      if (renderer.isReady()) return renderer;
      await new Promise((resolve) => setTimeout(resolve, 30));
    }

    return renderer.isReady() ? renderer : null;
  }

  private createWebGLRenderer(): IRenderer | null {
    try {
      const renderer = new WebGLRenderer({
        canvas: this.canvas,
        powerPreference: this.powerPreference,
        preserveDrawingBuffer: false,
        antialias: false,
        alpha: false,
      });

      return renderer.isReady() ? renderer : null;
    } catch {
      return null;
    }
  }

  private createCanvas2DRenderer(): IRenderer {
    return new Canvas2DRenderer({ canvas: this.canvas });
  }

  /**
   * Get all available renderer types for the current environment
   */
  public static getSupportedRenderers(): RendererType[] {
    const available: RendererType[] = ['canvas2d'];

    // Check WebGL support
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) available.push('webgl');
    } catch {}

    // Check WebGPU support
    const nav = navigator as Navigator & { gpu?: GPU };
    if (nav.gpu) {
      available.push('webgpu');
    }

    return available;
  }

  /**
   * Get display name for renderer type
   */
  public static getRendererDisplayName(type: RendererType): string {
    switch (type) {
      case 'canvas2d':
        return 'Canvas 2D';
      case 'webgl':
        return 'WebGL';
      case 'webgpu':
        return 'WebGPU';
      case 'auto':
        return 'Auto';
      default:
        return 'Unknown';
    }
  }

  /**
   * Check if a specific renderer type is supported
   */
  public static isRendererSupported(type: RendererType): boolean {
    if (type === 'auto') return true;
    if (type === 'canvas2d') return true;

    const supported = RendererFactory.getSupportedRenderers();
    return supported.includes(type);
  }
}
