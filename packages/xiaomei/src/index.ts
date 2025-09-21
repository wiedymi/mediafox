// Main player class

// Re-export useful MediaBunny types
export type {
  AttachedImage,
  AudioCodec,
  AudioSample,
  EncodedPacket,
  InputFormat,
  MetadataTags,
  OutputFormat,
  Quality,
  SubtitleCodec,
  VideoCodec,
  VideoSample,
} from 'mediabunny';
// Re-export MediaBunny quality constants
export {
  QUALITY_HIGH,
  QUALITY_LOW,
  QUALITY_MEDIUM,
  QUALITY_VERY_HIGH,
  QUALITY_VERY_LOW,
} from 'mediabunny';
export type {
  AudioDecoderFunction,
  FallbackDecodeResult,
  FallbackDecoderConfig,
  VideoDecoderFunction,
} from './decoders/media-converter-decoder';
// Media converter for unsupported codecs
export { MediaConverterDecoder } from './decoders/media-converter-decoder';
// Event system
export { EventEmitter } from './events/emitter';
export type { TypedEventEmitter, UnsubscribeFn } from './events/types';
export { AudioManager } from './playback/audio';
// Playback components
export { PlaybackController } from './playback/controller';
export { VideoRenderer } from './playback/renderer';
// Source management
export { SourceManager } from './sources/manager';
export type { SourceInfo, SourceManagerOptions } from './sources/types';
// State management
export { Store } from './state/store';
export type { StateListener, StateStore, StateUnsubscribe } from './state/types';
// Track management
export { TrackManager } from './tracks/manager';
export type { TrackManagerState, TrackSelectionEvent } from './tracks/types';
// Types
export type {
  AudioTrackInfo,
  ChapterInfo,
  CuePoint,
  LoadOptions,
  MediaInfo,
  // Main types
  MediaSource,
  PerformanceMetrics,
  PlaybackMode,
  PlayerEventListener,
  PlayerEventMap,
  PlayerOptions,
  PlayerState,
  PlayerStateData,
  QualityLevel,
  ScreenshotOptions,
  SeekOptions,
  Subscription,
  SubtitleTrackInfo,
  TimeRange,
  VideoTrackInfo,
} from './types';
export {
  ErrorCode,
  wrapError,
  XiaoMeiError,
} from './utils/errors';
// Utilities
export {
  clamp,
  findBufferedRange,
  formatTime,
  frameToTime,
  mergeTimeRanges,
  parseTime,
  timeRangesOverlap,
  timeToFrame,
  totalBufferedDuration,
} from './utils/time';

export { XiaoMei } from './xiaomei';

// Version
export const VERSION = '0.1.0';

// Default export
import { XiaoMei } from './xiaomei';
export default XiaoMei;
