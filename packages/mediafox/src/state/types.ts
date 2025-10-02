import type { PlayerStateData } from '../types';

export type StateListener = (state: PlayerStateData) => void;
export type StateUnsubscribe = () => void;

export interface StateStore {
  getState(): Readonly<PlayerStateData>;
  setState(updates: Partial<PlayerStateData>): void;
  subscribe(listener: StateListener): StateUnsubscribe;
  reset(): void;
}
