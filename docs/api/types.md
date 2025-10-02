# TypeScript Types Documentation

MediaFox provides comprehensive TypeScript support with detailed type definitions for all APIs. This document covers all the available types and interfaces.

## Core Player Types

### PlayerOptions

```typescript
interface PlayerOptions {
  /** Canvas element for video rendering */
  renderTarget?: HTMLCanvasElement | OffscreenCanvas;

  /** Audio context for audio playback */
  audioContext?: AudioContext;

  /** Initial volume level (0-1) */
  volume?: number;

  /** Initial mute state */
  muted?: boolean;

  /** Initial playback speed (0.25-4) */
  playbackRate?: number;

  /** Auto-play when media loads */
  autoplay?: boolean;

  /** Preloading strategy */
  preload?: 'none' | 'metadata' | 'auto';

  /** CORS setting for cross-origin content */
  crossOrigin?: string;

  /** Maximum cache size for buffering */
  maxCacheSize?: number;
}
```

### PlayerStateData

```typescript
interface PlayerStateData {
  /** Overall player state */
  state: PlayerState;

  /** Current playback time in seconds */
  currentTime: number;

  /** Total duration in seconds */
  duration: number;

  /** Buffered time ranges */
  buffered: TimeRange[];

  /** Volume level (0-1) */
  volume: number;

  /** Mute state */
  muted: boolean;

  /** Playback speed */
  playbackRate: number;

  /** Whether media is actively playing */
  playing: boolean;

  /** Whether playback is paused */
  paused: boolean;

  /** Whether playback has ended */
  ended: boolean;

  /** Whether seeking is in progress */
  seeking: boolean;

  /** Current error, if any */
  error: Error | null;

  /** Media information */
  mediaInfo: MediaInfo | null;

  /** Available video tracks */
  videoTracks: VideoTrackInfo[];

  /** Available audio tracks */
  audioTracks: AudioTrackInfo[];

  /** Available subtitle tracks */
  subtitleTracks: SubtitleTrackInfo[];

  /** Currently selected video track ID */
  selectedVideoTrack: string | null;

  /** Currently selected audio track ID */
  selectedAudioTrack: string | null;

  /** Currently selected subtitle track ID */
  selectedSubtitleTrack: string | null;

  /** Whether playback can start */
  canPlay: boolean;

  /** Whether playback can continue without buffering */
  canPlayThrough: boolean;

  /** Whether this is a live stream */
  isLive: boolean;
}
```

### PlayerState Enum

```typescript
type PlayerState = 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'ended' | 'error';
```
  duration: number;
  buffered: TimeRanges | null;
  seekable: TimeRanges | null;

  /** Audio properties */
  volume: number;
  muted: boolean;

  /** Loading and seeking state */
  loading: boolean;
  seeking: boolean;
  readyState: ReadyState;

  /** Media dimensions */
  videoWidth: number;
  videoHeight: number;

  /** Playback configuration */
  playbackRate: number;

  /** Current track selections */
  currentVideoTrack: number;
  currentAudioTrack: number;

  /** Error state */
  error: Error | null;
}
```

### ReadyState

```typescript
enum ReadyState {
  /** No information available */
  HAVE_NOTHING = 0,

  /** Metadata loaded */
  HAVE_METADATA = 1,

  /** Current frame available */
  HAVE_CURRENT_DATA = 2,

  /** Future frames available */
  HAVE_FUTURE_DATA = 3,

  /** Enough data for continuous playback */
  HAVE_ENOUGH_DATA = 4
}
```

## Event Types

### PlayerEvents

```typescript
interface PlayerEvents {
  // Playback events
  play: () => void;
  pause: () => void;
  ended: () => void;
  seeking: () => void;
  seeked: () => void;
  timeupdate: (currentTime: number) => void;
  ratechange: (playbackRate: number) => void;

  // Loading events
  loadstart: () => void;
  loadedmetadata: () => void;
  loadeddata: () => void;
  canplay: () => void;
  canplaythrough: () => void;
  progress: (buffered: TimeRanges) => void;
  waiting: () => void;
  stalled: () => void;

  // Audio events
  volumechange: (volume: number, muted: boolean) => void;

  // Error events
  error: (error: Error) => void;

  // Track events
  tracksChanged: (tracks: TrackList) => void;
  trackChanged: (type: 'video' | 'audio', trackIndex: number) => void;
  trackSwitching: (type: 'video' | 'audio') => void;
  trackSwitched: (type: 'video' | 'audio', trackIndex: number) => void;

  // Source events
  sourceChanged: (source: string) => void;

  // Player lifecycle
  ready: () => void;
  destroy: () => void;

  // Frame events
  frameChanged: (frame: VideoFrame) => void;
  frameRendered: (timestamp: number) => void;

  // Memory events
  memoryUsage: (bytes: number) => void;

  // Custom events
  [key: string]: (...args: any[]) => void;
}
```

### EventEmitterEvents

```typescript
interface EventEmitterEvents {
  /** Fired when a new listener is added */
  newListener: (event: string, listener: Function) => void;

