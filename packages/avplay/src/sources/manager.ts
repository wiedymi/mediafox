import {
  ALL_FORMATS,
  BlobSource,
  BufferSource,
  FilePathSource,
  Input,
  ReadableStreamSource,
  type Source,
  UrlSource,
} from 'mediabunny';

import type { MediaSource } from '../types';
import type { SourceInfo, SourceManagerOptions } from './types';

export class SourceManager {
  private currentSource: SourceInfo | null = null;
  private options: SourceManagerOptions;

  constructor(options: SourceManagerOptions = {}) {
    this.options = {
      maxCacheSize: options.maxCacheSize ?? 16 * 1024 * 1024, // 16MB default
      crossOrigin: options.crossOrigin,
      requestInit: options.requestInit,
    };
  }

  async createSource(media: MediaSource): Promise<SourceInfo> {
    this.dispose();

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

    this.currentSource = {
      source,
      input,
      type,
      originalSource: media,
    };

    return this.currentSource;
  }

  getCurrentSource(): SourceInfo | null {
    return this.currentSource;
  }

  getOriginalSource(): MediaSource | null {
    return this.currentSource?.originalSource ?? null;
  }

  dispose(): void {
    this.currentSource = null;
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
