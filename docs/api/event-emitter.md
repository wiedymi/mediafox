# EventEmitter API Documentation

MediaFox's EventEmitter provides a robust, type-safe event system with memory leak protection and performance optimizations. This document covers the complete EventEmitter API.

## Class Overview

```typescript
class EventEmitter<T extends EventMap = EventMap> {
  constructor(maxListeners?: number);

  // Core methods
  on<K extends keyof T>(event: K, listener: T[K]): this;
  off<K extends keyof T>(event: K, listener?: T[K]): this;
  once<K extends keyof T>(event: K, listener: T[K]): this;
  emit<K extends keyof T>(event: K, ...args: Parameters<T[K]>): boolean;

  // Listener management
  removeAllListeners(event?: keyof T): this;
  setMaxListeners(n: number): this;
  getMaxListeners(): number;
  listenerCount(event: keyof T): number;
  listeners<K extends keyof T>(event: K): T[K][];
  eventNames(): Array<keyof T>;

  // Advanced methods
  prependListener<K extends keyof T>(event: K, listener: T[K]): this;
  prependOnceListener<K extends keyof T>(event: K, listener: T[K]): this;
  rawListeners<K extends keyof T>(event: K): T[K][];
}
```

## Core Methods

### on(event, listener)
Adds a listener function to the specified event.

```typescript
// Basic usage
player.on('play', () => {
  console.log('Playback started');
});

// With typed parameters
player.on('timeupdate', (currentTime: number) => {
  updateProgressBar(currentTime);
});

// Method chaining
player
  .on('play', handlePlay)
  .on('pause', handlePause)
  .on('ended', handleEnded);

// Store reference for later removal
const playHandler = () => console.log('Playing');
player.on('play', playHandler);
```

**Parameters:**
- `event` (keyof T): Event name
- `listener` (T[K]): Listener function

**Returns:** EventEmitter instance for chaining

**Example with error handling:**
```typescript
player.on('error', (error: Error) => {
  console.error('Player error:', error.message);

  // Type-safe error handling
  if (error instanceof MediaError) {
    handleMediaError(error);
  } else if (error instanceof NetworkError) {
    handleNetworkError(error);
  }
});
```

### off(event, listener?)
Removes a listener function from the specified event.

```typescript
// Remove specific listener
const handler = () => console.log('Handler');
player.on('play', handler);
player.off('play', handler);

// Remove all listeners for an event
player.off('timeupdate');

// Method chaining
player
  .off('play', oldPlayHandler)
  .off('pause', oldPauseHandler);
```

**Parameters:**
- `event` (keyof T): Event name
- `listener` (T[K], optional): Specific listener to remove. If omitted, removes all listeners for the event

**Returns:** EventEmitter instance for chaining

**Memory management example:**
```typescript
class PlayerComponent {
  private handlers = new Map<string, Function>();

  constructor(private player: MediaFox) {
    this.setupEventListeners();
  }

  private setupEventListeners() {
    const playHandler = this.onPlay.bind(this);
    const pauseHandler = this.onPause.bind(this);

    this.player.on('play', playHandler);
    this.player.on('pause', pauseHandler);

    // Store references for cleanup
    this.handlers.set('play', playHandler);
    this.handlers.set('pause', pauseHandler);
  }

  destroy() {
    // Clean up all listeners
    this.handlers.forEach((handler, event) => {
      this.player.off(event as any, handler);
    });
    this.handlers.clear();
  }

  private onPlay() { /* handle play */ }
  private onPause() { /* handle pause */ }
}
```

### once(event, listener)
Adds a one-time listener that is automatically removed after being called.

```typescript
// Basic one-time listener
player.once('canplay', () => {
  console.log('Ready to play - this will only fire once');
  enablePlayButton();
});

// Useful for initialization
player.once('loadedmetadata', () => {
  console.log(`Video duration: ${player.duration}s`);
  initializeProgressBar(player.duration);
});

// Promise-like pattern
function waitForReady(player: MediaFox): Promise<void> {
  return new Promise((resolve) => {
    player.once('canplay', resolve);
  });
}

// Usage
await waitForReady(player);
console.log('Player is ready');
```

**Parameters:**
- `event` (keyof T): Event name
- `listener` (T[K]): Listener function

**Returns:** EventEmitter instance for chaining

### emit(event, ...args)
Synchronously calls each listener registered for the specified event.

```typescript
// Basic emit
player.emit('customEvent');

// Emit with parameters
player.emit('timeupdate', 42.5);

// Check if any listeners handled the event
const handled = player.emit('play');
if (!handled) {
  console.log('No listeners for play event');
}

// Custom events in plugins
class CustomPlugin {
  init(player: MediaFox) {
    // Emit custom events
    player.emit('pluginLoaded', this.name);

    setInterval(() => {
      player.emit('customHeartbeat', Date.now());
    }, 1000);
  }
}
```

**Parameters:**
- `event` (keyof T): Event name
- `...args`: Arguments to pass to listeners

**Returns:** `true` if the event had listeners, `false` otherwise

## Listener Management

