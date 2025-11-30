import type { PlayerStateData, Playlist, PlaylistItem, PlaylistMode } from '../types';

export type StateListener = (state: PlayerStateData) => void;
export type StateUnsubscribe = () => void;

export interface StateStore {
  getState(): Readonly<PlayerStateData>;
  setState(updates: Partial<PlayerStateData>): void;
  subscribe(listener: StateListener): StateUnsubscribe;
  reset(): void;
  // Playlist methods
  updatePlaylist(playlist: Playlist, currentIndex?: number | null): void;
  updateCurrentPlaylistIndex(index: number): void;
  updatePlaylistMode(mode: PlaylistMode): void;
  addToPlaylist(item: PlaylistItem, insertIndex?: number): void;
  removeFromPlaylist(removeIndex: number): void;
  clearPlaylist(): void;
}