  /** Fired when a listener is removed */
  removeListener: (event: string, listener: Function) => void;

  /** Fired when max listeners limit is exceeded */
  maxListeners: (event: string, count: number) => void;
}
```

## Track Types

### TrackList

```typescript
interface TrackList {
  video: VideoTrack[];
  audio: AudioTrack[];
}
```

### VideoTrack

```typescript
interface VideoTrack {
  /** Unique track identifier */
  id: string;

  /** Human-readable track label */
  label?: string;

  /** Track language code */
  language?: string;

  /** Video dimensions */
  width: number;
  height: number;

  /** Frame rate in fps */
  frameRate: number;

  /** Bitrate in bits per second */
  bitrate?: number;

  /** Video codec information */
  codec: string;

  /** Whether track is currently enabled */
  enabled: boolean;

  /** Additional metadata */
  metadata?: Record&lt;string, any&gt;;
}
```

### AudioTrack

```typescript
interface AudioTrack {
  /** Unique track identifier */
  id: string;

  /** Human-readable track label */
  label?: string;

  /** Track language code */
  language?: string;

  /** Number of audio channels */
  channels: number;

  /** Sample rate in Hz */
  sampleRate: number;

  /** Bitrate in bits per second */
  bitrate?: number;

  /** Audio codec information */
  codec: string;

  /** Whether track is currently enabled */
  enabled: boolean;

  /** Additional metadata */
  metadata?: Record&lt;string, any&gt;;
}
```

## Source Types

### SourceInput

```typescript
type SourceInput =
  | string                    // URL
  | File                      // File object
  | Blob                      // Blob object
  | ArrayBuffer               // Raw buffer
  | MediaStream               // Live stream
  | MediaSource               // Media Source Extension
  | HTMLVideoElement          // Video element
  | SourceConfig;             // Complex source configuration
```

### SourceConfig

```typescript
interface SourceConfig {
  /** Source URL or data */
  src: string | File | Blob | ArrayBuffer | MediaStream;

  /** MIME type override */
  type?: string;

  /** Source metadata */
  metadata?: SourceMetadata;

  /** Loading options */
  options?: SourceOptions;
}
```

### SourceMetadata

```typescript
interface SourceMetadata {
  /** Media title */
  title?: string;

  /** Media duration (if known) */
  duration?: number;

  /** Media dimensions (if known) */
  width?: number;
  height?: number;

  /** Available tracks information */
  tracks?: Partial<TrackList>;

  /** Custom metadata */
  [key: string]: any;
}
```

### SourceOptions

```typescript
interface SourceOptions {
  /** Preload strategy */
  preload?: 'none' | 'metadata' | 'auto';

  /** CORS mode */
  crossOrigin?: 'anonymous' | 'use-credentials';

  /** Custom headers for requests */
  headers?: Record&lt;string, string&gt;;

  /** Timeout for loading operations */
  timeout?: number;

  /** Enable progressive loading */
  progressive?: boolean;

  /** Initial buffer size */
  bufferSize?: number;
}
```

## Store Types

### StoreOptions

```typescript
interface StoreOptions {
  /** Initial state */
  initialState?: Partial<PlayerState>;

  /** Enable batched updates */
  batchUpdates?: boolean;

  /** Batch update interval in ms */
  batchInterval?: number;

  /** Maximum number of subscribers */
  maxSubscribers?: number;
}
```

### StoreSubscriber

```typescript
type StoreSubscriber&lt;T&gt; = (state: T) => void;

interface StoreUnsubscribe {
  (): void;
}
```

## Error Types

### PlayerError

```typescript
class PlayerError extends Error {
  readonly code: PlayerErrorCode;
  readonly details?: any;
  readonly timestamp: number;

  constructor(
    code: PlayerErrorCode,
    message: string,
    details?: any
  );
}
```

### PlayerErrorCode

```typescript
enum PlayerErrorCode {
  /** Generic unknown error */
  UNKNOWN = 'UNKNOWN',

  /** Network-related errors */
  NETWORK_ERROR = 'NETWORK_ERROR',
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  NETWORK_ABORT = 'NETWORK_ABORT',

  /** Media format errors */
  MEDIA_FORMAT_ERROR = 'MEDIA_FORMAT_ERROR',
  MEDIA_DECODE_ERROR = 'MEDIA_DECODE_ERROR',
  MEDIA_UNSUPPORTED = 'MEDIA_UNSUPPORTED',

  /** Source errors */
  SOURCE_NOT_FOUND = 'SOURCE_NOT_FOUND',
  SOURCE_INVALID = 'SOURCE_INVALID',
  SOURCE_CORRUPTED = 'SOURCE_CORRUPTED',

  /** Player state errors */
  INVALID_STATE = 'INVALID_STATE',
  OPERATION_ABORTED = 'OPERATION_ABORTED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',

  /** Track errors */
  TRACK_NOT_FOUND = 'TRACK_NOT_FOUND',
  TRACK_SWITCH_FAILED = 'TRACK_SWITCH_FAILED',

