import type { Store } from '../state/store';
import type { AudioTrackInfo, MediaInfo, PlayerStateData, SubtitleTrackInfo, VideoTrackInfo } from '../types';

export class StateFacade {
  constructor(private readonly store: Store) {}

  // Reads
  getState(): Readonly<PlayerStateData> {
    return this.store.getState();
  }

  subscribe(listener: (state: PlayerStateData) => void): () => void {
    return this.store.subscribe(listener);
  }

  // Lifecycle
  reset(): void {
    this.store.reset();
  }

  applyInitial(volume: number, muted: boolean, playbackRate: number): void {
    this.store.setState({ volume, muted, playbackRate });
  }

  // Updates used by MediaFox
  updateLoadingState(): void {
    this.store.updateLoadingState();
  }

  updateReadyState(canPlay: boolean, canPlayThrough: boolean): void {
    this.store.updateReadyState(canPlay, canPlayThrough);
  }

  updatePlaybackState(playing: boolean): void {
    this.store.updatePlaybackState(playing);
  }

  updateSeekingState(seeking: boolean): void {
    this.store.updateSeekingState(seeking);
  }

  updateEndedState(ended: boolean): void {
    this.store.updateEndedState(ended);
  }

  updateTime(currentTime: number): void {
    this.store.updateTime(currentTime);
  }

  updateDuration(duration: number): void {
    this.store.updateDuration(duration);
  }

  updateVolume(volume: number, muted: boolean): void {
    this.store.updateVolume(volume, muted);
  }

  updatePlaybackRate(playbackRate: number): void {
    this.store.updatePlaybackRate(playbackRate);
  }

  updateMediaInfo(mediaInfo: MediaInfo | null): void {
    this.store.updateMediaInfo(mediaInfo);
  }

  updateTracks(
    videoTracks?: VideoTrackInfo[],
    audioTracks?: AudioTrackInfo[],
    subtitleTracks?: SubtitleTrackInfo[]
  ): void {
    this.store.updateTracks(videoTracks, audioTracks, subtitleTracks);
  }

  updateSelectedTracks(type: 'video' | 'audio' | 'subtitle', trackId: string | null): void {
    this.store.updateSelectedTracks(type, trackId);
  }

  updateError(error: Error | null): void {
    this.store.updateError(error);
  }

  updateRendererType(rendererType: import('../types').RendererType): void {
    this.store.updateRendererType(rendererType);
  }
}
