# Store API

The Store class manages the internal state of the MediaFox player.

## State Structure

```typescript
interface PlayerStateData {
  state: PlayerState;
  currentTime: number;
  duration: number;
  buffered: TimeRange[];
  volume: number;
  muted: boolean;
  playbackRate: number;
  playing: boolean;
  paused: boolean;
  ended: boolean;
  seeking: boolean;
  error: Error | null;
  mediaInfo: MediaInfo | null;
  videoTracks: VideoTrackInfo[];
  audioTracks: AudioTrackInfo[];
  subtitleTracks: SubtitleTrackInfo[];
  selectedVideoTrack: string | null;
  selectedAudioTrack: string | null;
  selectedSubtitleTrack: string | null;
  canPlay: boolean;
  canPlayThrough: boolean;
}
```

## Methods

### getState()

Returns the current state as a read-only object.

```typescript
getState(): Readonly<PlayerStateData>;
```

### setState()

Updates the state with partial updates.

```typescript
setState(updates: Partial<PlayerStateData>): void;
```

### subscribe()

Subscribe to state changes.

```typescript
subscribe(listener: (state: PlayerStateData) => void): () => void;
```

Returns an unsubscribe function.

## Example Usage

```javascript
const store = new Store();

// Subscribe to state changes
const unsubscribe = store.subscribe((state) => {
  console.log('State changed:', state);
});

// Get current state
const state = store.getState();
console.log(`Current time: ${state.currentTime}`); // Current time: 0
console.log(`Volume: ${state.volume}`); // Volume: 1
console.log(`Playing: ${state.playing}`); // Playing: false
```

## State Updates

The store provides specialized methods for updating different aspects of state:

### Media State Updates

```javascript
// Update loading state
store.updateLoadingState();

// Update ready state
store.updateReadyState(canPlay, canPlayThrough);

// Update playback state
store.updatePlaybackState(isPlaying);

// Update time
store.updateTime(currentTime);

// Update duration
store.updateDuration(duration);

// Update ended state
store.updateEndedState(isEnded);
```

### Track Updates

```javascript
// Update track lists
store.updateTracks(videoTracks, audioTracks, subtitleTracks);

// Update selected tracks
store.updateSelectedTracks('video', trackId);
store.updateSelectedTracks('audio', trackId);
store.updateSelectedTracks('subtitle', trackId);
```

### Volume Updates

```javascript
// Update volume and mute state
store.updateVolume(volume, muted);

// Update playback rate
store.updatePlaybackRate(rate);
```

### Error Handling

```javascript
// Set error state
store.updateError(error);

// Clear error
store.updateError(null);
```

### Reset

```javascript
// Reset to initial state
store.reset();
```

## State Flow

The store follows a unidirectional data flow:

1. **Actions** - Methods that update state
2. **State** - Single source of truth
3. **Subscriptions** - Notify listeners of changes
4. **UI Updates** - React to state changes

This ensures predictable state management and easier debugging.