export type RendererType = 'webgpu' | 'webgl' | 'canvas2d';
export type Rotation = 0 | 90 | 180 | 270;

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
   * Render a frame from source canvas
   * @param source - Source canvas containing the video frame
   * @returns true if rendering succeeded, false otherwise
   */
  render(source: HTMLCanvasElement | OffscreenCanvas): boolean;

  /**
   * Clear the target canvas
   */
  clear(): void;

  /**
   * Dispose and clean up renderer resources
   */
  dispose(): void;

  /**
   * Set the rotation angle for rendering
   * @param rotation - Rotation angle in degrees (0, 90, 180, 270)
   */
  setRotation(rotation: Rotation): void;

  /**
   * Get the current rotation angle
   */
  getRotation(): Rotation;
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
