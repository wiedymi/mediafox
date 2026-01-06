import type { AudioCodec, MetadataTags, SubtitleCodec, VideoCodec } from 'mediabunny';

export type MediaSource = File | Blob | string | URL | ArrayBuffer | Uint8Array | ReadableStream<Uint8Array>;

export type PlayerState = 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'ended' | 'error';

export type PlaybackMode = 'normal' | 'loop' | 'loop-one';

export type Rotation = 0 | 90 | 180 | 270;

export type RendererType = 'webgpu' | 'webgl' | 'canvas2d';

export interface PlayerOptions {
  renderTarget?: HTMLCanvasElement | OffscreenCanvas;
  audioContext?: AudioContext;
  volume?: number;
  muted?: boolean;
  playbackRate?: number;
  autoplay?: boolean;
  preload?: 'none' | 'metadata' | 'auto';
  crossOrigin?: string;
  maxCacheSize?: number;
  renderer?: RendererType;
}

export interface MediaInfo {
  duration: number;
  format: string;
  mimeType: string;
  metadata: MetadataTags;
  hasVideo: boolean;
  hasAudio: boolean;
  hasSubtitles: boolean;
}

export interface VideoTrackInfo {
  id: string;
  codec: VideoCodec | null;
  language: string;
  name: string | null;
  width: number;
  height: number;
  frameRate: number;
  bitrate: number;
  rotation: 0 | 90 | 180 | 270;
  selected: boolean;
  decodable: boolean;
}

export interface AudioTrackInfo {
  id: string;
  codec: AudioCodec | null;
  language: string;
  name: string | null;
  channels: number;
  sampleRate: number;
  bitrate: number;
  selected: boolean;
  decodable: boolean;
}

export interface SubtitleTrackInfo {
  id: string;
  codec: SubtitleCodec | null;
  language: string;
  name: string | null;
  selected: boolean;
}

export interface PlayerStateData {
  state: PlayerState;
  currentTime: number;
  duration: number;
  buffered: TimeRange[];
  volume: number;
  muted: boolean;
  playbackRate: number;
  playing: boolean;
  paused: boolean;
  ended: boolean;
  seeking: boolean;
  waiting: boolean;
  error: Error | null;
  mediaInfo: MediaInfo | null;
  videoTracks: VideoTrackInfo[];
  audioTracks: AudioTrackInfo[];
  subtitleTracks: SubtitleTrackInfo[];
  selectedVideoTrack: string | null;
  selectedAudioTrack: string | null;
  selectedSubtitleTrack: string | null;
  canPlay: boolean;
  canPlayThrough: boolean;
  isLive: boolean;
  rendererType: RendererType;
  playlist: Playlist;
  currentPlaylistIndex: number | null;
  playlistMode: PlaylistMode;
  rotation: Rotation;
  displaySize: { width: number; height: number };
}

export interface TimeRange {
  start: number;
  end: number;
}

export interface SeekOptions {
  precise?: boolean;
  keyframe?: boolean;
}

export interface LoadOptions {
  autoplay?: boolean;
  startTime?: number;
  replacePlaylist?: boolean;
  /** Playlist item id for prefetch optimization */
  playlistItemId?: string;
}

export interface ScreenshotOptions {
  format?: 'png' | 'jpeg' | 'webp';
  quality?: number;
  width?: number;
  height?: number;
  fit?: 'fill' | 'contain' | 'cover';
}

export interface QualityLevel {
  id: string;
  label: string;
  width?: number;
  height?: number;
  bitrate?: number;
  codec?: VideoCodec;
  auto?: boolean;
}

export type PlayerEventMap = {
  statechange: PlayerStateData;
  loadstart: undefined;
  loadedmetadata: MediaInfo;
  loadeddata: undefined;
  canplay: undefined;
  canplaythrough: undefined;
  play: undefined;
  pause: undefined;
  playing: undefined;
  ended: undefined;
  timeupdate: { currentTime: number };
  durationchange: { duration: number };
  volumechange: { volume: number; muted: boolean };
  ratechange: { playbackRate: number };
  seeking: { currentTime: number };
  seeked: { currentTime: number };
  waiting: undefined;
  progress: { buffered: TimeRange[] };
  error: Error;
  warning: {
    type: string;
    message: string;
    error?: Error;
  };
  trackchange: {
    type: 'video' | 'audio' | 'subtitle';
    trackId: string | null;
  };
  qualitychange: {
    qualityId: string;
    auto: boolean;
  };
  resize: {
    width: number;
    height: number;
  };
  rotationchange: {
    rotation: Rotation;
    displaySize: { width: number; height: number };
  };
  rendererchange: RendererType;
  rendererfallback: {
    from: RendererType;
    to: RendererType;
  };
  playlistchange: { playlist: Playlist };
  playlistitemchange: { index: number; item: PlaylistItem; previousIndex?: number };
  playlistend: undefined;
  playlistadd: { item: PlaylistItem; index: number };
  playlistremove: { index: number };
  playlistitemerror: { index: number; error: Error };
};

export type PlayerEventListener<K extends keyof PlayerEventMap> = (event: PlayerEventMap[K]) => void;

export interface Subscription {
  unsubscribe(): void;
}

export interface PerformanceMetrics {
  droppedFrames: number;
  totalFrames: number;
  decodedFrames: number;
  currentFPS: number;
  averageFPS: number;
  bufferHealth: number;
  latency: number;
  bandwidth: number;
}

export interface ChapterInfo {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  thumbnail?: string;
}

export interface CuePoint {
  id: string;
  time: number;
  type: string;
  data?: unknown;
}

export type PlaylistMode = 'sequential' | 'manual' | 'repeat' | 'repeat-one' | null;

export interface PlaylistItem {
  id: string;
  mediaSource: MediaSource;
  title?: string;
  poster?: string;
  savedPosition: number | null;
  duration: number | null;
}

export type Playlist = PlaylistItem[];
