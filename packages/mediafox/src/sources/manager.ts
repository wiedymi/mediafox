import {
  ALL_FORMATS,
  BlobSource,
  BufferSource,
  CanvasSink,
  FilePathSource,
  Input,
  type InputAudioTrack,
  type InputVideoTrack,
  ReadableStreamSource,
  type Source,
  UrlSource,
  type WrappedCanvas,
} from 'mediabunny';

import type { MediaSource } from '../types';
import type { SourceInfo, SourceManagerOptions } from './types';

/** @internal */
export interface PrefetchedTrackData {
  videoTrack: InputVideoTrack | null;
  audioTrack: InputAudioTrack | null;
  canvasSink: CanvasSink | null;
  firstFrame: WrappedCanvas | null;
  duration: number;
}

export class SourceManager {
  private currentSource: SourceInfo | null = null;
  private queuedSources: Map<string, SourceInfo> = new Map(); // For playlist prefetch if needed
  private options: SourceManagerOptions;

  constructor(options: SourceManagerOptions = {}) {
    this.options = {
      maxCacheSize: options.maxCacheSize ?? 16 * 1024 * 1024, // 16MB default
      crossOrigin: options.crossOrigin,
      requestInit: options.requestInit,
    };
  }
  async createSource(media: MediaSource, id?: string): Promise<SourceInfo> {
    // Dispose current if switching (but NOT when prefetching with an id)
    if (this.currentSource && !id) {
      this.disposeCurrent();
    }

    let source: Source;
    let type: SourceInfo['type'];

    if (media instanceof File || media instanceof Blob) {
      source = new BlobSource(media, {
        maxCacheSize: this.options.maxCacheSize,
      });
      type = 'blob';
    } else if (media instanceof ArrayBuffer || media instanceof Uint8Array) {
      source = new BufferSource(media);
      type = 'buffer';
    } else if (typeof media === 'string' || media instanceof URL) {
      const url = media instanceof URL ? media.href : media;

      // Check if it's a file path (Node.js environment)
      if (typeof window === 'undefined' && !url.startsWith('http')) {
        source = new FilePathSource(url, {
          maxCacheSize: this.options.maxCacheSize,
        });
        type = 'file';
      } else {
        source = new UrlSource(url, {
          maxCacheSize: this.options.maxCacheSize,
          requestInit: this.options.requestInit,
        });
        type = 'url';
      }
    } else if (typeof ReadableStream !== 'undefined' && media instanceof ReadableStream) {
      source = new ReadableStreamSource(media as ReadableStream<Uint8Array>, {
        maxCacheSize: this.options.maxCacheSize,
      });
      type = 'stream';
    } else {
      throw new TypeError('Unsupported media source type');
    }

    const input = new Input({
      source,
      formats: ALL_FORMATS,
    });

    const sourceInfo: SourceInfo = {
      source,
      input,
      type,
      originalSource: media,
    };

    if (id) {
      this.queuedSources.set(id, sourceInfo);
    } else {
      this.currentSource = sourceInfo;
    }

    return sourceInfo;
  }
  getCurrentSource(): SourceInfo | null {
    return this.currentSource;
  }

  getQueuedSource(id: string): SourceInfo | null {
    return this.queuedSources.get(id) || null;
  }

  async preloadSource(media: MediaSource, id: string): Promise<void> {
    if (this.queuedSources.has(id)) {
      return;
    }

    const sourceInfo = await this.createSource(media, id);

    // Prefetch tracks and first frame for instant switching
    if (sourceInfo.input) {
      try {
        const prefetchedData = await this.prefetchTrackData(sourceInfo.input);
        sourceInfo.prefetchedData = prefetchedData;
      } catch {
        // Prefetch failed, will fall back to normal loading
      }
    }
  }

  private async prefetchTrackData(input: Input): Promise<PrefetchedTrackData> {
    const videoTracks = await input.getVideoTracks();
    const audioTracks = await input.getAudioTracks();

    const videoTrack = videoTracks.length > 0 ? videoTracks[0] : null;
    const audioTrack = audioTracks.length > 0 ? audioTracks[0] : null;

    let canvasSink: CanvasSink | null = null;
    let firstFrame = null;
    let duration = 0;

    if (videoTrack) {
      // Check if decodable
      if (videoTrack.codec !== null && (await videoTrack.canDecode())) {
        canvasSink = new CanvasSink(videoTrack, { poolSize: 2 });

        // Get first frame
        const iterator = canvasSink.canvases(0);
        const result = await iterator.next();
        firstFrame = result.value ?? null;
        // Don't close iterator - we'll reuse the sink
        await iterator.return();

        duration = await videoTrack.computeDuration();
      }
    }

    if (!duration && audioTrack) {
      duration = await audioTrack.computeDuration();
    }

    return {
      videoTrack,
      audioTrack,
      canvasSink,
      firstFrame,
      duration,
    };
  }

  /**
   * Gets a prefetched source by id, promotes it to current, and returns it.
   * Returns null if no prefetched source exists for the id.
   */
  promoteQueuedSource(id: string): SourceInfo | null {
    const queued = this.queuedSources.get(id);
    if (!queued) return null;

    // Remove from queue
    this.queuedSources.delete(id);

    // Dispose current if exists
    if (this.currentSource) {
      this.currentSource.input?.dispose();
    }

    // Promote to current
    this.currentSource = queued;
    return queued;
  }

  getOriginalSource(): MediaSource | null {
    return this.currentSource?.originalSource ?? null;
  }

  disposeCurrent(): void {
    if (this.currentSource) {
      this.currentSource.input?.dispose();
      this.currentSource = null;
    }
  }

  disposeQueued(id: string): void {
    const queued = this.queuedSources.get(id);
    if (queued) {
      queued.input?.dispose();
      this.queuedSources.delete(id);
    }
  }

  disposeAll(): void {
    this.disposeCurrent();
    this.queuedSources.forEach((_, id) => {
      this.disposeQueued(id);
    });
    this.queuedSources.clear();
  }

  dispose(): void {
    this.disposeAll();
  }

  // Helper methods for common operations
  static isStreamingSource(media: MediaSource): boolean {
    return media instanceof ReadableStream || (typeof media === 'string' && media.startsWith('http'));
  }

  static isLocalSource(media: MediaSource): boolean {
    return (
      media instanceof File ||
      media instanceof Blob ||
      media instanceof ArrayBuffer ||
      media instanceof Uint8Array ||
      (typeof media === 'string' && !media.startsWith('http'))
    );
  }

  static getSourceType(media: MediaSource): string {
    if (media instanceof File) return 'file';
    if (media instanceof Blob) return 'blob';
    if (media instanceof ArrayBuffer || media instanceof Uint8Array) return 'buffer';
    if (media instanceof ReadableStream) return 'stream';
    if (typeof media === 'string' || media instanceof URL) {
      const url = media instanceof URL ? media.href : media;
      return url.startsWith('http') ? 'url' : 'file';
    }
    return 'unknown';
  }

  // Utility to create a source from fetch response
  static async fromFetch(url: string | URL, init?: RequestInit): Promise<Blob> {
    const response = await fetch(url, init);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }
    return response.blob();
  }

  // Utility to create a streaming source from fetch
  static fromStreamingFetch(url: string | URL, init?: RequestInit): ReadableStream<Uint8Array> {
    return new ReadableStream({
      async start(controller) {
        const response = await fetch(url, init);
        if (!response.ok) {
          controller.error(new Error(`Failed to fetch: ${response.status} ${response.statusText}`));
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          controller.error(new Error('Response body is not readable'));
          return;
        }

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });
  }
}
