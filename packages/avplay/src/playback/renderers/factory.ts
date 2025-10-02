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
    // Always try the preferred type first, then fall back to others
    const fallbackOrder: RendererType[] = [preferredType];
    if (preferredType !== 'webgl') fallbackOrder.push('webgl');
    if (preferredType !== 'canvas2d') fallbackOrder.push('canvas2d');

    for (const type of fallbackOrder) {
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

    // WebGPU only works with HTMLCanvasElement, not OffscreenCanvas
    if (!('getContext' in this.canvas)) {
      console.log('WebGPU requires HTMLCanvasElement, not OffscreenCanvas');
      return null;
    }

    const renderer = new WebGPURenderer({
      canvas: this.canvas,
      powerPreference: this.powerPreference,
    });

    // Wait for async initialization with proper timeout
    const timeout = 1000; // 1 second timeout
    const startTime = performance.now();

    // Create a promise that resolves when renderer is ready
    const waitForReady = async (): Promise<boolean> => {
      while (!renderer.isReady()) {
        if (performance.now() - startTime > timeout) {
          console.log('WebGPU renderer initialization timed out');
          return false;
        }
        // Use requestIdleCallback if available for better performance
        if ('requestIdleCallback' in window) {
          await new Promise((resolve) => requestIdleCallback(() => resolve(undefined)));
        } else {
          await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
        }
      }
      return true;
    };

    const ready = await waitForReady();
    if (ready) {
      console.log('WebGPU renderer initialized successfully');
      return renderer;
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
   * Returns in priority order: WebGPU, WebGL, Canvas2D
   */
  public static getSupportedRenderers(): RendererType[] {
    const available: RendererType[] = [];

    // Check WebGPU support (highest priority)
    const nav = navigator as Navigator & { gpu?: GPU };
    if (nav.gpu) {
      available.push('webgpu');
    }

    // Check WebGL support (medium priority)
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) available.push('webgl');
    } catch {}

    // Canvas2D is always available (fallback)
    available.push('canvas2d');

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
      default:
        return 'Unknown';
    }
  }

  /**
   * Check if a specific renderer type is supported
   */
  public static isRendererSupported(type: RendererType): boolean {
    if (type === 'canvas2d') return true;

    const supported = RendererFactory.getSupportedRenderers();
    return supported.includes(type);
  }
}
