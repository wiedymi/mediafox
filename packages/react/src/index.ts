// Re-export useful types from core
export type {
  AudioTrackInfo,
  LoadOptions,
  MediaInfo,
  MediaSource,
  PlayerEventListener,
  PlayerEventMap,
  PlayerOptions,
  PlayerState,
  PlayerStateData,
  QualityLevel,
  ScreenshotOptions,
  SeekOptions,
  SubtitleTrackInfo,
  TimeRange,
  VideoTrackInfo,
} from '@avplay/core';
export type { UseAVPlayOptions, UseAVPlayReturn } from './useAVPlay';
export { useAVPlay } from './useAVPlay';
