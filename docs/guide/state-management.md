# State Management Guide

XiaoMei uses a reactive state management system that provides real-time updates about the player's current state. This guide explains how to work with the state system effectively.

## Understanding the State System

XiaoMei's state management is built around a reactive store that emits updates whenever the player state changes. The state is immutable and batched for performance.

### State Structure

```typescript
interface PlayerState {
  // Playback state
  playing: boolean;
  paused: boolean;
  ended: boolean;

  // Time-related state
  currentTime: number;
  duration: number;
  buffered: TimeRanges | null;
  seekable: TimeRanges | null;

  // Audio state
  volume: number;
  muted: boolean;

  // Loading state
  loading: boolean;
  seeking: boolean;
  readyState: number;

  // Media information
  videoWidth: number;
  videoHeight: number;
  playbackRate: number;

  // Track information
  currentVideoTrack: number;
  currentAudioTrack: number;

  // Error state
  error: Error | null;
}
```

## Subscribing to State Changes

### Basic Subscription

```typescript
import { XiaoMei } from '@vivysub/xiaomei';

const player = new XiaoMei({ canvas: canvasElement });

// Subscribe to all state changes
const unsubscribe = player.store.subscribe((state) => {
  console.log('State updated:', state);

  // Update UI based on state
  updatePlayButton(state.playing);
  updateTimeDisplay(state.currentTime, state.duration);
  updateVolumeControl(state.volume, state.muted);
});

// Unsubscribe when done
// unsubscribe();
```

### Selective State Subscription

```typescript
// Subscribe only to specific state changes
let lastPlayingState = false;
let lastCurrentTime = 0;

player.store.subscribe((state) => {
  // Only react to playing state changes
  if (state.playing !== lastPlayingState) {
    console.log(`Playback ${state.playing ? 'started' : 'stopped'}`);
    lastPlayingState = state.playing;
  }

  // Only react to significant time changes (avoid too frequent updates)
  if (Math.abs(state.currentTime - lastCurrentTime) > 0.5) {
    updateProgressBar(state.currentTime, state.duration);
    lastCurrentTime = state.currentTime;
  }
});
```

## State Access Patterns

### Direct Property Access

XiaoMei provides convenient getters for common state properties:

```typescript
// Direct property access (returns current state values)
console.log(player.playing);        // boolean
console.log(player.currentTime);    // number
console.log(player.duration);       // number
console.log(player.volume);         // number
console.log(player.muted);          // boolean
console.log(player.ended);          // boolean
console.log(player.readyState);     // number

// These are equivalent to:
console.log(player.store.getState().playing);
console.log(player.store.getState().currentTime);
// etc.
```

### Getting Full State

```typescript
// Get the current complete state
const currentState = player.store.getState();
console.log(currentState);

// Check if player is ready to play
if (currentState.readyState >= 3) {
  console.log('Player can start playback');
}
```

## Reactive UI Updates

### Manual DOM Updates

```typescript
function createPlayerUI(player) {
  const playButton = document.getElementById('play-button');
  const timeDisplay = document.getElementById('time-display');
  const progressBar = document.getElementById('progress-bar');
  const volumeSlider = document.getElementById('volume-slider');

  player.store.subscribe((state) => {
    // Update play button
    playButton.textContent = state.playing ? 'Pause' : 'Play';
    playButton.disabled = state.loading || state.seeking;

    // Update time display
    const current = formatTime(state.currentTime);
    const total = formatTime(state.duration);
    timeDisplay.textContent = `${current} / ${total}`;

    // Update progress bar
    if (state.duration > 0) {
      const progress = (state.currentTime / state.duration) * 100;
      progressBar.value = progress;
    }

    // Update volume slider
    volumeSlider.value = state.volume;

    // Update loading state
    document.body.classList.toggle('player-loading', state.loading);
    document.body.classList.toggle('player-seeking', state.seeking);
  });
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
```

### Framework Integration

#### React Hook

```typescript
import { useState, useEffect } from 'react';
import { XiaoMei, type PlayerState } from '@vivysub/xiaomei';

function usePlayerState(player: XiaoMei | null): PlayerState | null {
  const [state, setState] = useState<PlayerState | null>(null);

  useEffect(() => {
    if (!player) return;

    const unsubscribe = player.store.subscribe(setState);
    return unsubscribe;
  }, [player]);

  return state;
}

// Usage in component
function VideoPlayer({ src }: { src: string }) {
  const [player, setPlayer] = useState<XiaoMei | null>(null);
  const state = usePlayerState(player);

  useEffect(() => {
    const newPlayer = new XiaoMei({ canvas: canvasRef.current });
    setPlayer(newPlayer);

    return () => {
      newPlayer.destroy();
    };
  }, []);

  if (!state) return <div>Loading...</div>;

  return (
    <div>
      <canvas ref={canvasRef} />
      <button onClick={() => player?.playing ? player.pause() : player?.play()}>
        {state.playing ? 'Pause' : 'Play'}
      </button>
      <div>Time: {state.currentTime.toFixed(1)}s</div>
    </div>
  );
}
```

