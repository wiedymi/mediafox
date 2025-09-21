/**
 * Format seconds into a human-readable time string
 * @param seconds - Time in seconds
 * @param showMilliseconds - Whether to show milliseconds
 * @returns Formatted time string (e.g., "1:23:45" or "23:45.123")
 */
export function formatTime(seconds: number, showMilliseconds = false): string {
  const absSeconds = Math.abs(seconds);
  const hours = Math.floor(absSeconds / 3600);
  const minutes = Math.floor((absSeconds % 3600) / 60);
  const secs = Math.floor(absSeconds % 60);
  const ms = Math.floor((absSeconds % 1) * 1000);

  let result = '';

  if (seconds < 0) {
    result = '-';
  }

  if (hours > 0) {
    result += `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    result += `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  if (showMilliseconds) {
    result += `.${ms.toString().padStart(3, '0')}`;
  }

  return result;
}

/**
 * Parse a time string into seconds
 * @param timeString - Time string (e.g., "1:23:45", "23:45", "45")
 * @returns Time in seconds
 */
export function parseTime(timeString: string): number {
  const parts = timeString.trim().split(':').map(Number);

  if (parts.some(Number.isNaN)) {
    throw new Error('Invalid time string');
  }

  let seconds = 0;

  if (parts.length === 3) {
    // HH:MM:SS
    seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    // MM:SS
    seconds = parts[0] * 60 + parts[1];
  } else if (parts.length === 1) {
    // SS
    seconds = parts[0];
  } else {
    throw new Error('Invalid time format');
  }

  return seconds;
}

/**
 * Get frame number from time
 * @param time - Time in seconds
 * @param frameRate - Frame rate in Hz
 * @returns Frame number
 */
export function timeToFrame(time: number, frameRate: number): number {
  return Math.floor(time * frameRate);
}

/**
 * Get time from frame number
 * @param frame - Frame number
 * @param frameRate - Frame rate in Hz
 * @returns Time in seconds
 */
export function frameToTime(frame: number, frameRate: number): number {
  return frame / frameRate;
}

/**
 * Clamp a value between min and max
 * @param value - Value to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Clamped value
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Check if two time ranges overlap
 * @param range1 - First time range
 * @param range2 - Second time range
 * @returns True if ranges overlap
 */
export function timeRangesOverlap(
  range1: { start: number; end: number },
  range2: { start: number; end: number }
): boolean {
  return range1.start < range2.end && range2.start < range1.end;
}

/**
 * Merge overlapping time ranges
 * @param ranges - Array of time ranges
 * @returns Merged time ranges
 */
export function mergeTimeRanges(ranges: Array<{ start: number; end: number }>): Array<{ start: number; end: number }> {
  if (ranges.length === 0) return [];

  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged: Array<{ start: number; end: number }> = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    const current = sorted[i];

    if (current.start <= last.end) {
      last.end = Math.max(last.end, current.end);
    } else {
      merged.push(current);
    }
  }

  return merged;
}

/**
 * Calculate total buffered duration
 * @param ranges - Array of time ranges
 * @returns Total duration in seconds
 */
export function totalBufferedDuration(ranges: Array<{ start: number; end: number }>): number {
  return ranges.reduce((total, range) => total + (range.end - range.start), 0);
}

/**
 * Find the buffered range containing a specific time
 * @param ranges - Array of time ranges
 * @param time - Time to search for
 * @returns The containing range or null
 */
export function findBufferedRange(
  ranges: Array<{ start: number; end: number }>,
  time: number
): { start: number; end: number } | null {
  for (const range of ranges) {
    if (time >= range.start && time < range.end) {
      return range;
    }
  }
  return null;
}
