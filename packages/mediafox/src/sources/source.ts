import type { MediaSource } from '../types';

export interface SourceOptions {
  title?: string;
  poster?: string;
}

export interface SourceItem {
  mediaSource: MediaSource;
  title?: string;
  poster?: string;
}

/**
 * Utility functions for creating media sources with metadata
 * Matches the documentation examples and provides a fluent API
 */
export const Source = {
  /**
   * Create a source from a URL string or URL object
   */
  fromUrl(url: string | URL, options: SourceOptions = {}): SourceItem {
    return {
      mediaSource: url,
      title: options.title,
      poster: options.poster,
    };
  },

  /**
   * Create a source from a File object
   */
  fromFile(file: File, options: SourceOptions = {}): SourceItem {
    return {
      mediaSource: file,
      title: options.title || file.name,
      poster: options.poster,
    };
  },

  /**
   * Create a source from a Blob
   */
  fromBlob(blob: Blob, options: SourceOptions = {}): SourceItem {
    return {
      mediaSource: blob,
      title: options.title,
      poster: options.poster,
    };
  },

  /**
   * Create a source from an ArrayBuffer
   */
  fromBuffer(buffer: ArrayBuffer, options: SourceOptions = {}): SourceItem {
    return {
      mediaSource: buffer,
      title: options.title,
      poster: options.poster,
    };
  },

  /**
   * Create a source from a Uint8Array
   */
  fromUint8Array(array: Uint8Array, options: SourceOptions = {}): SourceItem {
    return {
      mediaSource: array,
      title: options.title,
      poster: options.poster,
    };
  },

  /**
   * Create a source from a ReadableStream
   */
  fromStream(stream: ReadableStream<Uint8Array>, options: SourceOptions = {}): SourceItem {
    return {
      mediaSource: stream,
      title: options.title,
      poster: options.poster,
    };
  },
} as const;
