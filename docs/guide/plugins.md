# Plugins

MediaFox provides a powerful plugin system that allows you to extend the player with custom functionality. Plugins can hook into lifecycle events, render overlays, modify state, intercept events, and customize the audio graph.

## Quick Start

```typescript
import { MediaFox, type MediaFoxPlugin } from '@mediafox/core';

// Create a simple watermark plugin
const watermarkPlugin: MediaFoxPlugin = {
  name: 'watermark',

  hooks: {
    render: {
      onOverlay: {
        zIndex: 10,
        render(ctx, time, { width, height }) {
          ctx.font = '14px sans-serif';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.fillText('© MediaFox', width - 100, height - 20);
        }
      }
    }
  },

  install(context) {
    context.log('Watermark plugin installed');
  }
};

// Use the plugin
const player = new MediaFox({ renderTarget: canvas });
await player.use(watermarkPlugin);
```

## Plugin Interface

Every plugin must implement the `MediaFoxPlugin` interface:

```typescript
interface MediaFoxPlugin {
  // Required: unique plugin name
  name: string;

  // Optional: version for debugging
  version?: string;

  // Optional: plugins that must be installed first
  dependencies?: string[];

  // Called when plugin is installed
  install(context: PluginContext): void | Promise<void>;

  // Optional: called when plugin is uninstalled
  uninstall?(): void | Promise<void>;

  // Optional: define hooks
  hooks?: PluginHooks;
}
```

## Plugin Context

When a plugin is installed, it receives a `PluginContext` object with controlled access to player internals:

```typescript
interface PluginContext {
  // Reference to the player
  player: MediaFox;

  // State access
  getState(): Readonly<PlayerStateData>;
  subscribe(listener: (state: PlayerStateData) => void): () => void;

  // Plugin-specific state (isolated)
  getPluginState<T>(): T | undefined;
  setPluginState<T>(state: T): void;

  // Events (auto-cleanup on uninstall)
  on<K extends keyof PlayerEventMap>(event: K, handler: Function): void;
  off<K extends keyof PlayerEventMap>(event: K, handler: Function): void;

  // Canvas access
  getCanvas(): HTMLCanvasElement | OffscreenCanvas | null;

  // Inter-plugin communication
  getPlugin<T extends MediaFoxPlugin>(name: string): T | undefined;
  hasPlugin(name: string): boolean;

  // Logging (prefixed with plugin name)
  log(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
}
```

## Hook Categories

### Lifecycle Hooks

Lifecycle hooks are called at key points during player operations. They can be async and may cancel or modify operations.

```typescript
interface LifecycleHooks {
  // Before/after loading media
  beforeLoad?(source: MediaSource): MaybePromise<HookResult<MediaSource> | void>;
  afterLoad?(mediaInfo: MediaInfo): MaybePromise<void>;

  // Before/after play
  beforePlay?(): MaybePromise<HookResult | void>;
  afterPlay?(): void;

  // Before/after pause
  beforePause?(): MaybePromise<HookResult | void>;
  afterPause?(): void;

  // Before/after seek
  beforeSeek?(time: number): MaybePromise<HookResult<number> | void>;
  afterSeek?(time: number): void;

  // Before/after stop
  beforeStop?(): MaybePromise<HookResult | void>;
  afterStop?(): void;

  // Error handling
  onError?(error: Error): { handled?: boolean } | void;
  onEnded?(): void;
}
```

**Example: Analytics Plugin**

```typescript
const analyticsPlugin: MediaFoxPlugin = {
  name: 'analytics',

  install(ctx) {
    ctx.setPluginState({ plays: 0, seeks: 0, totalWatchTime: 0 });
  },

  hooks: {
    lifecycle: {
      afterPlay() {
        const state = this.context.getPluginState<{ plays: number }>();
        this.context.setPluginState({ ...state, plays: state.plays + 1 });
        sendAnalytics('play');
      },

      afterSeek(time) {
        const state = this.context.getPluginState<{ seeks: number }>();
        this.context.setPluginState({ ...state, seeks: state.seeks + 1 });
        sendAnalytics('seek', { time });
      },

      onError(error) {
        sendAnalytics('error', { message: error.message });
        return { handled: false }; // Don't suppress the error
      }
    }
  }
};
```

### Render Hooks

Render hooks are called during the video rendering pipeline. **These must be synchronous for performance.**

