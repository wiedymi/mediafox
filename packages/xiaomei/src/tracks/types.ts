import type { AudioTrackInfo, SubtitleTrackInfo, VideoTrackInfo } from '../types';

export type SubtitleTrackFormat = 'ass' | 'srt' | 'vtt';

export interface SubtitleTrackResource {
  format: SubtitleTrackFormat;
  content?: string;
  url?: string;
  fonts?: Array<string | Uint8Array>;
}

export interface SubtitleTrackRegistration {
  info: SubtitleTrackInfo;
  resolver: () => Promise<SubtitleTrackResource>;
}

export interface TrackManagerState {
  videoTracks: VideoTrackInfo[];
  audioTracks: AudioTrackInfo[];
  subtitleTracks: SubtitleTrackInfo[];
  selectedVideoTrack: string | null;
  selectedAudioTrack: string | null;
  selectedSubtitleTrack: string | null;
}

export interface TrackSelectionEvent {
  type: 'video' | 'audio' | 'subtitle';
  previousTrackId: string | null;
  newTrackId: string | null;
}
