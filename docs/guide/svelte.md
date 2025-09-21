# Svelte Integration Guide

This guide shows how to integrate XiaoMei with Svelte applications for a reactive video player experience.

## Installation

First, install XiaoMei in your Svelte project:

```bash
bun add @vivysub/xiaomei
# or
npm install @vivysub/xiaomei
# or
yarn add @vivysub/xiaomei
```

## Basic Svelte Component

Here's a basic Svelte component that wraps XiaoMei:

```svelte
<!-- VideoPlayer.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { writable } from 'svelte/store';
  import { XiaoMei, type PlayerState } from '@vivysub/xiaomei';

  export let src: string;
  export let autoplay = false;
  export let muted = false;

  let canvasElement: HTMLCanvasElement;
  let player: XiaoMei | null = null;

  // Reactive stores for player state
  const playerState = writable<PlayerState | null>(null);
  const isPlaying = writable(false);
  const currentTime = writable(0);
  const duration = writable(0);
  const volume = writable(1);

  onMount(async () => {
    if (canvasElement) {
      player = new XiaoMei({
        canvas: canvasElement,
        autoplay,
        muted
      });

      // Subscribe to state changes
      player.store.subscribe((state) => {
        playerState.set(state);
        isPlaying.set(state.playing);
        currentTime.set(state.currentTime);
        duration.set(state.duration);
        volume.set(state.volume);
      });

      // Load the source
      await player.load(src);
    }
  });

  onDestroy(() => {
    if (player) {
      player.destroy();
    }
  });

  function togglePlay() {
    if (player) {
      if ($isPlaying) {
        player.pause();
      } else {
        player.play();
      }
    }
  }

  function seek(event: Event) {
    if (player) {
      const target = event.target as HTMLInputElement;
      const time = parseFloat(target.value);
      player.seek(time);
    }
  }

  function changeVolume(event: Event) {
    if (player) {
      const target = event.target as HTMLInputElement;
      const vol = parseFloat(target.value);
      player.volume = vol;
    }
  }

  // Reactive statement to update src
  $: if (player && src) {
    player.load(src);
  }
</script>

<div class="video-player">
  <canvas bind:this={canvasElement}></canvas>

  <div class="controls">
    <button on:click={togglePlay}>
      {$isPlaying ? 'Pause' : 'Play'}
    </button>

    <input
      type="range"
      min="0"
      max={$duration}
      value={$currentTime}
      on:input={seek}
      class="seek-bar"
    />

    <span class="time">
      {Math.floor($currentTime)}s / {Math.floor($duration)}s
    </span>

    <input
      type="range"
      min="0"
      max="1"
      step="0.1"
      value={$volume}
      on:input={changeVolume}
      class="volume-bar"
    />
  </div>
</div>

<style>
  .video-player {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  canvas {
    width: 100%;
    height: auto;
    background: black;
  }

  .controls {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px;
    background: #f0f0f0;
    border-radius: 5px;
  }

  .seek-bar {
    flex: 1;
  }

  .volume-bar {
    width: 100px;
  }

  button {
    padding: 8px 16px;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  button:hover {
    background: #0056b3;
  }
</style>
```

## Advanced Svelte Component with Stores

For more complex applications, you can create dedicated stores for different aspects:

```svelte
<!-- AdvancedVideoPlayer.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { createPlayerStore } from './stores/playerStore';
  import { createControlsStore } from './stores/controlsStore';
  import VideoControls from './VideoControls.svelte';
  import VideoInfo from './VideoInfo.svelte';

  export let src: string;
  export let config: any = {};

  let canvasElement: HTMLCanvasElement;

  const playerStore = createPlayerStore();
  const controlsStore = createControlsStore();

  onMount(async () => {
    if (canvasElement) {
      await playerStore.initialize(canvasElement, config);
      await playerStore.load(src);
    }
  });

  onDestroy(() => {
    playerStore.destroy();
  });

  // Reactive statement for source changes
  $: if ($playerStore.player && src) {
    playerStore.load(src);
  }
</script>

<div class="advanced-player">
  <div class="video-container">
    <canvas bind:this={canvasElement}></canvas>

    {#if $controlsStore.showControls}
      <VideoControls
        {playerStore}
        {controlsStore}
      />
    {/if}
  </div>

  <VideoInfo
    state={$playerStore.state}
    tracks={$playerStore.tracks}
  />
</div>

<style>
  .advanced-player {
    position: relative;
    width: 100%;
  }

  .video-container {
    position: relative;
    width: 100%;
    background: black;
  }

  canvas {
    width: 100%;
    height: auto;
    display: block;
  }
</style>
```

