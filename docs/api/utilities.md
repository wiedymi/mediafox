# Utility Functions

XiaoMei provides several utility functions for common media-related operations.

## Time Utilities

### `formatTime(seconds, showMilliseconds?)`

Formats seconds into a human-readable time string.

<div class="method-signature">

```typescript
formatTime(seconds: number, showMilliseconds?: boolean): string
```

</div>

**Parameters:**
- `seconds`: Time in seconds
- `showMilliseconds`: Whether to show milliseconds (default: `false`)

**Returns:** Formatted time string

**Examples:**

```typescript
import { formatTime } from '@vivysub/xiaomei';

formatTime(65);        // "1:05"
formatTime(3665);      // "1:01:05"
formatTime(65.5, true); // "1:05.500"
formatTime(-30);       // "-0:30"
```

### `parseTime(timeString)`

Parses a time string into seconds.

<div class="method-signature">

```typescript
parseTime(timeString: string): number
```

</div>

**Parameters:**
- `timeString`: Time string in format "HH:MM:SS", "MM:SS", or "SS"

**Returns:** Time in seconds

**Examples:**

```typescript
import { parseTime } from '@vivysub/xiaomei';

parseTime("1:30");      // 90
parseTime("1:01:30");   // 3690
parseTime("45");        // 45
parseTime("2:30:45");   // 9045
```

### `timeToFrame(time, frameRate)`

Converts time to frame number.

<div class="method-signature">

```typescript
timeToFrame(time: number, frameRate: number): number
```

</div>

**Parameters:**
- `time`: Time in seconds
- `frameRate`: Frame rate in Hz

**Returns:** Frame number

**Example:**

```typescript
import { timeToFrame } from '@vivysub/xiaomei';

timeToFrame(1.5, 30);  // 45 (1.5 seconds at 30fps)
timeToFrame(2, 24);    // 48 (2 seconds at 24fps)
```

### `frameToTime(frame, frameRate)`

Converts frame number to time.

<div class="method-signature">

```typescript
frameToTime(frame: number, frameRate: number): number
```

</div>

**Parameters:**
- `frame`: Frame number
- `frameRate`: Frame rate in Hz

**Returns:** Time in seconds

**Example:**

```typescript
import { frameToTime } from '@vivysub/xiaomei';

frameToTime(45, 30);  // 1.5 (45 frames at 30fps)
frameToTime(48, 24);  // 2 (48 frames at 24fps)
```

## Range Utilities

### `clamp(value, min, max)`

Clamps a value between minimum and maximum bounds.

<div class="method-signature">

```typescript
clamp(value: number, min: number, max: number): number
```

</div>

**Parameters:**
- `value`: Value to clamp
- `min`: Minimum value
- `max`: Maximum value

**Returns:** Clamped value

**Example:**

```typescript
import { clamp } from '@vivysub/xiaomei';

clamp(5, 0, 10);   // 5
clamp(-5, 0, 10);  // 0
clamp(15, 0, 10);  // 10
```

### `timeRangesOverlap(range1, range2)`

Checks if two time ranges overlap.

<div class="method-signature">

```typescript
timeRangesOverlap(
  range1: { start: number; end: number },
  range2: { start: number; end: number }
): boolean
```

</div>

**Parameters:**
- `range1`: First time range
- `range2`: Second time range

**Returns:** `true` if ranges overlap

**Example:**

```typescript
import { timeRangesOverlap } from '@vivysub/xiaomei';

const range1 = { start: 0, end: 10 };
const range2 = { start: 5, end: 15 };
const range3 = { start: 15, end: 20 };

timeRangesOverlap(range1, range2);  // true
timeRangesOverlap(range1, range3);  // false
```

### `mergeTimeRanges(ranges)`

Merges overlapping time ranges into continuous segments.

<div class="method-signature">

```typescript
mergeTimeRanges(
  ranges: Array<{ start: number; end: number }>
): Array<{ start: number; end: number }>
```

</div>

**Parameters:**
- `ranges`: Array of time ranges to merge

**Returns:** Array of merged time ranges

**Example:**

