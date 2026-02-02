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

interface VideoSourceData {
  input: Input<Source>;
  videoTrack: InputVideoTrack;
  canvasSink: CanvasSink;
  iterator: AsyncGenerator<WrappedCanvas, void, unknown> | null;
  currentFrame: WrappedCanvas | null;
  nextFrame: WrappedCanvas | null;
  lastRequestedTime: number;
  seekThresholdSeconds: number;
  lock: Promise<void>;
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

    // CanvasSink.getCanvas(timestamp) is optimized for random access, but calling it for every preview
    // frame turns playback into repeated seek+decode, which can stall/freeze on high-res sources.
    // Instead, keep a single iterator open and advance it as time increases.
    return this.withLock(async () => {
      if (this.disposed) return null;

      // Fast path: time is within current frame
      const current = this.data.currentFrame;
      if (current) {
        const end = current.timestamp + (current.duration || 0);
        if (time >= current.timestamp && (current.duration ? time < end : time === current.timestamp)) {
          this.data.lastRequestedTime = time;
          return current.canvas;
        }
      }

      const lastTime = this.data.lastRequestedTime;
      const needsSeek =
        this.data.iterator === null || time < lastTime || Math.abs(time - lastTime) > this.data.seekThresholdSeconds;

      if (needsSeek) {
        await this.restartIterator(time);
      }

      const advanced = await this.advanceToTime(time);
      this.data.lastRequestedTime = time;
      return advanced?.canvas ?? null;
    });
  }

  private async restartIterator(startTime: number): Promise<void> {
    // Close any existing iterator to release decoder resources.
    if (this.data.iterator) {
      try {
        await this.data.iterator.return();
      } catch {
        // ignore
      }
    }

    this.data.iterator = this.data.canvasSink.canvases(startTime);
    this.data.currentFrame = null;
    this.data.nextFrame = null;
  }

  private async advanceToTime(time: number): Promise<WrappedCanvas | null> {
    const iterator = this.data.iterator;
    if (!iterator) {
      // Shouldn't happen, but keep behavior safe.
      return this.data.canvasSink.getCanvas(time);
    }

    // Use a one-item lookahead buffer so we can stop once we pass the requested time.
    while (true) {
      const next = this.data.nextFrame;
      if (next) {
        if (next.timestamp > time) {
          return this.data.currentFrame;
        }
        this.data.currentFrame = next;
        this.data.nextFrame = null;
        continue;
      }

      let result: IteratorResult<WrappedCanvas, void>;
      try {
        result = await iterator.next();
      } catch {
        // Decoder/iterator failed; fall back to random access.
        try {
          return await this.data.canvasSink.getCanvas(time);
        } catch {
          return null;
        }
      }

      if (result.done) {
        return this.data.currentFrame;
      }

      this.data.nextFrame = result.value;
    }
  }

  private async withLock<T>(fn: () => Promise<T>): Promise<T> {
    // NOTE: Assignments inside Promise executors aren't tracked by TS control flow,
    // so keep `release` always-callable to avoid it narrowing to `never`.
    const previous = this.data.lock.catch(() => {
      // Ignore previous failures; keep the mutex usable.
    });
    let release: () => void = () => {};
    const current = new Promise<void>((resolve) => {
      release = () => {
        resolve();
      };
    });
    this.data.lock = previous.then(() => current);
    await previous;
    try {
      return await fn();
    } finally {
      release();
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
    // No-op: sequential iterator keeps bounded memory.
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.data.iterator) {
      try {
        void this.data.iterator.return();
      } catch {
        // ignore
      }
      this.data.iterator = null;
    }
    this.data.currentFrame = null;
    this.data.nextFrame = null;
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

    // If the caller is scrubbing aggressively, we restart decoding from the requested time.
    // Keeping this threshold low avoids iterating through huge gaps in a single request.
    const seekThresholdSeconds = 0.75;

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
        iterator: null,
        currentFrame: null,
        nextFrame: null,
        lastRequestedTime: -Infinity,
        seekThresholdSeconds,
        lock: Promise.resolve(),
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
