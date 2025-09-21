import type { EventEmitterOptions, TypedEventEmitter, UnsubscribeFn } from './types';

export class EventEmitter<EventMap extends Record<string, unknown>> implements TypedEventEmitter<EventMap> {
  private events: Map<keyof EventMap, Set<(data: EventMap[keyof EventMap]) => void>> = new Map();
  private maxListeners: number;
  private captureRejections: boolean;

  constructor(options: EventEmitterOptions = {}) {
    this.maxListeners = options.maxListeners ?? 10;
    this.captureRejections = options.captureRejections ?? false;
  }

  on<K extends keyof EventMap>(event: K, listener: (data: EventMap[K]) => void): UnsubscribeFn {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }

    const listeners = this.events.get(event);
    if (!listeners) return () => {};

    if (listeners.size >= this.maxListeners) {
      console.warn(
        `MaxListenersExceededWarning: Possible EventEmitter memory leak detected. ` +
          `${listeners.size} ${String(event)} listeners added. ` +
          `Use emitter.setMaxListeners() to increase limit`
      );
    }

    const typedListener = listener as (data: EventMap[keyof EventMap]) => void;
    listeners.add(typedListener);

    return () => {
      listeners.delete(typedListener);
    };
  }

  once<K extends keyof EventMap>(event: K, listener: (data: EventMap[K]) => void): UnsubscribeFn {
    const wrappedListener = (data: EventMap[K]) => {
      this.off(event, wrappedListener);
      listener(data);
    };

    return this.on(event, wrappedListener);
  }

  off<K extends keyof EventMap>(event: K, listener?: (data: EventMap[K]) => void): void {
    const listeners = this.events.get(event);
    if (!listeners) return;

    if (listener) {
      const typedListener = listener as (data: EventMap[keyof EventMap]) => void;
      listeners.delete(typedListener);
    } else {
      listeners.clear();
    }
  }

  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    const listeners = this.events.get(event);
    if (!listeners || listeners.size === 0) return;

    for (const listener of listeners) {
      try {
        const result = (listener as (d: EventMap[K]) => unknown)(data);
        if (this.captureRejections && isPromise(result)) {
          (result as Promise<unknown>).catch((err: unknown) => {
            if (this.events.has('error' as keyof EventMap)) {
              this.emit('error' as keyof EventMap, err as EventMap[keyof EventMap]);
            } else {
              // Re-throw unhandled listener errors to surface mistakes in dev
              throw err;
            }
          });
        }
      } catch (err) {
        if (this.captureRejections && this.events.has('error' as keyof EventMap)) {
          this.emit('error' as keyof EventMap, err as EventMap[keyof EventMap]);
        } else {
          throw err;
        }
      }
    }
  }

  removeAllListeners<K extends keyof EventMap>(event?: K): void {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }

  setMaxListeners(n: number): void {
    this.maxListeners = n;
  }

  getMaxListeners(): number {
    return this.maxListeners;
  }

  listeners<K extends keyof EventMap>(event: K): Array<(data: EventMap[K]) => void> {
    const listeners = this.events.get(event);
    return listeners ? (Array.from(listeners) as Array<(data: EventMap[K]) => void>) : [];
  }

  listenerCount<K extends keyof EventMap>(event: K): number {
    const listeners = this.events.get(event);
    return listeners ? listeners.size : 0;
  }

  eventNames(): Array<keyof EventMap> {
    return Array.from(this.events.keys());
  }
}

function isPromise(v: unknown): v is Promise<unknown> {
  if (!v || (typeof v !== 'object' && typeof v !== 'function')) return false;
  const obj = v as { then?: unknown; catch?: unknown };
  return typeof obj.then === 'function' && typeof obj.catch === 'function';
}