```typescript
import { mergeTimeRanges } from '@vivysub/xiaomei';

const ranges = [
  { start: 0, end: 10 },
  { start: 5, end: 15 },
  { start: 20, end: 30 }
];

const merged = mergeTimeRanges(ranges);
// [{ start: 0, end: 15 }, { start: 20, end: 30 }]
```

### `totalBufferedDuration(ranges)`

Calculates the total duration of buffered ranges.

<div class="method-signature">

```typescript
totalBufferedDuration(
  ranges: Array<{ start: number; end: number }>
): number
```

</div>

**Parameters:**
- `ranges`: Array of time ranges

**Returns:** Total duration in seconds

**Example:**

```typescript
import { totalBufferedDuration } from '@vivysub/xiaomei';

const buffered = [
  { start: 0, end: 10 },
  { start: 15, end: 25 },
  { start: 30, end: 35 }
];

totalBufferedDuration(buffered);  // 25 seconds total
```

### `findBufferedRange(ranges, time)`

Finds the buffered range containing a specific time.

<div class="method-signature">

```typescript
findBufferedRange(
  ranges: Array<{ start: number; end: number }>,
  time: number
): { start: number; end: number } | null
```

</div>

**Parameters:**
- `ranges`: Array of time ranges
- `time`: Time to search for

**Returns:** The containing range or `null`

**Example:**

```typescript
import { findBufferedRange } from '@vivysub/xiaomei';

const buffered = [
  { start: 0, end: 10 },
  { start: 15, end: 25 }
];

findBufferedRange(buffered, 5);   // { start: 0, end: 10 }
findBufferedRange(buffered, 20);  // { start: 15, end: 25 }
findBufferedRange(buffered, 12);  // null
```

## Error Handling

### `XiaoMeiError`

Custom error class for player errors.

<div class="method-signature">

```typescript
class XiaoMeiError extends Error {
  code: ErrorCode;
  details?: any;

  constructor(code: ErrorCode, message: string, details?: any)
}
```

</div>

**Static Factory Methods:**

```typescript
// Create specific error types
XiaoMeiError.mediaNotSupported(message?, details?);
XiaoMeiError.mediaLoadFailed(message?, details?);
XiaoMeiError.decodeError(message?, details?);
XiaoMeiError.networkError(message?, details?);
XiaoMeiError.permissionDenied(message?, details?);
XiaoMeiError.playbackError(message?, details?);
XiaoMeiError.trackNotFound(message?, details?);
XiaoMeiError.invalidState(message?, details?);
XiaoMeiError.unknownError(message?, details?);
```

**Example:**

```typescript
import { XiaoMeiError, ErrorCode } from '@vivysub/xiaomei';

// Handle player errors
player.on('error', (error) => {
  switch (error.code) {
    case ErrorCode.MEDIA_NOT_SUPPORTED:
      console.error('Format not supported');
      break;
    case ErrorCode.NETWORK_ERROR:
      console.error('Network issue:', error.details);
      break;
    default:
      console.error('Player error:', error.message);
  }
});

// Create custom errors
throw XiaoMeiError.mediaNotSupported(
  'WebM format not supported in this browser'
);
```

### `ErrorCode`

Enumeration of error codes.

```typescript
enum ErrorCode {
  MEDIA_NOT_SUPPORTED = 'MEDIA_NOT_SUPPORTED',
  MEDIA_LOAD_FAILED = 'MEDIA_LOAD_FAILED',
  DECODE_ERROR = 'DECODE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  PLAYBACK_ERROR = 'PLAYBACK_ERROR',
  TRACK_NOT_FOUND = 'TRACK_NOT_FOUND',
  INVALID_STATE = 'INVALID_STATE',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}
```

### `wrapError(error, context)`

Wraps any error with additional context.

<div class="method-signature">

```typescript
wrapError(error: unknown, context: string): XiaoMeiError
```

</div>

**Parameters:**
- `error`: Original error
- `context`: Context string for the error

**Returns:** XiaoMeiError instance

**Example:**

```typescript
import { wrapError } from '@vivysub/xiaomei';

try {
  await loadMedia();
} catch (error) {
  throw wrapError(error, 'Failed to load media file');
}
```

## Component Classes

### `EventEmitter`

Type-safe event emitter implementation.

<div class="method-signature">