### removeAllListeners(event?)
Removes all listeners for a specific event or all events.

```typescript
// Remove all listeners for a specific event
player.removeAllListeners('timeupdate');

// Remove ALL listeners (use with caution)
player.removeAllListeners();

// Cleanup pattern
class PlayerWrapper {
  destroy() {
    // Remove only our listeners
    player.removeAllListeners('customEvent');

    // Or remove all if we own the player
    player.removeAllListeners();
  }
}
```

**Parameters:**
- `event` (keyof T, optional): Specific event to clear. If omitted, removes all listeners

**Returns:** EventEmitter instance for chaining

### setMaxListeners(n) / getMaxListeners()
Manages the maximum number of listeners per event for memory leak detection.

```typescript
// Set maximum listeners (default is usually 10)
player.setMaxListeners(50);

// Get current maximum
const max = player.getMaxListeners();
console.log(`Maximum listeners: ${max}`);

// Disable limit (not recommended)
player.setMaxListeners(0);

// Warning detection
player.on('maxListeners', (event: string, count: number) => {
  console.warn(`Event "${event}" has ${count} listeners - possible memory leak`);
});
```

**Memory leak detection:**
```typescript
class MemoryLeakDetector {
  constructor(private emitter: EventEmitter) {
    this.setupDetection();
  }

  private setupDetection() {
    this.emitter.on('maxListeners', (event, count) => {
      console.warn(`Potential memory leak detected for event "${event}": ${count} listeners`);

      // Log listener details for debugging
      const listeners = this.emitter.listeners(event);
      console.log('Listeners:', listeners.map(l => l.toString()));

      // Report to monitoring service
      this.reportMemoryLeak(event, count);
    });
  }

  private reportMemoryLeak(event: string, count: number) {
    // Send to monitoring service
    analytics.track('memory_leak_detected', {
      event,
      listener_count: count,
      timestamp: Date.now()
    });
  }
}
```

### listenerCount(event)
Returns the number of listeners for a specific event.

```typescript
// Check listener count
const count = player.listenerCount('timeupdate');
console.log(`timeupdate has ${count} listeners`);

// Monitor listener counts
function monitorListeners(emitter: EventEmitter) {
  const events = emitter.eventNames();

  events.forEach(event => {
    const count = emitter.listenerCount(event);
    if (count > 10) {
      console.warn(`High listener count for ${String(event)}: ${count}`);
    }
  });
}

// Periodic monitoring
setInterval(() => monitorListeners(player), 30000);
```

**Parameters:**
- `event` (keyof T): Event name

**Returns:** Number of listeners for the event

### listeners(event) / rawListeners(event)
Returns an array of listeners for a specific event.

```typescript
// Get all listeners
const playListeners = player.listeners('play');
console.log(`Found ${playListeners.length} play listeners`);

// Get raw listeners (includes wrapped once() listeners)
const rawListeners = player.rawListeners('play');

// Debug listeners
function debugListeners(emitter: EventEmitter, event: string) {
  const listeners = emitter.listeners(event);

  listeners.forEach((listener, index) => {
    console.log(`Listener ${index}:`, listener.toString());
  });
}

// Remove listeners conditionally
function removeOldListeners(emitter: EventEmitter, event: string) {
  const listeners = emitter.listeners(event);

  listeners.forEach(listener => {
    // Remove listeners based on some criteria
    if (isOldListener(listener)) {
      emitter.off(event as any, listener);
    }
  });
}
```

**Parameters:**
- `event` (keyof T): Event name

**Returns:** Array of listener functions

### eventNames()
Returns an array of event names that have listeners.

```typescript
// Get all events with listeners
const events = player.eventNames();
console.log('Events with listeners:', events);

// Cleanup utility
function cleanupUnusedListeners(emitter: EventEmitter) {
  const events = emitter.eventNames();

  events.forEach(event => {
    const count = emitter.listenerCount(event);
    if (count === 0) {
      // Event has no listeners, could clean up related resources
      console.log(`Event ${String(event)} has no listeners`);
    }
  });
}

// Event audit
function auditEventListeners(emitter: EventEmitter) {
  const events = emitter.eventNames();
  const report = events.map(event => ({
    event: String(event),
    listenerCount: emitter.listenerCount(event)
  }));

  console.table(report);
  return report;
}
```

**Returns:** Array of event names

## Advanced Methods

### prependListener(event, listener)
Adds a listener to the beginning of the listeners array.

```typescript
// Add high-priority listener
player.prependListener('error', (error) => {
  // This runs before other error listeners
  console.log('High priority error handler:', error);
});

// Normal listener (added after)
player.on('error', (error) => {
  console.log('Normal error handler:', error);
});

// Use case: override default behavior
class PlayerWithCustomErrorHandling extends MediaFox {
  constructor(options: PlayerOptions) {
    super(options);

    // Override default error handling
    this.prependListener('error', this.customErrorHandler.bind(this));
  }

  private customErrorHandler(error: Error) {
    // Custom error handling logic
    if (this.shouldHandleCustomly(error)) {
      this.handleCustomError(error);
      return; // Prevent other handlers from running
    }
  }
}
```

