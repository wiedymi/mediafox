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
import type { CompositorSource, CompositorSourceOptions, SourceType } from './types';

interface VideoSourceData {
  input: Input<Source>;
  videoTrack: InputVideoTrack;
  canvasSink: CanvasSink;
  frameCache: Map<number, WrappedCanvas>;
}

interface AudioSourceData {
  input: Input<Source>;
  audioTrack: InputAudioTrack;
  audioContext: AudioContext;
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
  private cacheSize = 30; // Number of frames to cache

  constructor(id: string, data: VideoSourceData, duration: number, width: number, height: number) {
    this.id = id;
    this.data = data;
    this.duration = duration;
    this.width = width;
    this.height = height;
  }

  async getFrameAt(time: number): Promise<CanvasImageSource | null> {
    if (this.disposed) return null;

    // Check cache first
    const cacheKey = Math.floor(time * 1000); // Round to ms
    const cached = this.data.frameCache.get(cacheKey);
    if (cached) {
      return cached.canvas;
    }

    try {
      const frame = await this.data.canvasSink.getCanvas(time);
      if (!frame) return null;

      // Cache the frame
      if (this.data.frameCache.size >= this.cacheSize) {
        // Remove oldest entry
        const firstKey = this.data.frameCache.keys().next().value;
        if (firstKey !== undefined) {
          this.data.frameCache.delete(firstKey);
        }
      }
      this.data.frameCache.set(cacheKey, frame);

      return frame.canvas;
    } catch {
      return null;
    }
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
    const input = await this.createInput(source);

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

    // Create canvas sink for frame extraction
    const canvasSink = new CanvasSink(videoTrack, {
      poolSize: 2,
    });

    // Get duration
    const duration = await videoTrack.computeDuration();

    const videoSource = new VideoSource(
      id,
      {
        input,
        videoTrack,
        canvasSink,
        frameCache: new Map(),
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
      // URL string
      image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load image: ${source}`));
        img.crossOrigin = 'anonymous';
        img.src = source;
      });
    }

    const imageSource = new ImageSource(id, { image });
    this.sources.set(id, imageSource);
    return imageSource;
  }

  async loadAudio(source: MediaSource, options: CompositorSourceOptions = {}): Promise<CompositorSource> {
    const id = options.id ?? this.generateId();

    // Ensure we have an audio context
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    // Create input from source
    const input = await this.createInput(source);

    // Get audio tracks
    const audioTracks = await input.getAudioTracks();
    if (audioTracks.length === 0) {
      input.dispose();
      throw new Error('Source has no audio track');
    }
    const audioTrack = audioTracks[0];

    // Get duration
    const duration = await audioTrack.computeDuration();

    const audioSource = new AudioOnlySource(
      id,
      {
        input,
        audioTrack,
        audioContext: this.audioContext,
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
