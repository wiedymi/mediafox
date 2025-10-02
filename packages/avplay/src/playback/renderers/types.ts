export type RendererType = 'webgpu' | 'webgl' | 'canvas2d' | 'auto';

/**
 * Base interface for video renderers.
 * All renderers must implement this interface.
 */
export interface IRenderer {
  /**
   * Check if the renderer is ready to render frames
   */
  isReady(): boolean;

  /**
   * Render a frame from source canvas to target canvas
   * @param source - Source canvas containing the video frame
   * @param target - Target canvas to render to
   * @returns true if rendering succeeded, false otherwise
   */
  render(source: HTMLCanvasElement, target: HTMLCanvasElement | OffscreenCanvas): boolean;

  /**
   * Clear the target canvas
   */
  clear(): void;

  /**
   * Dispose and clean up renderer resources
   */
  dispose(): void;
}

/**
 * Options for creating a renderer
 */
export interface RendererOptions {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  powerPreference?: 'high-performance' | 'low-power';
}

/**
 * Result of renderer creation with fallback
 */
export interface RendererCreationResult {
  renderer: IRenderer;
  actualType: RendererType;
}
