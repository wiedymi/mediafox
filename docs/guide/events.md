# Event Handling Guide

AVPlay provides a comprehensive event system that allows you to respond to various playback events. This guide covers all available events and best practices for event handling.

## Overview

AVPlay's event system is built on a type-safe EventEmitter that supports all standard HTML media events plus custom AVPlay-specific events. Events provide notifications about state changes, user interactions, and system status.

## Available Events

### Playback Events

```typescript
// Core playback events
player.on('play', () => {
  console.log('Playback started');
});

player.on('pause', () => {
  console.log('Playback paused');
});

player.on('ended', () => {
  console.log('Playback completed');
});

player.on('seeking', () => {
  console.log('User is seeking...');
});

player.on('seeked', () => {
  console.log('Seek operation completed');
});

player.on('timeupdate', (currentTime: number) => {
  console.log(`Current time: ${currentTime}s`);
});

player.on('ratechange', (rate: number) => {
  console.log(`Playback rate changed to: ${rate}x`);
});
```

### Loading Events

```typescript
// Media loading lifecycle
player.on('loadstart', () => {
  console.log('Started loading media');
});

player.on('loadedmetadata', () => {
  console.log('Media metadata loaded');
});

player.on('loadeddata', () => {
  console.log('First frame loaded');
});

player.on('canplay', () => {
  console.log('Media can start playing');
});

player.on('canplaythrough', () => {
  console.log('Media can play through without buffering');
});

player.on('progress', (buffered: TimeRanges) => {
  console.log('Download progress updated');
});

player.on('waiting', () => {
  console.log('Waiting for data...');
});

player.on('stalled', () => {
  console.log('Media loading stalled');
});
```

### Audio Events

```typescript
// Audio-specific events
player.on('volumechange', (volume: number, muted: boolean) => {
  console.log(`Volume: ${Math.round(volume * 100)}%, Muted: ${muted}`);
});
```

### Error Events

```typescript
// Error handling
player.on('error', (error: Error) => {
  console.error('Player error:', error.message);

  // Handle different error types
  if (error instanceof MediaError) {
    handleMediaError(error);
  } else if (error instanceof NetworkError) {
    handleNetworkError(error);
  }
});

function handleMediaError(error: MediaError) {
  switch (error.code) {
    case MediaError.MEDIA_ERR_ABORTED:
      console.log('Media loading aborted');
      break;
    case MediaError.MEDIA_ERR_NETWORK:
      console.log('Network error while loading media');
      break;
    case MediaError.MEDIA_ERR_DECODE:
      console.log('Media decoding error');
      break;
    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
      console.log('Media format not supported');
      break;
  }
}
```

### AVPlay-Specific Events

```typescript
// Track management events
player.on('tracksChanged', (tracks) => {
  console.log('Available tracks:', tracks);
  console.log(`Video tracks: ${tracks.video.length}`);
  console.log(`Audio tracks: ${tracks.audio.length}`);
});

player.on('trackChanged', (type: 'video' | 'audio', trackIndex: number) => {
  console.log(`${type} track changed to index: ${trackIndex}`);
});

// Source management events
player.on('sourceChanged', (newSource: string) => {
  console.log('Media source changed to:', newSource);
});

// Player lifecycle events
player.on('ready', () => {
  console.log('Player is ready for playback');
});

player.on('destroy', () => {
  console.log('Player has been destroyed');
});
```

## Event Listener Management

### Adding Event Listeners

```typescript
// Basic event listener
const playHandler = () => {
  console.log('Playing');
};
player.on('play', playHandler);

// Event listener with data
player.on('timeupdate', (currentTime: number) => {
  updateProgressBar(currentTime);
});

// Multiple events with same handler
const loadingHandler = () => {
  showLoadingSpinner(true);
};
player.on('loadstart', loadingHandler);
player.on('waiting', loadingHandler);

// One-time event listener
player.once('loadeddata', () => {
  console.log('First data loaded - this will only fire once');
});
```

### Removing Event Listeners

```typescript
// Remove specific event listener
player.off('play', playHandler);

// Remove all listeners for an event
player.off('timeupdate');

// Remove all event listeners
player.removeAllListeners();

// Best practice: Store references for cleanup
class PlayerManager {
  private eventHandlers = new Map();

  constructor(private player: AVPlay) {
    this.setupEventListeners();
  }

  private setupEventListeners() {
    const playHandler = this.onPlay.bind(this);
    const errorHandler = this.onError.bind(this);

    this.player.on('play', playHandler);
    this.player.on('error', errorHandler);

    // Store references for cleanup
    this.eventHandlers.set('play', playHandler);
    this.eventHandlers.set('error', errorHandler);
  }

  private onPlay() {
    console.log('Playback started');
  }

  private onError(error: Error) {
    console.error('Error:', error);
  }

  destroy() {
    // Clean up all event listeners
    this.eventHandlers.forEach((handler, event) => {
      this.player.off(event, handler);
    });
    this.eventHandlers.clear();
  }
}
```

