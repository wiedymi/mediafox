export class KeyedLock {
  private chains = new Map<string, Promise<unknown>>();

  async run<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.chains.get(key) ?? Promise.resolve();
    let resolveNext: (() => void) | undefined;
    const next = new Promise<void>((r) => {
      resolveNext = r;
    });
    this.chains.set(
      key,
      prev.then(() => next)
    );

    try {
      // Wait previous task for this key
      await prev;
      // Execute guarded function
      return await fn();
    } finally {
      // Release lock for next queued task
      resolveNext?.();
      // If the current next promise is the tail, we can optionally prune later
    }
  }
}
