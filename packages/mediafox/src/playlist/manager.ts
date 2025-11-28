import type { StateStore } from '../state/types';
import type { TypedEventEmitter } from '../events/types';
import type { SourceManager } from '../sources/manager';
import type { MediaSource, PlayerEventMap, Playlist, PlaylistItem, PlaylistMode } from '../types';

// Simple ID generator (no uuid dep for now)
function generateId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).substr(2);
}

interface PlaylistItemConfig {
  mediaSource: MediaSource;
  title?: string;
  poster?: string;
}

export class PlaylistManager {
  private store: StateStore;
  private emitter: TypedEventEmitter<PlayerEventMap>;
  private switchSource?: (item: PlaylistItem, autoplay: boolean) => Promise<void>;
  private sourceManager?: SourceManager;

  constructor(
    store: StateStore,
    emitter: TypedEventEmitter<PlayerEventMap>,
    switchSource?: (item: PlaylistItem, autoplay: boolean) => Promise<void>,
    sourceManager?: SourceManager
  ) {
    this.store = store;
    this.emitter = emitter;
    this.switchSource = switchSource;
    this.sourceManager = sourceManager;
  }

  async loadPlaylist(items: Array<MediaSource | PlaylistItemConfig>): Promise<void> {
    const playlist: Playlist = items.map((item) => {
      // Check if it's a PlaylistItemConfig (has mediaSource property)
      if (item && typeof item === 'object' && 'mediaSource' in item) {
        // PlaylistItemConfig
        return {
          id: generateId(),
          mediaSource: item.mediaSource,
          title: item.title,
          poster: item.poster,
          savedPosition: null,
          duration: null,
        } as PlaylistItem;
      } else {
        // MediaSource
        return {
          id: generateId(),
          mediaSource: item as MediaSource,
          savedPosition: null,
          duration: null,
        } as PlaylistItem;
      }
    });

    this.store.updatePlaylist(playlist, playlist.length > 0 ? 0 : null);
    this.emitter.emit('playlistchange', { playlist });

    if (playlist.length > 0 && this.switchSource) {
      await this.switchSource(playlist[0], false);
    }
  }

  addToPlaylist(itemInput: MediaSource | PlaylistItemConfig, index?: number): void {
    const item: PlaylistItem = this.createPlaylistItem(itemInput);

    this.store.addToPlaylist(item, index);
    this.emitter.emit('playlistadd', { item, index: index ?? this.store.getState().playlist.length - 1 });
  }

  async removeFromPlaylist(index: number): Promise<void> {
    const state = this.store.getState();
    const currentIndex = state.currentPlaylistIndex;
    const wasPlaying = state.playing;

    this.store.removeFromPlaylist(index);
    this.emitter.emit('playlistremove', { index });

    // Dispose if queued (for removed item)
    this.sourceManager?.disposeQueued(state.playlist[index]?.id || '');

    const newState = this.store.getState();
    const newCurrentIndex = newState.currentPlaylistIndex;

    if (currentIndex === index && newCurrentIndex !== null && newCurrentIndex !== currentIndex && this.switchSource) {
      const newItem = newState.playlist[newCurrentIndex];
      try {
        await this.switchSource(newItem, wasPlaying);
      } catch (error) {
        this.emitter.emit('playlistitemerror', { index: newCurrentIndex, error: error as Error });
      }
    }
  }

  clearPlaylist(): void {
    this.store.clearPlaylist();
    this.emitter.emit('playlistchange', { playlist: [] });
    // Dispose all sources
    this.sourceManager?.disposeAll();
  }

