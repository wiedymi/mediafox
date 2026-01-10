import {
  ALL_FORMATS,
  AudioBufferSink,
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
import type { CompositorSource, CompositorSourceOptions, SourceType } from './types';

/**
 * LRU cache for video frames.
 * Uses Map's insertion order + move-to-end on access for O(1) LRU eviction.
 */
class LRUFrameCache {
  private cache = new Map<number, WrappedCanvas>();
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: number): WrappedCanvas | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: number, value: WrappedCanvas): void {
    // If key exists, delete first to update insertion order
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Evict least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

interface VideoSourceData {
  input: Input<Source>;
  videoTrack: InputVideoTrack;
  canvasSink: CanvasSink;
  frameCache: LRUFrameCache;
  frameIntervalMs: number; // Frame duration in milliseconds for cache key quantization
  audioTrack: InputAudioTrack | null;
  audioBufferSink: AudioBufferSink | null;
}

interface AudioSourceData {
  input: Input<Source>;
  audioTrack: InputAudioTrack;
  audioBufferSink: AudioBufferSink;
}

interface ImageSourceData {
  image: HTMLImageElement | ImageBitmap;
}

class VideoSource implements CompositorSource {
  readonly id: string;
  readonly type: SourceType = 'video';
  readonly duration: number;
  readonly width: number;
  readonly height: number;
  private data: VideoSourceData;
  private disposed = false;

  constructor(id: string, data: VideoSourceData, duration: number, width: number, height: number) {
    this.id = id;
    this.data = data;
    this.duration = duration;
    this.width = width;
    this.height = height;
  }

  async getFrameAt(time: number): Promise<CanvasImageSource | null> {
    if (this.disposed) return null;

    // Quantize to frame boundaries to maximize cache hits
    // e.g., at 30fps (33.33ms/frame), times 0.001s and 0.030s map to same frame 0
    const frameIntervalMs = this.data.frameIntervalMs;
    const cacheKey = Math.floor((time * 1000) / frameIntervalMs) * frameIntervalMs;

    // Check LRU cache
    const cached = this.data.frameCache.get(cacheKey);
    if (cached) {
      return cached.canvas;
    }

    try {
      const frame = await this.data.canvasSink.getCanvas(time);
      if (!frame) return null;

      // LRU cache handles eviction automatically
      this.data.frameCache.set(cacheKey, frame);

      return frame.canvas;
    } catch {
      return null;
    }
  }

  /**
   * Returns the AudioBufferSink for this video source, or null if the video has no audio.
   */
  getAudioBufferSink(): AudioBufferSink | null {
    return this.data.audioBufferSink;
  }

  /**
   * Returns true if this video source has an audio track.
   */
  hasAudio(): boolean {
    return this.data.audioBufferSink !== null;
  }

  clearCache(): void {
    this.data.frameCache.clear();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.data.frameCache.clear();
    this.data.input.dispose();
  }
}

class ImageSource implements CompositorSource {
  readonly id: string;
  readonly type: SourceType = 'image';
  readonly duration = Infinity; // Images have infinite duration
  readonly width: number;
  readonly height: number;
  private data: ImageSourceData;
  private disposed = false;

  constructor(id: string, data: ImageSourceData) {
    this.id = id;
    this.data = data;
    this.width = data.image.width;
    this.height = data.image.height;
  }

  async getFrameAt(_time: number): Promise<CanvasImageSource | null> {
    if (this.disposed) return null;
    return this.data.image;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if ('close' in this.data.image) {
      (this.data.image as ImageBitmap).close();
    }
  }
}

class AudioOnlySource implements CompositorSource {
  readonly id: string;
  readonly type: SourceType = 'audio';
  readonly duration: number;
  readonly width = 0;
  readonly height = 0;
  private data: AudioSourceData;
  private disposed = false;

  constructor(id: string, data: AudioSourceData, duration: number) {
    this.id = id;
    this.data = data;
    this.duration = duration;
  }

  async getFrameAt(_time: number): Promise<CanvasImageSource | null> {
    return null; // Audio sources don't have frames
  }

  /**
   * Returns the AudioBufferSink for this audio source.
   */
  getAudioBufferSink(): AudioBufferSink {
    return this.data.audioBufferSink;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.data.input.dispose();
  }
}

export class SourcePool {
  private sources = new Map<string, CompositorSource>();
  private audioContext: AudioContext | null = null;
  private nextId = 0;

  constructor(audioContext?: AudioContext) {
    this.audioContext = audioContext ?? null;
  }

  private generateId(): string {
    return `source_${this.nextId++}`;
  }

  async loadVideo(source: MediaSource, options: CompositorSourceOptions = {}): Promise<CompositorSource> {
    const id = options.id ?? this.generateId();

    // Create input from source
    const input = this.createInput(source);

    // Get video tracks
    const videoTracks = await input.getVideoTracks();
    if (videoTracks.length === 0) {
      input.dispose();
      throw new Error('Source has no video track');
    }
    const videoTrack = videoTracks[0];

    // Check if we can decode
    const canDecode = await videoTrack.canDecode();
    if (!canDecode) {
      input.dispose();
      throw new Error(`Cannot decode video track with codec: ${videoTrack.codec}`);
    }

    // Create canvas sink for frame extraction with larger pool for smoother playback
    const canvasSink = new CanvasSink(videoTrack, {
      poolSize: 4,
    });

    // Get duration
    const duration = await videoTrack.computeDuration();

    // Calculate frame interval from framerate for cache key quantization
    // Fallback to 30fps (33.33ms) if framerate unavailable
    let fps = 30;
    try {
      const stats = await videoTrack.computePacketStats(100);
      if (stats.averagePacketRate > 0) {
        fps = stats.averagePacketRate;
      }
    } catch {
      // Ignore errors in stats computation
    }
    const frameIntervalMs = 1000 / fps;

    // Adaptive cache size based on resolution
    // Higher resolution = fewer cached frames to limit memory usage
    const pixelCount = videoTrack.displayWidth * videoTrack.displayHeight;
    const cacheSize = pixelCount > 2073600 ? 15 : pixelCount > 921600 ? 30 : 60; // 1080p: 15, 720p: 30, smaller: 60

    // Try to get audio track if available
    let audioTrack: InputAudioTrack | null = null;
    let audioBufferSink: AudioBufferSink | null = null;
    try {
      const audioTracks = await input.getAudioTracks();
      if (audioTracks.length > 0) {
        audioTrack = audioTracks[0];
        const canDecodeAudio = await audioTrack.canDecode();
        if (canDecodeAudio) {
          audioBufferSink = new AudioBufferSink(audioTrack);
        }
      }
    } catch {
      // No audio track or can't decode - continue without audio
    }

    const videoSource = new VideoSource(
      id,
      {
        input,
        videoTrack,
        canvasSink,
        frameCache: new LRUFrameCache(cacheSize),
        frameIntervalMs,
        audioTrack,
        audioBufferSink,
      },
      duration,
      videoTrack.displayWidth,
      videoTrack.displayHeight
    );

    this.sources.set(id, videoSource);
    return videoSource;
  }

  async loadImage(source: string | Blob | File): Promise<CompositorSource> {
    const id = this.generateId();

    let image: HTMLImageElement | ImageBitmap;

    if (typeof source !== 'string') {
      // Blob or File
      image = await createImageBitmap(source);
    } else {
      if (typeof Image === 'undefined') {
        // Worker context: fetch + createImageBitmap
        const response = await fetch(source);
        if (!response.ok) {
          throw new Error(`Failed to load image: ${source}`);
        }
        const blob = await response.blob();
        image = await createImageBitmap(blob);
      } else {
        // URL string in window context
        image = await new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error(`Failed to load image: ${source}`));
          img.crossOrigin = 'anonymous';
          img.src = source;
        });
      }
    }

    const imageSource = new ImageSource(id, { image });
    this.sources.set(id, imageSource);
    return imageSource;
  }

  async loadAudio(source: MediaSource, options: CompositorSourceOptions = {}): Promise<CompositorSource> {
    const id = options.id ?? this.generateId();

    // Create input from source
    const input = this.createInput(source);

    // Get audio tracks
    const audioTracks = await input.getAudioTracks();
    if (audioTracks.length === 0) {
      input.dispose();
      throw new Error('Source has no audio track');
    }
    const audioTrack = audioTracks[0];

    // Check if we can decode
    const canDecode = await audioTrack.canDecode();
    if (!canDecode) {
      input.dispose();
      throw new Error(`Cannot decode audio track with codec: ${audioTrack.codec}`);
    }

    // Get duration
    const duration = await audioTrack.computeDuration();

    // Create audio buffer sink for playback
    const audioBufferSink = new AudioBufferSink(audioTrack);

    const audioSource = new AudioOnlySource(
      id,
      {
        input,
        audioTrack,
        audioBufferSink,
      },
      duration
    );

    this.sources.set(id, audioSource);
    return audioSource;
  }

  private createInput(source: MediaSource): Input<Source> {
    let sourceObj: Source;

    if (source instanceof File || source instanceof Blob) {
      sourceObj = new BlobSource(source);
    } else if (source instanceof ArrayBuffer || source instanceof Uint8Array) {
      sourceObj = new BufferSource(source);
    } else if (typeof source === 'string' || source instanceof URL) {
      const url = source instanceof URL ? source.href : source;
      if (typeof window === 'undefined' && !url.startsWith('http')) {
        sourceObj = new FilePathSource(url);
      } else {
        sourceObj = new UrlSource(url);
      }
    } else if (typeof ReadableStream !== 'undefined' && source instanceof ReadableStream) {
      sourceObj = new ReadableStreamSource(source as ReadableStream<Uint8Array>);
    } else {
      throw new Error('Unsupported source type');
    }

    return new Input({
      source: sourceObj,
      formats: ALL_FORMATS,
    });
  }

  getSource(id: string): CompositorSource | undefined {
    return this.sources.get(id);
  }

  hasSource(id: string): boolean {
    return this.sources.has(id);
  }

  unloadSource(id: string): boolean {
    const source = this.sources.get(id);
    if (source) {
      source.dispose();
      this.sources.delete(id);
      return true;
    }
    return false;
  }

  getAllSources(): CompositorSource[] {
    return Array.from(this.sources.values());
  }

  clear(): void {
    for (const source of this.sources.values()) {
      source.dispose();
    }
    this.sources.clear();
  }

  dispose(): void {
    this.clear();
    if (this.audioContext && this.audioContext.state !== 'closed') {
      void this.audioContext.close();
    }
    this.audioContext = null;
  }
}