## Advanced Event Patterns

### Event Chaining

```typescript
class EventChain {
  constructor(private player: AVPlay) {
    this.setupEventChain();
  }

  private setupEventChain() {
    this.player
      .on('loadstart', () => {
        console.log('1. Loading started');
        this.showLoadingState();
      })
      .on('loadedmetadata', () => {
        console.log('2. Metadata loaded');
        this.showMediaInfo();
      })
      .on('loadeddata', () => {
        console.log('3. Data loaded');
        this.hideLoadingState();
      })
      .on('canplay', () => {
        console.log('4. Ready to play');
        this.enableControls();
      });
  }

  private showLoadingState() { /* UI update */ }
  private showMediaInfo() { /* UI update */ }
  private hideLoadingState() { /* UI update */ }
  private enableControls() { /* UI update */ }
}
```

### Event Debouncing

```typescript
function debounce<T extends (...args: any[]) => void>(
  func: T,
  delay: number
): T {
  let timeoutId: NodeJS.Timeout;
  return ((...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  }) as T;
}

// Debounce frequent time updates
const debouncedTimeUpdate = debounce((time: number) => {
  updateTimeDisplay(time);
}, 100);

player.on('timeupdate', debouncedTimeUpdate);

// Debounce resize events
const debouncedResize = debounce(() => {
  player.resize();
}, 250);

window.addEventListener('resize', debouncedResize);
```

### Event Throttling

```typescript
function throttle<T extends (...args: any[]) => void>(
  func: T,
  limit: number
): T {
  let inThrottle: boolean;
  return ((...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }) as T;
}

// Throttle progress updates
const throttledProgress = throttle((buffered: TimeRanges) => {
  updateBufferedIndicator(buffered);
}, 500);

player.on('progress', throttledProgress);
```

### Event Delegation

```typescript
class EventDelegator {
  private eventQueue: Array<{event: string, data: any, timestamp: number}> = [];

  constructor(private player: AVPlay) {
    this.setupDelegation();
  }

  private setupDelegation() {
    // Capture all events for logging/analytics
    const events = [
      'play', 'pause', 'ended', 'seeking', 'seeked',
      'timeupdate', 'volumechange', 'ratechange',
      'loadstart', 'loadeddata', 'error'
    ];

    events.forEach(eventName => {
      this.player.on(eventName as any, (data?: any) => {
        this.queueEvent(eventName, data);
      });
    });
  }

  private queueEvent(event: string, data: any) {
    this.eventQueue.push({
      event,
      data,
      timestamp: Date.now()
    });

    // Process events in batches
    if (this.eventQueue.length >= 10) {
      this.processEventBatch();
    }
  }

  private processEventBatch() {
    const batch = this.eventQueue.splice(0);

    // Send to analytics, logging, etc.
    this.sendToAnalytics(batch);
    this.logEvents(batch);
  }

  private sendToAnalytics(events: any[]) {
    // Analytics implementation
  }

  private logEvents(events: any[]) {
    events.forEach(({event, data, timestamp}) => {
      console.log(`[${new Date(timestamp).toISOString()}] ${event}:`, data);
    });
  }
}
```

## Framework Integration

### React Hook for Events

```typescript
import { useEffect } from 'react';
import { AVPlay } from '@avplay/core';

function usePlayerEvents(
  player: AVPlay | null,
  events: Record<string, (...args: any[]) => void>
) {
  useEffect(() => {
    if (!player) return;

    // Add all event listeners
    Object.entries(events).forEach(([event, handler]) => {
      player.on(event as any, handler);
    });

    // Cleanup function
    return () => {
      Object.entries(events).forEach(([event, handler]) => {
        player.off(event as any, handler);
      });
    };
  }, [player, events]);
}

// Usage
function VideoPlayer() {
  const [player, setPlayer] = useState<AVPlay | null>(null);

  const eventHandlers = useMemo(() => ({
    play: () => setIsPlaying(true),
    pause: () => setIsPlaying(false),
    timeupdate: (time: number) => setCurrentTime(time),
    error: (error: Error) => setError(error.message)
  }), []);

  usePlayerEvents(player, eventHandlers);

  // Component render...
}
```

### Vue Composition API