  /** Memory errors */
  OUT_OF_MEMORY = 'OUT_OF_MEMORY',
  MEMORY_LIMIT_EXCEEDED = 'MEMORY_LIMIT_EXCEEDED'
}
```

### MediaError

```typescript
interface MediaError extends Error {
  readonly code: number;
  readonly MEDIA_ERR_ABORTED: 1;
  readonly MEDIA_ERR_NETWORK: 2;
  readonly MEDIA_ERR_DECODE: 3;
  readonly MEDIA_ERR_SRC_NOT_SUPPORTED: 4;
}
```

## Plugin Types

### Plugin

```typescript
interface Plugin {
  /** Plugin name */
  readonly name: string;

  /** Plugin version */
  readonly version: string;

  /** Initialize the plugin */
  init(player: MediaFox, options?: any): void | Promise<void>;

  /** Cleanup when plugin is destroyed */
  destroy?(): void | Promise<void>;
}
```

### PluginOptions

```typescript
interface PluginOptions {
  [key: string]: any;
}
```

## Utility Types

### TimeRanges

```typescript
interface TimeRanges {
  readonly length: number;
  start(index: number): number;
  end(index: number): number;
}
```

### CanvasPool

```typescript
interface CanvasPool {
  getCanvas(width: number, height: number): HTMLCanvasElement;
  returnCanvas(canvas: HTMLCanvasElement): void;
  clear(): void;
}
```

### VideoFrame

```typescript
interface VideoFrame {
  readonly displayWidth: number;
  readonly displayHeight: number;
  readonly duration: number;
  readonly timestamp: number;
  readonly format: string;

  close(): void;
  clone(): VideoFrame;
}
```

### AudioBuffer

```typescript
interface AudioBuffer {
  readonly length: number;
  readonly duration: number;
  readonly sampleRate: number;
  readonly numberOfChannels: number;

  getChannelData(channel: number): Float32Array;
  copyFromChannel(
    destination: Float32Array,
    channelNumber: number,
    startInChannel?: number
  ): void;
  copyToChannel(
    source: Float32Array,
    channelNumber: number,
    startInChannel?: number
  ): void;
}
```

## Generic Types

### EventMap

```typescript
type EventMap = Record<string, (...args: any[]) => void>;
```

### Listener

```typescript
type Listener<T extends EventMap, K extends keyof T> = T[K];
```

### EventNames

```typescript
type EventNames<T extends EventMap> = keyof T;
```

### Parameters

```typescript
type EventParameters<
  T extends EventMap,
  K extends keyof T
> = Parameters<T[K]>;
```

## Type Guards

### Source Type Guards

```typescript
function isFile(source: SourceInput): source is File;
function isBlob(source: SourceInput): source is Blob;
function isMediaStream(source: SourceInput): source is MediaStream;
function isURL(source: SourceInput): source is string;
function isSourceConfig(source: SourceInput): source is SourceConfig;
```

### Error Type Guards

```typescript
function isPlayerError(error: Error): error is PlayerError;
function isMediaError(error: Error): error is MediaError;
function isNetworkError(error: Error): boolean;
function isDecodeError(error: Error): boolean;
```

### Track Type Guards

```typescript
function isVideoTrack(track: VideoTrack | AudioTrack): track is VideoTrack;
function isAudioTrack(track: VideoTrack | AudioTrack): track is AudioTrack;
```

## Constants

### Default Values

```typescript
const DEFAULT_PLAYER_OPTIONS: Required<Omit<PlayerOptions, 'canvas'>> = {
  autoplay: false,
  muted: false,
  volume: 1,
  playbackRate: 1,
  frameBufferSize: 10,
  maxMemoryUsage: 100 * 1024 * 1024, // 100MB
  canvasPool: undefined,
  debug: false
};

const DEFAULT_STORE_OPTIONS: Required<StoreOptions> = {
  initialState: {},
  batchUpdates: true,
  batchInterval: 16, // ~60fps
  maxSubscribers: 100
};
```

### Event Names

```typescript
const PLAYER_EVENTS = [
  'play', 'pause', 'ended', 'seeking', 'seeked', 'timeupdate',
  'ratechange', 'loadstart', 'loadedmetadata', 'loadeddata',
  'canplay', 'canplaythrough', 'progress', 'waiting', 'stalled',
  'volumechange', 'error', 'tracksChanged', 'trackChanged',
  'sourceChanged', 'ready', 'destroy'
] as const;

type PlayerEventName = typeof PLAYER_EVENTS[number];
```

## Module Declarations

### Window Extensions

```typescript
declare global {
  interface Window {
    MediaFox: typeof MediaFox;
  }
}
```

### Canvas Extensions

```typescript
declare module 'html-canvas-element' {
  interface HTMLCanvasElement {
    mediafoxPlayer?: MediaFox;
  }
}
```

This comprehensive type system provides full IntelliSense support and compile-time safety when using MediaFox with TypeScript.