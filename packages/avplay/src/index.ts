// Main player class

// Re-export useful Mediabunny types
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
export { AVPlay } from './avplay';
// Event system
export { EventEmitter } from './events/emitter';
export type { TypedEventEmitter, UnsubscribeFn } from './events/types';
export { AudioManager } from './playback/audio';
// Playback components
export { PlaybackController } from './playback/controller';
export { VideoRenderer } from './playback/renderer';
export type { IRenderer, RendererCreationResult } from './playback/renderers';
export { RendererFactory } from './playback/renderers';
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
  RendererType,
  ScreenshotOptions,
  SeekOptions,
  Subscription,
  SubtitleTrackInfo,
  TimeRange,
  VideoTrackInfo,
} from './types';
export {
  AVPlayError,
  ErrorCode,
  wrapError,
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

// Version
export const VERSION = '0.1.0';

// Default export
import { AVPlay } from './avplay';
export default AVPlay;