## Custom Stores

Create dedicated stores for better state management:

```typescript
// stores/playerStore.ts
import { writable, derived } from 'svelte/store';
import { XiaoMei, type PlayerState } from '@vivysub/xiaomei';

export function createPlayerStore() {
  const { subscribe, set, update } = writable({
    player: null as XiaoMei | null,
    state: null as PlayerState | null,
    tracks: [] as any[],
    loading: false,
    error: null as Error | null
  });

  return {
    subscribe,

    async initialize(canvas: HTMLCanvasElement, config: any = {}) {
      update(store => ({ ...store, loading: true }));

      try {
        const player = new XiaoMei({
          canvas,
          ...config
        });

        player.store.subscribe((state) => {
          update(store => ({ ...store, state }));
        });

        player.on('tracksChanged', (tracks) => {
          update(store => ({ ...store, tracks }));
        });

        update(store => ({
          ...store,
          player,
          loading: false
        }));
      } catch (error) {
        update(store => ({
          ...store,
          error: error as Error,
          loading: false
        }));
      }
    },

    async load(src: string) {
      update(store => {
        if (store.player) {
          store.player.load(src);
        }
        return store;
      });
    },

    play() {
      update(store => {
        if (store.player) {
          store.player.play();
        }
        return store;
      });
    },

    pause() {
      update(store => {
        if (store.player) {
          store.player.pause();
        }
        return store;
      });
    },

    seek(time: number) {
      update(store => {
        if (store.player) {
          store.player.seek(time);
        }
        return store;
      });
    },

    destroy() {
      update(store => {
        if (store.player) {
          store.player.destroy();
        }
        return { ...store, player: null };
      });
    }
  };
}
```

```typescript
// stores/controlsStore.ts
import { writable } from 'svelte/store';

export function createControlsStore() {
  const { subscribe, set, update } = writable({
    showControls: true,
    fullscreen: false,
    volume: 1,
    muted: false,
    playbackRate: 1
  });

  return {
    subscribe,

    toggleControls() {
      update(store => ({
        ...store,
        showControls: !store.showControls
      }));
    },

    toggleFullscreen() {
      update(store => ({
        ...store,
        fullscreen: !store.fullscreen
      }));
    },

    setVolume(volume: number) {
      update(store => ({ ...store, volume }));
    },

    toggleMute() {
      update(store => ({
        ...store,
        muted: !store.muted
      }));
    },

    setPlaybackRate(rate: number) {
      update(store => ({ ...store, playbackRate: rate }));
    }
  };
}
```

## Derived Stores

Use derived stores for computed values:

```typescript
// stores/derivedStores.ts
import { derived } from 'svelte/store';
import type { Readable } from 'svelte/store';

export function createDerivedStores(playerStore: any): {
  isPlaying: Readable<boolean>;
  progress: Readable<number>;
  timeRemaining: Readable<number>;
  formattedTime: Readable<string>;
} {
  const isPlaying = derived(
    playerStore,
    $playerStore => $playerStore.state?.playing ?? false
  );

  const progress = derived(
    playerStore,
    $playerStore => {
      const state = $playerStore.state;
      if (!state || state.duration === 0) return 0;
      return (state.currentTime / state.duration) * 100;
    }
  );

  const timeRemaining = derived(
    playerStore,
    $playerStore => {
      const state = $playerStore.state;
      if (!state) return 0;
      return state.duration - state.currentTime;
    }
  );

  const formattedTime = derived(
    playerStore,
    $playerStore => {
      const state = $playerStore.state;
      if (!state) return '0:00 / 0:00';

      const current = formatTime(state.currentTime);
      const total = formatTime(state.duration);
      return `${current} / ${total}`;
    }
  );

  return {
    isPlaying,
    progress,
    timeRemaining,
    formattedTime
  };
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
```

## Event Handling