```typescript
import { onMounted, onUnmounted } from 'vue';
import { AVPlay } from '@avplay/core';

export function usePlayerEvents(
  player: Ref<AVPlay | null>,
  events: Record<string, Function>
) {
  const eventHandlers = new Map();

  const setupEvents = () => {
    if (!player.value) return;

    Object.entries(events).forEach(([event, handler]) => {
      player.value!.on(event as any, handler);
      eventHandlers.set(event, handler);
    });
  };

  const cleanupEvents = () => {
    if (!player.value) return;

    eventHandlers.forEach((handler, event) => {
      player.value!.off(event, handler);
    });
    eventHandlers.clear();
  };

  watchEffect(() => {
    cleanupEvents();
    setupEvents();
  });

  onUnmounted(cleanupEvents);
}
```

### Svelte Action

```typescript
// playerEvents.ts
export function playerEvents(
  node: HTMLElement,
  { player, events }: { player: AVPlay, events: Record<string, Function> }
) {
  const eventHandlers = new Map();

  function setupEvents() {
    Object.entries(events).forEach(([event, handler]) => {
      player.on(event as any, handler);
      eventHandlers.set(event, handler);
    });
  }

  function cleanupEvents() {
    eventHandlers.forEach((handler, event) => {
      player.off(event, handler);
    });
    eventHandlers.clear();
  }

  setupEvents();

  return {
    update({ player: newPlayer, events: newEvents }) {
      cleanupEvents();
      Object.entries(newEvents).forEach(([event, handler]) => {
        newPlayer.on(event as any, handler);
        eventHandlers.set(event, handler);
      });
    },
    destroy: cleanupEvents
  };
}

// Usage in Svelte component
<div use:playerEvents={{ player, events: {
  play: () => isPlaying = true,
  pause: () => isPlaying = false,
  timeupdate: (time) => currentTime = time
} }}>
  <!-- Player UI -->
</div>
```

## Error Handling Best Practices

### Comprehensive Error Handler

```typescript
class ErrorHandler {
  constructor(private player: AVPlay) {
    this.setupErrorHandling();
  }

  private setupErrorHandling() {
    this.player.on('error', this.handleError.bind(this));

    // Handle uncaught errors in player callbacks
    this.player.on('play', this.wrapHandler(() => {
      // Play logic that might throw
    }));
  }

  private handleError(error: Error) {
    console.error('Player error:', error);

    // Categorize errors
    if (this.isNetworkError(error)) {
      this.handleNetworkError(error);
    } else if (this.isMediaError(error)) {
      this.handleMediaError(error);
    } else {
      this.handleGenericError(error);
    }

    // Report to error tracking service
    this.reportError(error);
  }

  private isNetworkError(error: Error): boolean {
    return error.message.includes('network') ||
           error.message.includes('fetch');
  }

  private isMediaError(error: Error): boolean {
    return error instanceof MediaError;
  }

  private handleNetworkError(error: Error) {
    // Show retry UI
    this.showRetryDialog();
  }

  private handleMediaError(error: Error) {
    // Show format error message
    this.showFormatError();
  }

  private handleGenericError(error: Error) {
    // Show generic error message
    this.showGenericError(error.message);
  }

  private wrapHandler(handler: Function) {
    return (...args: any[]) => {
      try {
        return handler(...args);
      } catch (error) {
        this.handleError(error as Error);
      }
    };
  }

  private reportError(error: Error) {
    // Send to analytics/monitoring service
  }

  private showRetryDialog() { /* UI implementation */ }
  private showFormatError() { /* UI implementation */ }
  private showGenericError(message: string) { /* UI implementation */ }
}
```

## Performance Considerations

### Event Listener Limits

```typescript
// Monitor event listener count
class EventMonitor {
  constructor(private player: AVPlay) {
    this.monitorListeners();
  }

  private monitorListeners() {
    const originalOn = this.player.on.bind(this.player);
    const originalOff = this.player.off.bind(this.player);

    let listenerCount = 0;

    this.player.on = (event: string, listener: Function) => {
      listenerCount++;
      if (listenerCount > 50) {
        console.warn(`High number of event listeners: ${listenerCount}`);
      }
      return originalOn(event, listener);
    };

    this.player.off = (event: string, listener?: Function) => {
      if (listener) {
        listenerCount--;
      } else {
        // Removing all listeners for this event
        const currentListeners = this.player.listenerCount(event);
        listenerCount -= currentListeners;
      }
      return originalOff(event, listener);
    };
  }
}
```

## Best Practices

1. **Always Clean Up**: Remove event listeners when components unmount
2. **Use Specific Events**: Subscribe to specific events rather than generic ones
3. **Throttle/Debounce**: Use throttling for frequent events like `timeupdate`
4. **Error Boundaries**: Implement comprehensive error handling
5. **Memory Management**: Monitor listener count and clean up properly
6. **Type Safety**: Use TypeScript for better event handling safety
7. **Batch Operations**: Group related operations in event handlers
8. **Avoid Side Effects**: Keep event handlers focused and predictable

The event system in AVPlay provides powerful capabilities for building responsive and interactive video players while maintaining good performance and developer experience.