```typescript
interface RenderHooks {
  // Skip or allow frame rendering
  beforeRender?(frame: WrappedCanvas, time: number): { skip?: boolean } | void;

  // Transform frame before rendering
  transformFrame?(frame: WrappedCanvas): WrappedCanvas;

  // After frame is rendered
  afterRender?(canvas: HTMLCanvasElement | OffscreenCanvas): void;

  // Draw overlays on top of video
  onOverlay?: {
    zIndex?: number; // Higher = on top (default: 0)
    render(
      ctx: CanvasRenderingContext2D,
      time: number,
      dimensions: { width: number; height: number }
    ): void;
  };
}
```

**Example: Subtitles Plugin**

```typescript
interface Subtitle {
  start: number;
  end: number;
  text: string;
}

const subtitlesPlugin: MediaFoxPlugin = {
  name: 'subtitles',

  install(ctx) {
    ctx.setPluginState<{ subtitles: Subtitle[]; current: Subtitle | null }>({
      subtitles: [],
      current: null
    });
  },

  hooks: {
    render: {
      onOverlay: {
        zIndex: 100, // Render on top of other overlays
        render(ctx, time, { width, height }) {
          const state = this.context.getPluginState<{ subtitles: Subtitle[] }>();
          const subtitle = state.subtitles.find(
            s => time >= s.start && time <= s.end
          );

          if (subtitle) {
            ctx.font = 'bold 24px sans-serif';
            ctx.fillStyle = 'white';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 3;
            ctx.textAlign = 'center';

            const y = height - 60;
            ctx.strokeText(subtitle.text, width / 2, y);
            ctx.fillText(subtitle.text, width / 2, y);
          }
        }
      }
    }
  }
};

// Usage
await player.use(subtitlesPlugin);

// Load subtitles later
const plugin = player.getPlugin<typeof subtitlesPlugin>('subtitles');
plugin?.context.setPluginState({
  subtitles: [
    { start: 0, end: 5, text: 'Hello, world!' },
    { start: 5, end: 10, text: 'Welcome to MediaFox' }
  ]
});
```

### State Hooks

State hooks allow you to intercept and modify player state changes.

```typescript
interface StateHooks {
  // Intercept state updates (return null to cancel)
  beforeStateUpdate?(
    update: Partial<PlayerStateData>
  ): Partial<PlayerStateData> | null | void;

  // React to state changes
  onStateChange?(state: PlayerStateData, prevState: PlayerStateData): void;
}
```

**Example: Volume Limiter Plugin**

```typescript
const volumeLimiterPlugin: MediaFoxPlugin = {
  name: 'volume-limiter',

  hooks: {
    state: {
      beforeStateUpdate(update) {
        // Limit volume to 80%
        if (update.volume !== undefined && update.volume > 0.8) {
          return { ...update, volume: 0.8 };
        }
        return update;
      }
    }
  },

  install(ctx) {
    ctx.log('Volume limited to 80%');
  }
};
```

### Event Hooks

Event hooks allow intercepting and modifying player events before they're emitted.

```typescript
interface EventHooks {
  // Intercept events (can cancel or modify)
  beforeEvent?<K extends keyof PlayerEventMap>(
    event: K,
    data: PlayerEventMap[K]
  ): HookResult<PlayerEventMap[K]> | void;

  // Observe events after emission
  afterEvent?<K extends keyof PlayerEventMap>(
    event: K,
    data: PlayerEventMap[K]
  ): void;
}
```

**Example: Event Logger Plugin**

```typescript
const eventLoggerPlugin: MediaFoxPlugin = {
  name: 'event-logger',

  hooks: {
    event: {
      afterEvent(event, data) {
        console.log(`[MediaFox Event] ${event}:`, data);
      }
    }
  },

  install(ctx) {
    ctx.log('Event logging enabled');
  }
};
```

### Audio Hooks

Audio hooks allow you to modify the Web Audio API graph.

```typescript
interface AudioHooks {
  // Modify audio graph (return modified node)
  onAudioNode?(
    audioContext: AudioContext,
    sourceNode: GainNode
  ): AudioNode | void;
}
```

**Example: Audio Visualizer Plugin**

