import type { PlaybackController } from '../playback/controller';
import { registerPrefetchedVideoData } from '../playback/renderer';
import type { PrefetchedTrackData, SourceManager } from '../sources/manager';
import type { TrackManager } from '../tracks/manager';
import type { LoadOptions, MediaInfo, MediaSource, PlayerEventMap } from '../types';
import { logger } from '../utils/logger';
import type { StateFacade } from './state-facade';
import type { TrackSwitcher } from './track-switcher';

type EmitFn = <K extends keyof PlayerEventMap>(event: K, data: PlayerEventMap[K]) => void;

export interface PlayerCoreDeps {
  state: StateFacade;
  sourceManager: SourceManager;
  trackManager: TrackManager;
  playbackController: PlaybackController;
  trackSwitcher: TrackSwitcher;
  emit: EmitFn;
}

export class PlayerCore {
  constructor(private readonly deps: PlayerCoreDeps) {}

  async load(source: MediaSource, options: LoadOptions = {}): Promise<void> {
    try {
      // Reset playback controller first to stop any active playback
      await this.deps.playbackController.reset();

      // Dispose previous source
      this.deps.sourceManager.disposeCurrent();

      // Reset state (but preserve playlist if not replacing)
      const currentState = this.deps.state.getState();
      if (!options.replacePlaylist) {
        // Keep playlist state
        this.deps.state.setState({
          ...currentState,
          state: 'loading',
          currentTime: options.startTime ?? 0,
          playing: false,
          paused: true,
          ended: false,
          seeking: false,
          error: null,
          mediaInfo: null,
          videoTracks: [],
          audioTracks: [],
          subtitleTracks: [],
          selectedVideoTrack: null,
          selectedAudioTrack: null,
          selectedSubtitleTrack: null,
          buffered: [],
          canPlay: false,
          canPlayThrough: false,
        });
      } else {
        this.deps.state.reset();
        this.deps.state.updateLoadingState();
      }
      this.deps.emit('loadstart', undefined);

      // Try to use prefetched source if available, otherwise create new
      let sourceInfo = options.playlistItemId
        ? this.deps.sourceManager.promoteQueuedSource(options.playlistItemId)
        : null;

      if (!sourceInfo) {
        sourceInfo = await this.deps.sourceManager.createSource(source);
      }

      const input = sourceInfo.input;
      if (!input) throw new Error('Failed to create input from source');

      // Load tracks
      await this.deps.trackManager.initialize(input);

      // Gather media info
      const [duration, format, mimeType, tags] = await Promise.all([
        input.computeDuration(),
        input.getFormat(),
        input.getMimeType(),
        input.getMetadataTags(),
      ]);

      const mediaInfo: MediaInfo = {
        duration,
        format: format.name,
        mimeType,
        metadata: tags,
        hasVideo: this.deps.trackManager.hasVideo(),
        hasAudio: this.deps.trackManager.hasAudio(),
        hasSubtitles: this.deps.trackManager.hasSubtitles(),
      };

      // Update state
      this.deps.state.updateDuration(duration);
      this.deps.state.updateMediaInfo(mediaInfo);
      this.deps.state.updateTracks(
        this.deps.trackManager.getVideoTracks(),
        this.deps.trackManager.getAudioTracks(),
        this.deps.trackManager.getSubtitleTracks()
      );
      this.deps.playbackController.setDuration(duration);

      // Setup initial tracks using switcher
      // Use prefetched tracks if available
      const prefetchedData = sourceInfo.prefetchedData as PrefetchedTrackData | undefined;
      const videoTrack = prefetchedData?.videoTrack ?? this.deps.trackManager.getPrimaryVideoTrack();
      const audioTrack = prefetchedData?.audioTrack ?? this.deps.trackManager.getPrimaryAudioTrack();

      // Register prefetched video data for the track (will be consumed internally by renderer)
      if (videoTrack && prefetchedData?.canvasSink && prefetchedData?.firstFrame) {
        registerPrefetchedVideoData(videoTrack, {
          canvasSink: prefetchedData.canvasSink,
          firstFrame: prefetchedData.firstFrame,
        });
      }

      let warningMessage = '';
      let videoSupported = false;
      let audioSupported = false;
      if (videoTrack || audioTrack) {
        const res = await this.deps.trackSwitcher.setupInitialTracks(videoTrack, audioTrack);
        warningMessage += res.warningMessage;
        videoSupported = res.videoSupported;
        audioSupported = res.audioSupported;
      }

      if (!videoSupported && !audioSupported) {
        if (!warningMessage) warningMessage = 'No audio or video track found.';
        throw new Error(warningMessage);
      }

      if (warningMessage && (videoSupported || audioSupported)) {
        this.deps.emit('warning', {
          type: 'codec-warning',
          message: warningMessage.trim(),
          error: undefined,
        });
      }

      // Ready state and events
      this.deps.state.updateReadyState(true, true);
      this.deps.emit('loadedmetadata', mediaInfo);
      this.deps.emit('loadeddata', undefined);
      this.deps.emit('canplay', undefined);
      this.deps.emit('canplaythrough', undefined);

      // Update playlist item duration if in a playlist
      this.updateCurrentPlaylistItemDuration(duration);

      if (options.autoplay) await this.play();
      if (options.startTime !== undefined) await this.seek(options.startTime);
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  async play(): Promise<void> {
    try {
      if (this.deps.state.getState().state === 'idle') {
        throw new Error('No media loaded');
      }
      await this.deps.playbackController.play();
      this.deps.state.updatePlaybackState(true);
      this.deps.emit('play', undefined);
      this.deps.emit('playing', undefined);
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  pause(): void {
    this.deps.playbackController.pause();
    this.deps.state.updatePlaybackState(false);
    this.deps.emit('pause', undefined);
  }

  async seek(time: number): Promise<void> {
    try {
      const s = this.deps.state.getState();
      if (s.state === 'idle') {
        throw new Error('No media loaded');
      }
      this.deps.state.updateSeekingState(true);
      this.deps.emit('seeking', { currentTime: time });
      await this.deps.playbackController.seek(time);
      this.deps.state.updateSeekingState(false);
      this.deps.state.updateTime(this.deps.playbackController.getCurrentTime());
      this.deps.emit('seeked', { currentTime: this.deps.playbackController.getCurrentTime() });
    } catch (error) {
      this.deps.state.updateSeekingState(false);
      this.handleError(error as Error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      this.pause();
      await this.seek(0);
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  private handleError(error: Error): void {
    this.deps.state.updateError(error);
    this.deps.emit('error', error);
    logger.error('Player error:', error);
  }

  private updateCurrentPlaylistItemDuration(duration: number): void {
    const state = this.deps.state.getState();
    const currentIndex = state.currentPlaylistIndex;
    if (currentIndex !== null && state.playlist.length > 0) {
      const playlist = [...state.playlist];
      const currentItem = playlist[currentIndex];
      if (currentItem) {
        playlist[currentIndex] = { ...currentItem, duration };
        this.deps.state.updatePlaylist(playlist, currentIndex);
      }
    }
  }
}