Handle player events reactively:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { XiaoMei } from '@vivysub/xiaomei';

  let player: XiaoMei;
  let events: string[] = [];

  onMount(() => {
    player = new XiaoMei({ canvas: canvasElement });

    // Listen to all events
    player.on('play', () => addEvent('Play started'));
    player.on('pause', () => addEvent('Playback paused'));
    player.on('seeking', () => addEvent('Seeking...'));
    player.on('seeked', () => addEvent('Seek completed'));
    player.on('ended', () => addEvent('Playback ended'));
    player.on('error', (error) => addEvent(`Error: ${error.message}`));
    player.on('loadstart', () => addEvent('Loading started'));
    player.on('loadeddata', () => addEvent('Data loaded'));
    player.on('canplay', () => addEvent('Can start playing'));
    player.on('timeupdate', (time) => {
      // Throttle time updates
      if (Math.floor(time) !== Math.floor(lastTime)) {
        addEvent(`Time: ${Math.floor(time)}s`);
        lastTime = time;
      }
    });
  });

  function addEvent(message: string) {
    events = [...events.slice(-9), `${new Date().toLocaleTimeString()}: ${message}`];
  }

  let lastTime = 0;
  let canvasElement: HTMLCanvasElement;
</script>

<div>
  <canvas bind:this={canvasElement}></canvas>

  <div class="events-log">
    <h3>Events Log</h3>
    {#each events as event}
      <div class="event">{event}</div>
    {/each}
  </div>
</div>
```

## SvelteKit Integration

For SvelteKit applications, handle SSR properly:

```svelte
<!-- +page.svelte -->
<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import VideoPlayer from '$lib/components/VideoPlayer.svelte';

  let mounted = false;

  onMount(() => {
    mounted = true;
  });
</script>

{#if browser && mounted}
  <VideoPlayer
    src="/video.mp4"
    autoplay={false}
    muted={true}
  />
{:else}
  <div class="loading">Loading video player...</div>
{/if}
```

## TypeScript Support

XiaoMei provides full TypeScript support. Create typed components:

```svelte
<script lang="ts">
  import type { XiaoMei, PlayerState, PlayerEvents } from '@vivysub/xiaomei';

  interface PlayerProps {
    src: string;
    autoplay?: boolean;
    muted?: boolean;
    onStateChange?: (state: PlayerState) => void;
    onEvent?: (event: keyof PlayerEvents, data: any) => void;
  }

  export let src: PlayerProps['src'];
  export let autoplay: PlayerProps['autoplay'] = false;
  export let muted: PlayerProps['muted'] = false;
  export let onStateChange: PlayerProps['onStateChange'] = undefined;
  export let onEvent: PlayerProps['onEvent'] = undefined;

  let player: XiaoMei;
  let state: PlayerState | null = null;

  // Rest of component logic...
</script>
```

## Best Practices

1. **Store Management**: Use dedicated stores for different concerns (player, controls, UI state)
2. **Memory Management**: Always destroy the player in `onDestroy`
3. **SSR**: Check for browser environment before initializing
4. **Error Handling**: Implement proper error boundaries and user feedback
5. **Performance**: Use derived stores for computed values to avoid unnecessary reactivity
6. **TypeScript**: Leverage XiaoMei's type definitions for better development experience

## Common Patterns

### Loading States

```svelte
<script lang="ts">
  let loading = true;
  let error: Error | null = null;

  async function loadVideo() {
    try {
      loading = true;
      await player.load(src);
    } catch (err) {
      error = err as Error;
    } finally {
      loading = false;
    }
  }
</script>

{#if loading}
  <div class="spinner">Loading...</div>
{:else if error}
  <div class="error">Error: {error.message}</div>
{:else}
  <!-- Player content -->
{/if}
```

### Keyboard Shortcuts

```svelte
<script lang="ts">
  function handleKeydown(event: KeyboardEvent) {
    if (!player) return;

    switch (event.code) {
      case 'Space':
        event.preventDefault();
        player.playing ? player.pause() : player.play();
        break;
      case 'ArrowLeft':
        event.preventDefault();
        player.seek(player.currentTime - 10);
        break;
      case 'ArrowRight':
        event.preventDefault();
        player.seek(player.currentTime + 10);
        break;
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />
```

This guide provides the foundation for integrating XiaoMei with Svelte applications, offering both simple and advanced patterns for different use cases.