#### Vue Composition API

```typescript
import { ref, onMounted, onUnmounted } from 'vue';
import { XiaoMei, type PlayerState } from '@vivysub/xiaomei';

export function usePlayerState(player: Ref<XiaoMei | null>) {
  const state = ref<PlayerState | null>(null);

  const subscribe = () => {
    if (!player.value) return;

    return player.value.store.subscribe((newState) => {
      state.value = newState;
    });
  };

  let unsubscribe: (() => void) | undefined;

  watchEffect(() => {
    unsubscribe?.();
    unsubscribe = subscribe();
  });

  onUnmounted(() => {
    unsubscribe?.();
  });

  return { state };
}
```

#### Svelte Store

```typescript
import { writable } from 'svelte/store';
import { XiaoMei, type PlayerState } from '@vivysub/xiaomei';

export function createPlayerStore() {
  const { subscribe, set } = writable<PlayerState | null>(null);

  let player: XiaoMei | null = null;
  let unsubscribe: (() => void) | undefined;

  return {
    subscribe,

    setPlayer(newPlayer: XiaoMei) {
      unsubscribe?.();
      player = newPlayer;
      unsubscribe = player.store.subscribe(set);
    },

    destroy() {
      unsubscribe?.();
      player = null;
    }
  };
}
```

## Advanced State Patterns

### State Diffing

```typescript
class StateDiffer {
  private lastState: PlayerState | null = null;

  constructor(private player: XiaoMei) {
    this.player.store.subscribe(this.handleStateChange.bind(this));
  }

  private handleStateChange(newState: PlayerState) {
    if (!this.lastState) {
      this.lastState = newState;
      return;
    }

    const changes = this.getStateChanges(this.lastState, newState);
    this.handleChanges(changes);
    this.lastState = newState;
  }

  private getStateChanges(oldState: PlayerState, newState: PlayerState): Partial<PlayerState> {
    const changes: Partial<PlayerState> = {};

    for (const key in newState) {
      if (oldState[key] !== newState[key]) {
        changes[key] = newState[key];
      }
    }

    return changes;
  }

  private handleChanges(changes: Partial<PlayerState>) {
    if ('playing' in changes) {
      console.log(`Playback ${changes.playing ? 'started' : 'stopped'}`);
    }

    if ('currentTime' in changes) {
      this.handleTimeUpdate(changes.currentTime!);
    }

    if ('volume' in changes) {
      this.handleVolumeChange(changes.volume!);
    }

    if ('error' in changes && changes.error) {
      this.handleError(changes.error);
    }
  }

  private handleTimeUpdate(time: number) {
    // Custom time update logic
    console.log(`Time updated: ${time.toFixed(2)}s`);
  }

  private handleVolumeChange(volume: number) {
    // Custom volume change logic
    console.log(`Volume changed: ${Math.round(volume * 100)}%`);
  }

  private handleError(error: Error) {
    // Custom error handling
    console.error('Player error:', error.message);
  }
}
```

### State Persistence

```typescript
class StatePersistence {
  private storageKey = 'xiaomei-player-state';

  constructor(private player: XiaoMei) {
    this.loadState();
    this.setupStateSaving();
  }

  private loadState() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const state = JSON.parse(saved);

        // Restore relevant state
        if (typeof state.volume === 'number') {
          this.player.volume = state.volume;
        }
        if (typeof state.muted === 'boolean') {
          this.player.muted = state.muted;
        }
        if (typeof state.playbackRate === 'number') {
          this.player.playbackRate = state.playbackRate;
        }
      }
    } catch (error) {
      console.warn('Failed to load saved state:', error);
    }
  }

  private setupStateSaving() {
    this.player.store.subscribe((state) => {
      const stateToSave = {
        volume: state.volume,
        muted: state.muted,
        playbackRate: state.playbackRate,
        lastPosition: state.currentTime,
        timestamp: Date.now()
      };

      try {
        localStorage.setItem(this.storageKey, JSON.stringify(stateToSave));
      } catch (error) {
        console.warn('Failed to save state:', error);
      }
    });
  }

  clearSavedState() {
    localStorage.removeItem(this.storageKey);
  }
}
```

