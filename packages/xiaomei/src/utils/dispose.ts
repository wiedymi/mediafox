/**
 * Safely calls return() on an AsyncGenerator if present, swallowing errors.
 * Used to ensure iterators are properly cleaned up without leaking promises.
 */
export function safeAsyncReturn<T, TReturn = unknown, TNext = unknown>(
  iterator: AsyncGenerator<T, TReturn, TNext> | null | undefined
): void {
  try {
    // Intentionally do not await inside non-async dispose paths
    // Some TS lib dom typings require a value argument
    void iterator?.return?.(undefined as unknown as TReturn);
  } catch {
    // Ignore iterator return errors during cleanup
  }
}

/**
 * Clear interval/RAF ids safely.
 */
export function safeClearInterval(id: number | null): null {
  if (id !== null) clearInterval(id);
  return null;
}

export function safeCancelAnimationFrame(id: number | null): null {
  if (id !== null) cancelAnimationFrame(id);
  return null;
}
