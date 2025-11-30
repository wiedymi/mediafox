import type { Input, Source } from 'mediabunny';
import type { MediaSource } from '../types';

export interface SourceManagerOptions {
  maxCacheSize?: number;
  crossOrigin?: string;
  requestInit?: RequestInit;
}

export interface SourceInfo {
  source: Source;
  input: Input | null;
  type: 'blob' | 'buffer' | 'url' | 'file' | 'stream';
  originalSource: MediaSource;
  /** @internal */
  prefetchedData?: unknown;
}