### State Analytics

```typescript
class StateAnalytics {
  private metrics = {
    totalPlayTime: 0,
    seekCount: 0,
    pauseCount: 0,
    lastPlayStart: 0,
    volumeChanges: 0,
    errors: 0
  };

  constructor(private player: XiaoMei) {
    this.setupTracking();
  }

  private setupTracking() {
    let lastState: PlayerState | null = null;

    this.player.store.subscribe((state) => {
      if (!lastState) {
        lastState = state;
        return;
      }

      // Track play/pause
      if (state.playing !== lastState.playing) {
        if (state.playing) {
          this.metrics.lastPlayStart = Date.now();
        } else {
          if (this.metrics.lastPlayStart > 0) {
            this.metrics.totalPlayTime += Date.now() - this.metrics.lastPlayStart;
            this.metrics.pauseCount++;
          }
        }
      }

      // Track seeking
      if (state.seeking && !lastState.seeking) {
        this.metrics.seekCount++;
      }

      // Track volume changes
      if (state.volume !== lastState.volume) {
        this.metrics.volumeChanges++;
      }

      // Track errors
      if (state.error && !lastState.error) {
        this.metrics.errors++;
      }

      lastState = state;
    });
  }

  getMetrics() {
    return { ...this.metrics };
  }

  reset() {
    this.metrics = {
      totalPlayTime: 0,
      seekCount: 0,
      pauseCount: 0,
      lastPlayStart: 0,
      volumeChanges: 0,
      errors: 0
    };
  }
}
```

## Performance Considerations

### Throttling Updates

```typescript
function throttle<T extends (...args: any[]) => void>(func: T, delay: number): T {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastExecTime = 0;

  return ((...args: Parameters<T>) => {
    const currentTime = Date.now();

    if (currentTime - lastExecTime > delay) {
      func(...args);
      lastExecTime = currentTime;
    } else {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func(...args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  }) as T;
}

// Usage
const throttledUpdate = throttle((state: PlayerState) => {
  updateExpensiveUI(state);
}, 100); // Update at most every 100ms

player.store.subscribe(throttledUpdate);
```

### Batched Updates

```typescript
class BatchedUpdater {
  private pendingUpdates = new Set<string>();
  private updateScheduled = false;

  constructor(private player: XiaoMei) {
    this.player.store.subscribe(this.scheduleUpdate.bind(this));
  }

  private scheduleUpdate(state: PlayerState) {
    // Determine what needs updating
    if (state.playing !== this.lastState?.playing) {
      this.pendingUpdates.add('playButton');
    }
    if (state.currentTime !== this.lastState?.currentTime) {
      this.pendingUpdates.add('timeDisplay');
    }
    if (state.volume !== this.lastState?.volume) {
      this.pendingUpdates.add('volumeControl');
    }

    // Schedule batch update
    if (!this.updateScheduled && this.pendingUpdates.size > 0) {
      this.updateScheduled = true;
      requestAnimationFrame(() => {
        this.processBatchedUpdates(state);
        this.updateScheduled = false;
      });
    }

    this.lastState = state;
  }

  private processBatchedUpdates(state: PlayerState) {
    if (this.pendingUpdates.has('playButton')) {
      this.updatePlayButton(state.playing);
    }
    if (this.pendingUpdates.has('timeDisplay')) {
      this.updateTimeDisplay(state.currentTime, state.duration);
    }
    if (this.pendingUpdates.has('volumeControl')) {
      this.updateVolumeControl(state.volume);
    }

    this.pendingUpdates.clear();
  }

  private updatePlayButton(playing: boolean) {
    // Update play button UI
  }

  private updateTimeDisplay(currentTime: number, duration: number) {
    // Update time display UI
  }

  private updateVolumeControl(volume: number) {
    // Update volume control UI
  }
}
```

## Best Practices

1. **Selective Subscriptions**: Only subscribe to state changes you actually need to avoid unnecessary updates
2. **Throttle Expensive Operations**: Use throttling for expensive UI updates, especially for `currentTime` changes
3. **Batch DOM Updates**: Group multiple DOM updates together using `requestAnimationFrame`
4. **Unsubscribe Properly**: Always unsubscribe from state updates when components are destroyed
5. **Use Direct Property Access**: For one-time reads, use `player.currentTime` instead of subscribing
6. **State Diffing**: For complex applications, implement state diffing to only react to specific changes
7. **Error Handling**: Always handle the error state in your subscriptions

The state management system in XiaoMei is designed to be both powerful and performant, providing real-time updates while maintaining good performance characteristics for complex applications.
