import type { RendererType, Rotation } from '../types';

export type CompositorRendererType = RendererType;

export interface CompositorOptions {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  width?: number;
  height?: number;
  renderer?: CompositorRendererType;
  backgroundColor?: string;
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
  getAudioAt?(time: number, duration: number): Promise<AudioBuffer | null>;
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

export type CompositorEventListener<K extends keyof CompositorEventMap> = (
  event: CompositorEventMap[K]
) => void;