```typescript
class EventEmitter<EventMap extends Record&lt;string, any&gt;> {
  on<K extends keyof EventMap>(
    event: K,
    listener: (data: EventMap[K]) => void
  ): UnsubscribeFn

  once<K extends keyof EventMap>(
    event: K,
    listener: (data: EventMap[K]) => void
  ): UnsubscribeFn

  off<K extends keyof EventMap>(
    event: K,
    listener?: (data: EventMap[K]) => void
  ): void

  emit<K extends keyof EventMap>(
    event: K,
    data: EventMap[K]
  ): void
}
```

</div>

**Example:**

```typescript
import { EventEmitter } from '@vivysub/xiaomei';

// Define event map
type MyEvents = {
  connect: { id: string };
  disconnect: void;
  message: { text: string };
};

// Create emitter
const emitter = new EventEmitter<MyEvents>();

// Listen to events
emitter.on('connect', ({ id }) => {
  console.log(`Connected: ${id}`);
});

// Emit events
emitter.emit('connect', { id: '123' });
```

### `Store`

Reactive state store with subscriptions.

<div class="method-signature">

```typescript
class Store<T> {
  constructor(initialState: T)

  subscribe(listener: (state: T) => void): StateUnsubscribe

  getState(): T

  setState(updater: Partial&lt;T&gt; | ((state: T) => Partial&lt;T&gt;)): void
}
```

</div>

**Example:**

```typescript
import { Store } from '@vivysub/xiaomei';

// Create store
const store = new Store({
  count: 0,
  message: 'Hello'
});

// Subscribe to changes
const unsub = store.subscribe(state => {
  console.log(`Count: ${state.count}`);
});

// Update state
store.setState({ count: 1 });
store.setState(state => ({ count: state.count + 1 }));

// Get current state
const current = store.getState();

// Unsubscribe
unsub();
```

## Constants

### Quality Levels

Pre-defined quality constants from Mediabunny:

```typescript
import {
  QUALITY_VERY_LOW,
  QUALITY_LOW,
  QUALITY_MEDIUM,
  QUALITY_HIGH,
  QUALITY_VERY_HIGH
} from '@vivysub/xiaomei';

// Use for screenshot quality
player.screenshot({
  format: 'jpeg',
  quality: QUALITY_HIGH
});
```

### Version

Library version string:

```typescript
import { VERSION } from '@vivysub/xiaomei';

console.log(`XiaoMei version: ${VERSION}`);
```

## Usage Examples

### Progress Bar Implementation

```typescript
import { formatTime, clamp } from '@vivysub/xiaomei';

// Update progress bar
player.subscribe(state => {
  const percent = (state.currentTime / state.duration) * 100;
  progressBar.style.width = `${percent}%`;
  timeDisplay.textContent = formatTime(state.currentTime);
});

// Handle seeking
progressBar.addEventListener('click', (e) => {
  const rect = progressBar.getBoundingClientRect();
  const percent = clamp((e.clientX - rect.left) / rect.width, 0, 1);
  const time = percent * player.duration;
  player.seek(time);
});
```

### Buffering Display

```typescript
import { totalBufferedDuration, mergeTimeRanges } from '@vivysub/xiaomei';

player.subscribe(state => {
  const buffered = mergeTimeRanges(state.buffered);
  const totalBuffered = totalBufferedDuration(buffered);

  bufferedDisplay.textContent = `Buffered: ${formatTime(totalBuffered)}`;

  // Show buffered segments
  buffered.forEach(range => {
    const startPercent = (range.start / state.duration) * 100;
    const widthPercent = ((range.end - range.start) / state.duration) * 100;

    createBufferedSegment(startPercent, widthPercent);
  });
});
```

### Frame-Accurate Navigation

```typescript
import { timeToFrame, frameToTime } from '@vivysub/xiaomei';

const frameRate = 24; // Get from video track

// Navigate by frames
function nextFrame() {
  const currentFrame = timeToFrame(player.currentTime, frameRate);
  const nextTime = frameToTime(currentFrame + 1, frameRate);
  player.seek(nextTime, { accurate: true });
}

function previousFrame() {
  const currentFrame = timeToFrame(player.currentTime, frameRate);
  const prevTime = frameToTime(Math.max(0, currentFrame - 1), frameRate);
  player.seek(prevTime, { accurate: true });
}
```
