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

export type SourceType = 'video' | 'image' | 'audio';

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
