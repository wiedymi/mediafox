import type { RendererType, Rotation } from '../types';

export type CompositorRendererType = RendererType;

/**
 * Fit mode for scaling video/image content within the compositor canvas.
 * - `'fill'` (default): Stretch to exactly fill the canvas, ignoring aspect ratio. May distort the image.
 * - `'contain'`: Scale to fit entirely within the canvas, preserving aspect ratio. May result in letterboxing/pillarboxing.
 * - `'cover'`: Scale to completely cover the canvas, preserving aspect ratio. Parts may be cropped.
 */
export type FitMode = 'contain' | 'cover' | 'fill';
export type LayerFitMode = FitMode | 'none' | 'auto';

export interface CompositorOptions {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  width?: number;
  height?: number;
  renderer?: CompositorRendererType;
  backgroundColor?: string;
  enableAudio?: boolean;
  worker?: boolean | CompositorWorkerOptions;
  /** Initial fit mode for scaling sources to the canvas. Defaults to 'fill'. */
  fitMode?: FitMode;
}

export interface LayerTransform {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: Rotation;
  scaleX?: number;
  scaleY?: number;
  opacity?: number;
  anchorX?: number;
  anchorY?: number;
  /** CSS filter string applied to this layer (e.g. "brightness(1.1) contrast(1.05)"). */
  filter?: string;
}

export interface CompositorLayer {
  source: CompositorSource;
  sourceTime?: number;
  transform?: LayerTransform;
  /**
   * Fit mode override for this layer. Use 'auto' or leave undefined to use the
   * compositor's global fitMode, or 'none' to render at the source's original size.
   */
  fitMode?: LayerFitMode;
  visible?: boolean;
  zIndex?: number;
}

export interface AudioLayer {
  source: CompositorSource;
  sourceTime?: number;
  volume?: number;
  pan?: number;
  muted?: boolean;
}

export interface CompositionFrame {
  time: number;
  layers: CompositorLayer[];
  audio?: AudioLayer[];
}

export type CompositionProvider = (time: number) => CompositionFrame;

export interface PreviewOptions {
  getComposition: CompositionProvider;
  duration: number;
  fps?: number;
  loop?: boolean;
}

export interface CompositorWorkerOptions {
  enabled?: boolean;
  url?: string;
  type?: 'classic' | 'module';
}

export interface FrameExportOptions {
  format?: 'png' | 'jpeg' | 'webp';
  quality?: number;
}

export type SourceType = 'video' | 'image' | 'audio' | 'text';

export interface CompositorSource {
  id: string;
  type: SourceType;
  duration: number;
  width?: number;
  height?: number;
  getFrameAt(time: number): Promise<CanvasImageSource | null>;
  getAudioBufferSink?(): import('mediabunny').AudioBufferSink | null;
  hasAudio?(): boolean;
  dispose(): void;
}

export interface CompositorSourceOptions {
  id?: string;
  startTime?: number;
  endTime?: number;
}

// ── Text Source Types ──────────────────────────────────────────────────

export interface TextShadowOptions {
  color?: string;
  offsetX?: number;
  offsetY?: number;
  blur?: number;
}

export interface TextStrokeOptions {
  color?: string;
  width?: number;
}

export interface TextBackgroundOptions {
  color?: string;
  paddingX?: number;
  paddingY?: number;
  borderRadius?: number;
}

export interface TextSourceOptions {
  /** The text content to render. Supports newlines (\n). */
  text: string;
  /** CSS font family. Defaults to 'sans-serif'. */
  fontFamily?: string;
  /** Font size in pixels. Defaults to 48. */
  fontSize?: number;
  /** Font weight (e.g. 'normal', 'bold', '700'). Defaults to 'normal'. */
  fontWeight?: string;
  /** Font style (e.g. 'normal', 'italic'). Defaults to 'normal'. */
  fontStyle?: string;
  /** Text fill color. Defaults to '#ffffff'. */
  color?: string;
  /** Text alignment within the bounding box. Defaults to 'left'. */
  align?: 'left' | 'center' | 'right';
  /** Line height multiplier (e.g. 1.2). Defaults to 1.2. */
  lineHeight?: number;
  /** Letter spacing in pixels. Defaults to 0. */
  letterSpacing?: number;
  /** Drop shadow behind text. */
  shadow?: TextShadowOptions;
  /** Text outline / stroke. */
  stroke?: TextStrokeOptions;
  /** Background behind the text bounding box. */
  background?: TextBackgroundOptions;
  /**
   * Maximum width in pixels before text wraps. When unset, the text is
   * rendered as a single line per explicit newline.
   */
  maxWidth?: number;
  /**
   * Padding in pixels added around the rendered text bitmap.
   * Prevents clipping of shadows, strokes, and descenders. Defaults to 8.
   */
  padding?: number;
  /**
   * Escape hatch: apply arbitrary CanvasRenderingContext2D properties before
   * drawing. Runs after all built-in styling is applied, giving full control
   * over any canvas text property the API doesn't expose directly.
   *
   * @example
   * ```ts
   * canvasOverrides: (ctx) => {
   *   ctx.textBaseline = 'top';
   *   ctx.direction = 'rtl';
   * }
   * ```
   *
   * NOTE: This callback is **not serialisable** and will be ignored in worker
   * mode. For worker-safe styling, use the declarative properties.
   */
  canvasOverrides?: (ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D) => void;
}

export interface TextSourceUpdate {
  /** Replace the text content. */
  text?: string;
  /** Partial style overrides — merged with existing options. */
  style?: Partial<Omit<TextSourceOptions, 'text'>>;
}

/**
 * Extended source interface returned by `loadText()`. Provides methods
 * to update text content and styling after creation.
 */
export interface CompositorTextSource extends CompositorSource {
  readonly type: 'text';
  /** Replace text content and/or merge style overrides, then re-render the bitmap. */
  update(changes: TextSourceUpdate): void;
  /** Returns a snapshot of the current text options. */
  getOptions(): TextSourceOptions;
}

export type CompositorEventMap = {
  play: undefined;
  pause: undefined;
  seeking: { time: number };
  seeked: { time: number };
  timeupdate: { currentTime: number };
  ended: undefined;
  error: Error;
  sourceloaded: { id: string; source: CompositorSource };
  sourceunloaded: { id: string };
  compositionchange: undefined;
};

export type CompositorEventListener<K extends keyof CompositorEventMap> = (event: CompositorEventMap[K]) => void;
