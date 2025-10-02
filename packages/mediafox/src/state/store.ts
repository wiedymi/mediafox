import { RendererFactory } from '../playback/renderers';
import type {
  AudioTrackInfo,
  MediaInfo,
  PlayerState,
  PlayerStateData,
  SubtitleTrackInfo,
  TimeRange,
  VideoTrackInfo,
} from '../types';
import { isDeepEqual } from '../utils/equal';
import type { StateListener, StateStore, StateUnsubscribe } from './types';

export class Store implements StateStore {
  private state: PlayerStateData;
  private listeners: Set<StateListener> = new Set();
  private updateScheduled = false;
  private pendingUpdates: Partial<PlayerStateData> = {};

  constructor() {
    this.state = this.getInitialState();
  }

  private getInitialState(): PlayerStateData {
    // Detect the best available renderer
    const supportedRenderers = RendererFactory.getSupportedRenderers();
    const defaultRenderer = supportedRenderers[0] || 'canvas2d';

    return {
      state: 'idle',
      currentTime: 0,
      duration: 0,
      buffered: [],
      volume: 1,
      muted: false,
      playbackRate: 1,
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
      canPlay: false,
      canPlayThrough: false,
      isLive: false,
      rendererType: defaultRenderer,
    };
  }

  getState(): Readonly<PlayerStateData> {
    return Object.freeze({ ...this.state });
  }

  setState(updates: Partial<PlayerStateData>): void {
    Object.assign(this.pendingUpdates, updates);

    if (!this.updateScheduled) {
      this.updateScheduled = true;
      queueMicrotask(() => this.flushUpdates());
    }
  }

  private flushUpdates(): void {
    if (Object.keys(this.pendingUpdates).length === 0) {
      this.updateScheduled = false;
      return;
    }

    const previousState = { ...this.state };
    this.state = { ...this.state, ...this.pendingUpdates };
    this.pendingUpdates = {};
    this.updateScheduled = false;

    // Check if anything actually changed using deep-ish equality on updated keys only
    const changedKeys = Object.keys(this.pendingUpdates) as Array<keyof PlayerStateData>;
    const keysToCheck = changedKeys.length ? changedKeys : (Object.keys(this.state) as Array<keyof PlayerStateData>);
    const hasChanges = keysToCheck.some((key) => !isDeepEqual(this.state[key], previousState[key]));

    if (hasChanges) {
      this.notifyListeners();
    }
  }

  subscribe(listener: StateListener): StateUnsubscribe {
    this.listeners.add(listener);

    // Immediately call listener with current state
    listener(this.getState());

    return () => {
      this.listeners.delete(listener);
    };
  }

  reset(): void {
    this.state = this.getInitialState();
    this.pendingUpdates = {};
    this.updateScheduled = false;
    this.notifyListeners();
  }

  private notifyListeners(): void {
    const currentState = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(currentState);
      } catch (error) {
        console.error('Error in state listener:', error);
      }
    });
  }

  // Utility methods for common state updates
  updatePlaybackState(playing: boolean): void {
    const state: PlayerState = playing ? 'playing' : 'paused';
    this.setState({
      state,
      playing,
      paused: !playing,
      ended: false,
    });
  }

  updateTime(currentTime: number): void {
    this.setState({ currentTime });
  }

  updateDuration(duration: number): void {
    this.setState({ duration });
  }

  updateBuffered(buffered: TimeRange[]): void {
    this.setState({ buffered });
  }

  updateVolume(volume: number, muted: boolean): void {
    this.setState({ volume, muted });
  }

  updatePlaybackRate(playbackRate: number): void {
    this.setState({ playbackRate });
  }

  updateMediaInfo(mediaInfo: MediaInfo | null): void {
    this.setState({ mediaInfo });
  }

  updateTracks(
    videoTracks?: VideoTrackInfo[],
    audioTracks?: AudioTrackInfo[],
    subtitleTracks?: SubtitleTrackInfo[]
  ): void {
    const updates: Partial<PlayerStateData> = {};
    if (videoTracks) updates.videoTracks = videoTracks;
    if (audioTracks) updates.audioTracks = audioTracks;
    if (subtitleTracks) updates.subtitleTracks = subtitleTracks;
    this.setState(updates);
  }

  updateSelectedTracks(type: 'video' | 'audio' | 'subtitle', trackId: string | null): void {
    switch (type) {
      case 'video':
        this.setState({ selectedVideoTrack: trackId });
        break;
      case 'audio':
        this.setState({ selectedAudioTrack: trackId });
        break;
      case 'subtitle':
        this.setState({ selectedSubtitleTrack: trackId });
        break;
    }
  }

  updateError(error: Error | null): void {
    this.setState({
      error,
      state: error ? 'error' : this.state.state,
    });
  }

  updateSeekingState(seeking: boolean): void {
    this.setState({ seeking });
  }

  updateReadyState(canPlay: boolean, canPlayThrough: boolean): void {
    this.setState({
      canPlay,
      canPlayThrough,
      state: canPlay ? 'ready' : this.state.state,
    });
  }

  updateEndedState(ended: boolean): void {
    this.setState({
      ended,
      playing: false,
      paused: true,
      state: ended ? 'ended' : this.state.state,
    });
  }

  updateLoadingState(): void {
    this.setState({
      state: 'loading',
      playing: false,
      paused: true,
      ended: false,
      error: null,
    });
  }

  updateRendererType(rendererType: import('../types').RendererType): void {
    this.setState({ rendererType });
  }
}
