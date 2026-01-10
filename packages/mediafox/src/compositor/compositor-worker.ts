import { Compositor } from './compositor';
import type { CompositorLayer, CompositionFrame, CompositorSource } from './types';
import type {
  CompositorWorkerExportPayload,
  CompositorWorkerFrame,
  CompositorWorkerInitPayload,
  CompositorWorkerLoadPayload,
  CompositorWorkerRenderPayload,
  CompositorWorkerResizePayload,
  CompositorWorkerSourceInfo,
  CompositorWorkerUnloadPayload,
  CompositorWorkerRequest,
  CompositorWorkerResponse,
} from './worker-types';

type WorkerScope = DedicatedWorkerGlobalScope;

const workerScope = self as WorkerScope;

let compositor: Compositor | null = null;
let canvas: OffscreenCanvas | null = null;

const buildSourceInfo = (source: CompositorSource): CompositorWorkerSourceInfo => ({
  id: source.id,
  type: source.type,
  duration: source.duration,
  width: source.width,
  height: source.height,
  hasAudio: source.type === 'audio' ? true : source.hasAudio ? source.hasAudio() : false,
});

const mapFrame = (frame: CompositorWorkerFrame): CompositionFrame => {
  if (!compositor) {
    throw new Error('Compositor not initialized');
  }

  const layers = new Array<CompositorLayer>(frame.layers.length);
  for (let i = 0; i < frame.layers.length; i++) {
    const layer = frame.layers[i];
    const source = compositor.getSource(layer.sourceId);
    if (!source) {
      throw new Error(`Unknown source: ${layer.sourceId}`);
    }
    layers[i] = {
      source,
      sourceTime: layer.sourceTime,
      transform: layer.transform,
      visible: layer.visible,
      zIndex: layer.zIndex,
    };
  }

  return { time: frame.time, layers };
};

const postResponse = (response: CompositorWorkerResponse, transfer?: Transferable[]): void => {
  workerScope.postMessage(response, transfer ?? []);
};

workerScope.onmessage = async (event: MessageEvent<CompositorWorkerRequest>) => {
  const { id, kind, payload } = event.data;

  try {
    switch (kind) {
      case 'init': {
        const init = payload as CompositorWorkerInitPayload;
        canvas = init.canvas;
        compositor = new Compositor({
          canvas,
          width: init.width,
          height: init.height,
          backgroundColor: init.backgroundColor,
          enableAudio: false,
        });
        postResponse({ id, ok: true });
        return;
      }
      case 'loadSource': {
        const { source, options } = payload as CompositorWorkerLoadPayload;
        if (!compositor) throw new Error('Compositor not initialized');
        const loaded = await compositor.loadSource(source, options);
        postResponse({ id, ok: true, result: buildSourceInfo(loaded) });
        return;
      }
      case 'loadImage': {
        const { source } = payload as CompositorWorkerLoadPayload;
        if (!compositor) throw new Error('Compositor not initialized');
        const loaded = await compositor.loadImage(source as string | Blob | File);
        postResponse({ id, ok: true, result: buildSourceInfo(loaded) });
        return;
      }
      case 'loadAudio': {
        const { source, options } = payload as CompositorWorkerLoadPayload;
        if (!compositor) throw new Error('Compositor not initialized');
        const loaded = await compositor.loadAudio(source, options);
        postResponse({ id, ok: true, result: buildSourceInfo(loaded) });
        return;
      }
      case 'unloadSource': {
        if (!compositor) throw new Error('Compositor not initialized');
        const { id: sourceId } = payload as CompositorWorkerUnloadPayload;
        const result = compositor.unloadSource(sourceId);
        postResponse({ id, ok: true, result });
        return;
      }
      case 'render': {
        if (!compositor) throw new Error('Compositor not initialized');
        const { frame } = payload as CompositorWorkerRenderPayload;
        const mappedFrame = mapFrame(frame);
        const result = await compositor.render(mappedFrame);
        postResponse({ id, ok: true, result });
        return;
      }
      case 'clear': {
        if (!compositor) throw new Error('Compositor not initialized');
        compositor.clear();
        postResponse({ id, ok: true, result: true });
        return;
      }
      case 'resize': {
        if (!compositor) throw new Error('Compositor not initialized');
        const { width, height } = payload as CompositorWorkerResizePayload;
        compositor.resize(width, height);
        postResponse({ id, ok: true, result: true });
        return;
      }
      case 'exportFrame': {
        if (!compositor || !canvas) throw new Error('Compositor not initialized');
        const { frame, options } = payload as CompositorWorkerExportPayload;
        const mappedFrame = mapFrame(frame);
        await compositor.render(mappedFrame);
        const type = `image/${options?.format ?? 'png'}`;
        const blob = await canvas.convertToBlob({
          type,
          quality: options?.quality,
        });
        postResponse({ id, ok: true, result: blob });
        return;
      }
      case 'dispose': {
        compositor?.dispose();
        compositor = null;
        canvas = null;
        postResponse({ id, ok: true, result: true });
        return;
      }
      default: {
        throw new Error(`Unknown worker command: ${kind}`);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Worker error';
    postResponse({ id, ok: false, error: message });
  }
};
