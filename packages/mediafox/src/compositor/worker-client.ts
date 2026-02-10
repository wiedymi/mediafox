import type { MediaSource } from '../types';
import type {
  CompositorSourceOptions,
  CompositorWorkerOptions,
  FrameExportOptions,
  TextSourceOptions,
  TextSourceUpdate,
} from './types';
import type {
  CompositorWorkerExportPayload,
  CompositorWorkerFrame,
  CompositorWorkerInitPayload,
  CompositorWorkerLoadPayload,
  CompositorWorkerLoadTextPayload,
  CompositorWorkerRenderPayload,
  CompositorWorkerResizePayload,
  CompositorWorkerResponse,
  CompositorWorkerSourceInfo,
  CompositorWorkerUnloadPayload,
  CompositorWorkerUpdateTextPayload,
} from './worker-types';

interface CompositorWorkerClientOptions {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  backgroundColor: string;
  worker: CompositorWorkerOptions | boolean;
}

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
};

export class CompositorWorkerClient {
  private worker: Worker;
  private nextId = 1;
  private pending = new Map<number, PendingRequest>();
  private ready: Promise<void>;

  constructor(options: CompositorWorkerClientOptions) {
    const workerOptions = typeof options.worker === 'boolean' ? {} : (options.worker ?? {});
    const workerType = workerOptions.type ?? 'module';
    const workerUrl = workerOptions.url ?? new URL('./compositor-worker.js', import.meta.url);

    this.worker = new Worker(workerUrl, { type: workerType });
    this.worker.onmessage = (event: MessageEvent<CompositorWorkerResponse>) => {
      const { id, ok, result, error } = event.data;
      const pending = this.pending.get(id);
      if (!pending) return;
      this.pending.delete(id);
      if (ok) {
        pending.resolve(result);
      } else {
        pending.reject(new Error(error ?? 'Worker error'));
      }
    };
    this.worker.onerror = (event) => {
      const error = event.error instanceof Error ? event.error : new Error('Worker error');
      for (const pending of this.pending.values()) {
        pending.reject(error);
      }
      this.pending.clear();
    };

    const offscreen = options.canvas.transferControlToOffscreen();
    const initPayload: CompositorWorkerInitPayload = {
      canvas: offscreen,
      width: options.width,
      height: options.height,
      backgroundColor: options.backgroundColor,
    };
    this.ready = this.call<void>('init', initPayload, [offscreen]);
  }

  private postMessage(kind: string, payload?: unknown, transfer?: Transferable[]): number {
    const id = this.nextId++;
    this.worker.postMessage({ id, kind, payload }, transfer ?? []);
    return id;
  }

  private call<T>(kind: string, payload?: unknown, transfer?: Transferable[]): Promise<T> {
    const id = this.postMessage(kind, payload, transfer);
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as PendingRequest['resolve'], reject });
    });
  }

  async loadSource(source: MediaSource, options?: CompositorSourceOptions): Promise<CompositorWorkerSourceInfo> {
    await this.ready;
    const payload: CompositorWorkerLoadPayload = { source, options };
    return this.call<CompositorWorkerSourceInfo>('loadSource', payload);
  }

  async loadImage(source: string | Blob | File): Promise<CompositorWorkerSourceInfo> {
    await this.ready;
    const payload: CompositorWorkerLoadPayload = { source };
    return this.call<CompositorWorkerSourceInfo>('loadImage', payload);
  }

  async loadAudio(source: MediaSource, options?: CompositorSourceOptions): Promise<CompositorWorkerSourceInfo> {
    await this.ready;
    const payload: CompositorWorkerLoadPayload = { source, options };
    return this.call<CompositorWorkerSourceInfo>('loadAudio', payload);
  }

  async loadText(
    options: TextSourceOptions,
    sourceOptions?: CompositorSourceOptions
  ): Promise<CompositorWorkerSourceInfo> {
    await this.ready;
    // Strip non-serialisable `canvasOverrides` callback before sending to worker.
    const { canvasOverrides: _, ...serializableOptions } = options;
    const payload: CompositorWorkerLoadTextPayload = { options: serializableOptions, sourceOptions };
    return this.call<CompositorWorkerSourceInfo>('loadText', payload);
  }

  async updateText(id: string, changes: TextSourceUpdate): Promise<boolean> {
    await this.ready;
    // Strip non-serialisable callback from style overrides.
    const serializableChanges: CompositorWorkerUpdateTextPayload['changes'] = {
      text: changes.text,
    };
    if (changes.style) {
      const { canvasOverrides: _, ...rest } = changes.style;
      serializableChanges.style = rest;
    }
    const payload: CompositorWorkerUpdateTextPayload = { id, changes: serializableChanges };
    return this.call<boolean>('updateText', payload);
  }

  async unloadSource(id: string): Promise<boolean> {
    await this.ready;
    const payload: CompositorWorkerUnloadPayload = { id };
    return this.call<boolean>('unloadSource', payload);
  }

  async render(frame: CompositorWorkerFrame): Promise<boolean> {
    await this.ready;
    const payload: CompositorWorkerRenderPayload = { frame };
    return this.call<boolean>('render', payload);
  }

  async clear(): Promise<boolean> {
    await this.ready;
    return this.call<boolean>('clear');
  }

  async resize(width: number, height: number, fitMode?: 'contain' | 'cover' | 'fill'): Promise<boolean> {
    await this.ready;
    const payload: CompositorWorkerResizePayload = { width, height, fitMode };
    return this.call<boolean>('resize', payload);
  }

  async exportFrame(frame: CompositorWorkerFrame, options?: FrameExportOptions): Promise<Blob | null> {
    await this.ready;
    const payload: CompositorWorkerExportPayload = { frame, options };
    return this.call<Blob | null>('exportFrame', payload);
  }

  dispose(): void {
    try {
      this.worker.postMessage({ id: this.nextId++, kind: 'dispose' });
    } catch {
      // ignore
    }
    this.worker.terminate();
    this.pending.clear();
  }
}
