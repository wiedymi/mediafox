export type EventHandler<T = unknown> = (event: T) => void;

export interface EventEmitterOptions {
  maxListeners?: number;
  captureRejections?: boolean;
}

export type UnsubscribeFn = () => void;

export interface TypedEventEmitter<EventMap> {
  on<K extends keyof EventMap>(event: K, listener: (data: EventMap[K]) => void): UnsubscribeFn;

  once<K extends keyof EventMap>(event: K, listener: (data: EventMap[K]) => void): UnsubscribeFn;

  off<K extends keyof EventMap>(event: K, listener?: (data: EventMap[K]) => void): void;

  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void;

  removeAllListeners(event?: keyof EventMap): void;

  listenerCount(event: keyof EventMap): number;

  listeners<K extends keyof EventMap>(event: K): Array<(data: EventMap[K]) => void>;
}