```typescript
const audioVisualizerPlugin: MediaFoxPlugin = {
  name: 'audio-visualizer',

  hooks: {
    audio: {
      onAudioNode(audioContext, gainNode) {
        // Create analyzer
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;

        // Insert into chain
        gainNode.connect(analyser);

        // Store for visualization
        this.context.setPluginState({ analyser });

        return analyser; // Return the new output node
      }
    },

    render: {
      onOverlay: {
        zIndex: 5,
        render(ctx, time, { width, height }) {
          const state = this.context.getPluginState<{ analyser: AnalyserNode }>();
          if (!state?.analyser) return;

          const dataArray = new Uint8Array(state.analyser.frequencyBinCount);
          state.analyser.getByteFrequencyData(dataArray);

          // Draw visualization
          const barWidth = width / dataArray.length;
          ctx.fillStyle = 'rgba(100, 200, 255, 0.5)';

          for (let i = 0; i < dataArray.length; i++) {
            const barHeight = (dataArray[i] / 255) * 50;
            ctx.fillRect(
              i * barWidth,
              height - barHeight,
              barWidth - 1,
              barHeight
            );
          }
        }
      }
    }
  },

  install(ctx) {
    ctx.log('Audio visualizer enabled');
  }
};
```

## Intercepting Operations

Plugins can cancel or modify player operations using the `HookResult` return type:

```typescript
interface HookResult<T = void> {
  cancel?: boolean;  // Cancel the operation
  data?: T;          // Modified value
}
```

**Example: Seek Blocker Plugin**

```typescript
const seekBlockerPlugin: MediaFoxPlugin = {
  name: 'seek-blocker',

  install(ctx) {
    ctx.setPluginState({ maxTime: 60 }); // Allow seeking up to 60s
  },

  hooks: {
    lifecycle: {
      beforeSeek(time) {
        const state = this.context.getPluginState<{ maxTime: number }>();

        if (time > state.maxTime) {
          // Block seek past allowed time
          this.context.warn(`Seek blocked: ${time}s exceeds limit`);
          return { cancel: true };
        }

        // Or clamp the value
        // return { data: Math.min(time, state.maxTime) };
      }
    }
  }
};
```

## Overlay zIndex

When multiple plugins render overlays, `zIndex` controls the order:

- Higher zIndex renders on top
- Same zIndex renders in plugin registration order
- Default zIndex is 0

```typescript
// Background overlay (behind others)
const backgroundPlugin: MediaFoxPlugin = {
  name: 'background',
  hooks: {
    render: {
      onOverlay: {
        zIndex: -10,
        render(ctx, time, { width, height }) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
          ctx.fillRect(0, 0, width, height);
        }
      }
    }
  },
  install() {}
};

// Foreground overlay (on top)
const watermarkPlugin: MediaFoxPlugin = {
  name: 'watermark',
  hooks: {
    render: {
      onOverlay: {
        zIndex: 100,
        render(ctx, time, { width, height }) {
          ctx.fillText('Watermark', 10, 30);
        }
      }
    }
  },
  install() {}
};
```

## Plugin Dependencies

Plugins can declare dependencies on other plugins:

```typescript
const advancedSubtitlesPlugin: MediaFoxPlugin = {
  name: 'advanced-subtitles',
  dependencies: ['subtitles'], // Requires base subtitles plugin

  install(ctx) {
    const basePlugin = ctx.getPlugin('subtitles');
    // Extend base functionality...
  }
};
```

## Installing and Uninstalling

```typescript
// Install a plugin
await player.use(watermarkPlugin);

// Uninstall by name
await player.unuse('watermark');
```

## Error Handling

Plugin errors are isolated - they won't crash the player or affect other plugins:

```typescript
const buggyPlugin: MediaFoxPlugin = {
  name: 'buggy',
  hooks: {
    lifecycle: {
      afterPlay() {
        throw new Error('Oops!');
        // Error is caught and logged, player continues working
      }
    }
  },
  install() {}
};
```

## Best Practices

1. **Keep render hooks fast** - They run every frame, avoid heavy computation
2. **Use plugin state** - Don't store state in global variables
3. **Clean up in uninstall** - Release external resources
4. **Log with context** - Use `ctx.log()` for prefixed logs
5. **Handle errors gracefully** - Don't let errors break the player
6. **Use TypeScript** - Full type support for better DX

## TypeScript Types

All plugin types are exported for TypeScript users:

```typescript
import type {
  MediaFoxPlugin,
  PluginContext,
  PluginHooks,
  LifecycleHooks,
  RenderHooks,
  StateHooks,
  EventHooks,
  AudioHooks,
  HookResult,
  MaybePromise,
  OverlayDimensions,
} from '@mediafox/core';
```