**Parameters:**
- `event` (keyof T): Event name
- `listener` (T[K]): Listener function

**Returns:** EventEmitter instance for chaining

### prependOnceListener(event, listener)
Adds a one-time listener to the beginning of the listeners array.

```typescript
// High-priority one-time listener
player.prependOnceListener('canplay', () => {
  console.log('First-priority ready handler');
  initializeCriticalFeatures();
});

// Normal once listener (added after)
player.once('canplay', () => {
  console.log('Normal ready handler');
});
```

**Parameters:**
- `event` (keyof T): Event name
- `listener` (T[K]): Listener function

**Returns:** EventEmitter instance for chaining

## TypeScript Integration

### Typed Event Maps

```typescript
// Define custom event map
interface CustomPlayerEvents extends PlayerEvents {
  customEvent: (data: string) => void;
  dataReceived: (data: ArrayBuffer) => void;
  userAction: (action: string, metadata: any) => void;
}

// Create typed emitter
class TypedPlayer extends EventEmitter<CustomPlayerEvents> {
  // Type-safe event emission
  notifyDataReceived(data: ArrayBuffer) {
    this.emit('dataReceived', data); // TypeScript validates parameters
  }

  // Type-safe listener registration
  onUserAction(callback: (action: string, metadata: any) => void) {
    this.on('userAction', callback);
  }
}

// Usage with full type safety
const typedPlayer = new TypedPlayer();

typedPlayer.on('userAction', (action, metadata) => {
  // TypeScript knows the types of action and metadata
  console.log(`User performed: ${action}`, metadata);
});

// This would cause a TypeScript error:
// typedPlayer.emit('userAction', 123); // Error: wrong parameter type
```

### Event Listener Decorators

```typescript
// Decorator for automatic listener cleanup
function EventListener<T extends EventMap>(
  event: keyof T,
  options?: { once?: boolean; prepend?: boolean }
) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    if (!target._eventListeners) {
      target._eventListeners = [];
    }

    target._eventListeners.push({
      event,
      method: originalMethod,
      options
    });

    return descriptor;
  };
}

class PlayerController {
  private player: MediaFox;
  private _eventListeners: any[] = [];

  constructor(player: MediaFox) {
    this.player = player;
    this.bindEventListeners();
  }

  @EventListener('play')
  private onPlay() {
    console.log('Play handler');
  }

  @EventListener('timeupdate')
  private onTimeUpdate(time: number) {
    this.updateUI(time);
  }

  @EventListener('error', { prepend: true })
  private onError(error: Error) {
    this.handleError(error);
  }

  private bindEventListeners() {
    this._eventListeners.forEach(({ event, method, options }) => {
      if (options?.once) {
        this.player.once(event, method.bind(this));
      } else if (options?.prepend) {
        this.player.prependListener(event, method.bind(this));
      } else {
        this.player.on(event, method.bind(this));
      }
    });
  }

  destroy() {
    // Automatic cleanup
    this._eventListeners.forEach(({ event, method }) => {
      this.player.off(event, method);
    });
  }
}
```

## Performance Considerations

### Event Batching

```typescript
class BatchedEventEmitter<T extends EventMap> extends EventEmitter<T> {
  private batchedEvents = new Map<keyof T, any[]>();
  private batchTimeout: NodeJS.Timeout | null = null;

  emit<K extends keyof T>(event: K, ...args: Parameters<T[K]>): boolean {
    // Batch frequent events
    if (this.shouldBatch(event)) {
      this.batchEvent(event, args);
      return true;
    }

    return super.emit(event, ...args);
  }

  private shouldBatch(event: keyof T): boolean {
    return ['timeupdate', 'progress', 'mousemove'].includes(event as string);
  }

  private batchEvent<K extends keyof T>(event: K, args: Parameters<T[K]>) {
    if (!this.batchedEvents.has(event)) {
      this.batchedEvents.set(event, []);
    }

    this.batchedEvents.get(event)!.push(args);

    if (!this.batchTimeout) {
      this.batchTimeout = setTimeout(() => {
        this.flushBatchedEvents();
      }, 16); // ~60fps
    }
  }

  private flushBatchedEvents() {
    this.batchedEvents.forEach((eventArgs, event) => {
      // Emit only the latest event data
      const latestArgs = eventArgs[eventArgs.length - 1];
      super.emit(event, ...latestArgs);
    });

    this.batchedEvents.clear();
    this.batchTimeout = null;
  }
}
```

## Best Practices

1. **Memory Management**: Always remove listeners when components are destroyed
2. **Type Safety**: Use TypeScript interfaces for better event typing
3. **Error Handling**: Always listen for error events
4. **Performance**: Batch frequent events and avoid creating listeners in loops
5. **Debugging**: Use `eventNames()` and `listenerCount()` for debugging
6. **Naming**: Use consistent event naming conventions
7. **Documentation**: Document custom events and their parameters

The EventEmitter in MediaFox provides a robust foundation for building event-driven video applications with full TypeScript support and performance optimizations.