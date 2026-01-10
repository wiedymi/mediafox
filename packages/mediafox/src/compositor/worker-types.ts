import type { MediaSource } from '../types';
import type { FrameExportOptions, LayerTransform, CompositorSourceOptions, SourceType } from './types';

export interface CompositorWorkerLayer {
  sourceId: string;
  sourceTime?: number;
  transform?: LayerTransform;
  visible?: boolean;
  zIndex?: number;
}

export interface CompositorWorkerFrame {
  time: number;
  layers: CompositorWorkerLayer[];
}

export interface CompositorWorkerSourceInfo {
  id: string;
  type: SourceType;
  duration: number;
  width?: number;
  height?: number;
  hasAudio?: boolean;
}

export interface CompositorWorkerRequest {
  id: number;
  kind: string;
  payload?: unknown;
}

export interface CompositorWorkerResponse {
  id: number;
  ok: boolean;
  result?: unknown;
  error?: string;
}

export interface CompositorWorkerInitPayload {
  canvas: OffscreenCanvas;
  width: number;
  height: number;
  backgroundColor: string;
}

export interface CompositorWorkerLoadPayload {
  source: MediaSource;
  options?: CompositorSourceOptions;
}

export interface CompositorWorkerUnloadPayload {
  id: string;
}

export interface CompositorWorkerRenderPayload {
  frame: CompositorWorkerFrame;
}

export interface CompositorWorkerResizePayload {
  width: number;
  height: number;
}

export interface CompositorWorkerExportPayload {
  frame: CompositorWorkerFrame;
  options?: FrameExportOptions;
}
