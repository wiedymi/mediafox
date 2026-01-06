import { RendererFactory } from '../playback/renderers';
import type { PluginManager } from '../plugins/manager';
import type {
  AudioTrackInfo,
  MediaInfo,
  PlayerState,
  PlayerStateData,
  Playlist,
  PlaylistItem,
  PlaylistMode,
  Rotation,
  SubtitleTrackInfo,
  TimeRange,
  VideoTrackInfo,
} from '../types';
import { isDeepEqual } from '../utils/equal';
import type { StateListener, StateStore, StateUnsubscribe } from './types';

export class Store implements StateStore {
  private state: PlayerStateData;
  private previousState: PlayerStateData;
  private listeners: Set<StateListener> = new Set();
  private updateScheduled = false;
  private pendingUpdates: Partial<PlayerStateData> = {};
  private pendingKeys: Array<keyof PlayerStateData> = [];
  private pluginManager: PluginManager | null = null;
  // Pre-allocated array for listener iteration to avoid Set iterator allocation
  private listenerCache: StateListener[] = [];

  constructor() {
    this.state = this.getInitialState();
    this.previousState = { ...this.state };
  }

  setPluginManager(pluginManager: PluginManager): void {
    this.pluginManager = pluginManager;
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
      waiting: false,
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
      playlist: [],
      currentPlaylistIndex: null,
      playlistMode: null,
      rotation: 0,
      displaySize: { width: 0, height: 0 },
    };
  }

  getState(): Readonly<PlayerStateData> {
    // Return direct reference - callers should treat as immutable
    // Avoids allocation on every call (was: Object.freeze({ ...this.state }))
    return this.state;
  }

  setState(updates: Partial<PlayerStateData>): void {
    // Execute beforeStateUpdate hooks
    if (this.pluginManager) {
      const result = this.pluginManager.executeBeforeStateUpdate(updates);
      if (result === null) return; // Cancelled
      updates = result;
    }

    // Track keys being updated to avoid Object.keys() allocation in flushUpdates
    const keys = Object.keys(updates) as Array<keyof PlayerStateData>;
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (this.pendingUpdates[key] === undefined) {
        this.pendingKeys.push(key);
      }
      this.setPendingValue(key, updates[key]);
    }

    if (!this.updateScheduled) {
      this.updateScheduled = true;
      queueMicrotask(() => this.flushUpdates());
    }
  }

  /** Type-safe helper to set a single pending update value */
  private setPendingValue<K extends keyof PlayerStateData>(key: K, value: PlayerStateData[K] | undefined): void {
    this.pendingUpdates[key] = value;
  }

  private flushUpdates(): void {
    const keysToCheck = this.pendingKeys;
    if (keysToCheck.length === 0) {
      this.updateScheduled = false;
      return;
    }

    // Check for changes BEFORE applying updates (compare pending vs current)
    let hasChanges = false;
    for (let i = 0; i < keysToCheck.length; i++) {
      const key = keysToCheck[i];
      if (!isDeepEqual(this.pendingUpdates[key], this.state[key])) {
        hasChanges = true;
        break;
      }
    }

    // Copy current values to previousState only for changed keys (avoids full object spread)
    // Then apply pending updates directly to state
    for (let i = 0; i < keysToCheck.length; i++) {
      const key = keysToCheck[i];
      this.copyStateKey(key);
    }
    // Clear pending updates by reassigning empty object (faster than delete per key)
    this.pendingUpdates = {};

    // Reset tracking
    this.pendingKeys.length = 0;
    this.updateScheduled = false;

    if (hasChanges) {
      this.notifyListeners();

      // Execute onStateChange hooks
      if (this.pluginManager) {
        this.pluginManager.executeOnStateChange(this.state, this.previousState);
      }
    }
  }

  /** Type-safe helper to copy a single key from state to previousState and apply pending update */
  private copyStateKey<K extends keyof PlayerStateData>(key: K): void {
    this.previousState[key] = this.state[key];
    if (key in this.pendingUpdates) {
      this.state[key] = this.pendingUpdates[key] as PlayerStateData[K];
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
    this.pendingKeys.length = 0;
    this.updateScheduled = false;
    this.notifyListeners();
  }

  private notifyListeners(): void {
    const currentState = this.state;
    // Copy listeners to cache array to avoid Set iterator allocation
    // and allow listeners to unsubscribe during iteration
    const cache = this.listenerCache;
    cache.length = 0;
    for (const listener of this.listeners) {
      cache.push(listener);
    }
    // Use indexed for loop (faster than forEach by ~8x)
    for (let i = 0; i < cache.length; i++) {
      try {
        cache[i](currentState);
      } catch (error) {
        console.error('Error in state listener:', error);
      }
    }
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

  updateWaitingState(waiting: boolean): void {
    this.setState({ waiting });
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

  updateRotation(rotation: Rotation, displaySize: { width: number; height: number }): void {
    this.setState({ rotation, displaySize });
  }

  updatePlaylist(playlist: Playlist, currentIndex: number | null = null): void {
    this.setState({ playlist, currentPlaylistIndex: currentIndex });
  }

  updateCurrentPlaylistIndex(index: number): void {
    this.setState({ currentPlaylistIndex: index });
  }

  updatePlaylistMode(mode: PlaylistMode): void {
    this.setState({ playlistMode: mode });
  }

  addToPlaylist(item: PlaylistItem, insertIndex?: number): void {
    const currentPlaylist = this.state.playlist;
    let newPlaylist: Playlist;
    let newCurrentIndex = this.state.currentPlaylistIndex;

    if (insertIndex !== undefined && insertIndex >= 0 && insertIndex <= currentPlaylist.length) {
      newPlaylist = [...currentPlaylist.slice(0, insertIndex), item, ...currentPlaylist.slice(insertIndex)];
      if (newCurrentIndex !== null && newCurrentIndex >= insertIndex) {
        newCurrentIndex += 1;
      }
    } else {
      newPlaylist = [...currentPlaylist, item];
    }

    this.setState({ playlist: newPlaylist, currentPlaylistIndex: newCurrentIndex });
  }

  removeFromPlaylist(removeIndex: number): void {
    const currentPlaylist = this.state.playlist;
    if (removeIndex < 0 || removeIndex >= currentPlaylist.length) {
      return;
    }

    const newPlaylist = currentPlaylist.filter((_, i) => i !== removeIndex);
    let newCurrentIndex = this.state.currentPlaylistIndex;

    if (newCurrentIndex === removeIndex) {
      newCurrentIndex = newPlaylist.length > 0 ? 0 : null;
    } else if (newCurrentIndex !== null && newCurrentIndex > removeIndex) {
      newCurrentIndex -= 1;
    }

    if (newPlaylist.length === 0) {
      this.setState({
        playlist: newPlaylist,
        currentPlaylistIndex: null,
        state: 'idle',
        currentTime: 0,
        duration: 0,
        mediaInfo: null,
        videoTracks: [],
        audioTracks: [],
        subtitleTracks: [],
        selectedVideoTrack: null,
        selectedAudioTrack: null,
        selectedSubtitleTrack: null,
      });
    } else {
      this.setState({ playlist: newPlaylist, currentPlaylistIndex: newCurrentIndex });
    }
  }

  clearPlaylist(): void {
    this.setState({
      playlist: [],
      currentPlaylistIndex: null,
      state: 'idle',
      currentTime: 0,
      duration: 0,
      mediaInfo: null,
      videoTracks: [],
      audioTracks: [],
      subtitleTracks: [],
      selectedVideoTrack: null,
      selectedAudioTrack: null,
      selectedSubtitleTrack: null,
    });
  }
}