  async next(): Promise<void> {
    const state = this.store.getState();
    const currentIndex = state.currentPlaylistIndex ?? 0;
    const playlist = state.playlist;
    const mode = state.playlistMode;

    let newIndex: number | null = null;

    if (mode === 'repeat-one') {
      newIndex = currentIndex; // Stay on current for repeat-one
    } else if (mode === 'sequential' || mode === 'repeat') {
      if (currentIndex < playlist.length - 1) {
        newIndex = currentIndex + 1;
      } else if (mode === 'repeat') {
        newIndex = 0;
      } else {
        this.emitter.emit('playlistend', undefined);
        return;
      }
    } else {
      // manual or null, just next if possible
      if (currentIndex < playlist.length - 1) {
        newIndex = currentIndex + 1;
      }
    }

    if (newIndex !== null) {
      await this.switchTo(newIndex);
    }
  }

  async prev(): Promise<void> {
    const state = this.store.getState();
    const currentIndex = state.currentPlaylistIndex ?? 0;

    if (currentIndex > 0) {
      await this.switchTo(currentIndex - 1);
    }
  }

  async jumpTo(index: number): Promise<void> {
    const state = this.store.getState();
    const playlist = state.playlist;

    if (index >= 0 && index < playlist.length) {
      await this.switchTo(index);
    } else if (index >= playlist.length) {
      // end
      this.emitter.emit('playlistend', undefined);
    }
  }

  setMode(mode: PlaylistMode): void {
    const validModes: PlaylistMode[] = ['sequential', 'manual', 'repeat', 'repeat-one', null];
    if (!validModes.includes(mode)) {
      throw new Error(`Invalid playlist mode: ${mode}. Valid modes: ${validModes.filter(m => m !== null).join(', ')}, null`);
    }
    this.store.updatePlaylistMode(mode);
  }

  private async switchTo(index: number): Promise<void> {
    const state = this.store.getState();
    const previousIndex = state.currentPlaylistIndex;
    const wasPlaying = state.playing;

    const newPlaylist = [...state.playlist];
    if (previousIndex !== null && previousIndex !== index) {
      const oldItem = newPlaylist[previousIndex];
      newPlaylist[previousIndex] = { ...oldItem, savedPosition: state.currentTime };
      // Dispose old source if queued (but since lazy, only current is loaded)
      // sourceManager.disposeQueued(oldItem.id); // If preloaded
    }

    this.store.updatePlaylist(newPlaylist, index);

    const item = newPlaylist[index];

    this.emitter.emit('playlistitemchange', {
      index,
      item,
      previousIndex: previousIndex ?? undefined,
    });

    if (this.switchSource) {
      await this.switchSource(item, wasPlaying);
    }

    // Optional prefetch next if sequential
    const mode = state.playlistMode;
    if (mode === 'sequential' && index < newPlaylist.length - 1) {
      const nextItem = newPlaylist[index + 1];
      // If sourceManager available, preload
      this.sourceManager?.preloadSource(nextItem.mediaSource, nextItem.id);
    }
  }

  private createPlaylistItem(input: MediaSource | PlaylistItemConfig): PlaylistItem {
    // Check if it's a PlaylistItemConfig (has mediaSource property)
    if (input && typeof input === 'object' && 'mediaSource' in input) {
      // PlaylistItemConfig
      return {
        id: generateId(),
        mediaSource: input.mediaSource,
        title: input.title,
        poster: input.poster,
        savedPosition: null,
        duration: null,
      };
    } else {
      // MediaSource
      return {
        id: generateId(),
        mediaSource: input as MediaSource,
        savedPosition: null,
        duration: null,
      };
    }
  }

  // Getters
  get playlist(): Playlist {
    return this.store.getState().playlist;
  }

  get currentIndex(): number | null {
    return this.store.getState().currentPlaylistIndex;
  }

  get currentItem(): PlaylistItem | null {
    const index = this.currentIndex;
    return index !== null ? this.playlist[index] : null;
  }

  get mode(): PlaylistMode {
    return this.store.getState().playlistMode;
  }

  dispose(): void {
    // Clear any queued sources
    if (this.sourceManager) {
      // The sourceManager will be disposed by the main MediaFox class
      // Just clear any playlist-specific references
      this.sourceManager = undefined;
    }
    this.switchSource = undefined;
  }
}
