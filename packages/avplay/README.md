# AVPlay

A framework-agnostic, TypeScript-first video player library powered by [Mediabunny](https://github.com/Vanilagy/mediabunny). AVPlay provides an ergonomic API for media playback with complete control over rendering and UI.

## Features

- **Framework Agnostic** - Works with React, Vue, Angular, or vanilla JavaScript
- **Complete Media Support** - Video, audio, and subtitle tracks
- **Performance First** - Efficient frame buffering and audio scheduling
- **Small & Tree-shakable** - Only include what you use
- **UI Flexibility** - You control the interface completely
- **TypeScript Native** - Full type safety and excellent IDE support
- **Advanced Features** - Screenshot, frame extraction, quality switching
- **Plugin System** - Extend functionality easily

## Installation

```bash
bun add @avplay/core mediabunny
# or
npm install @avplay/core mediabunny
# or
yarn add @avplay/core mediabunny
```

> **Note:** Mediabunny is a peer dependency. You need to install it alongside @avplay/core.

## Quick Start

```typescript
import { AVPlay } from '@avplay/core';

// Create player instance
const player = new AVPlay({
  renderTarget: document.querySelector('canvas'),
  volume: 0.8
});

// Load media
await player.load(videoFile); // File, Blob, URL, or ArrayBuffer

// Control playback
await player.play();
player.pause();
player.currentTime = 30; // Seek to 30 seconds
player.volume = 0.5;

// Subscribe to state changes
player.subscribe(state => {
  console.log(`Time: ${state.currentTime}/${state.duration}`);
  console.log(`State: ${state.state}`);
});

// Handle events
player.on('play', () => console.log('Playing'));
player.on('pause', () => console.log('Paused'));
player.on('timeupdate', ({ currentTime }) => {
  updateProgressBar(currentTime);
});
```

## Framework Packages

For React applications, use the dedicated React package:

```bash
npm install @avplay/react @avplay/core mediabunny
```

```tsx
import { useAVPlay } from '@avplay/react';

function VideoPlayer({ src }: { src: File | string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { player, state, play, pause } = useAVPlay({
    renderTarget: canvasRef.current,
    onError: (error) => console.error(error)
  });

  // ...
}
```

## Framework Integration Examples

### React (using core package)

```tsx
import { useEffect, useRef, useState } from 'react';
import { AVPlay, type PlayerStateData } from '@avplay/core';

function VideoPlayer({ src }: { src: File | string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<AVPlay>();
  const [state, setState] = useState<PlayerStateData>();

  useEffect(() => {
    const player = new AVPlay({
      renderTarget: canvasRef.current!
    });

    playerRef.current = player;

    // Subscribe to state changes
    const subscription = player.subscribe(setState);

    // Load media
    player.load(src);

    return () => {
      subscription.unsubscribe();
      player.dispose();
    };
  }, [src]);

  return (
    <div>
      <canvas ref={canvasRef} />
      <div>
        <button onClick={() => playerRef.current?.play()}>Play</button>
        <button onClick={() => playerRef.current?.pause()}>Pause</button>
        <div>{state?.currentTime} / {state?.duration}</div>
      </div>
    </div>
  );
}
```

### Vue 3

```vue
<template>
  <div>
    <canvas ref="canvasRef" />
    <div>
      <button @click="play">Play</button>
      <button @click="pause">Pause</button>
      <div>{{ currentTime }} / {{ duration }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { AVPlay } from '@avplay/core';

const props = defineProps<{ src: File | string }>();

const canvasRef = ref<HTMLCanvasElement>();
const player = ref<AVPlay>();
const currentTime = ref(0);
const duration = ref(0);

onMounted(async () => {
  player.value = new AVPlay({
    renderTarget: canvasRef.value
  });

  player.value.subscribe(state => {
    currentTime.value = state.currentTime;
    duration.value = state.duration;
  });

  await player.value.load(props.src);
});

onUnmounted(() => {
  player.value?.dispose();
});

const play = () => player.value?.play();
const pause = () => player.value?.pause();
</script>
```

## Advanced Usage

### Track Management

```typescript
// Get available tracks
const videoTracks = player.getVideoTracks();
const audioTracks = player.getAudioTracks();

// Switch tracks
await player.selectVideoTrack(videoTracks[0].id);
await player.selectAudioTrack(audioTracks[1].id);

// Track info
videoTracks.forEach(track => {
  console.log(`${track.codec} ${track.width}x${track.height} @${track.frameRate}fps`);
});
```

### Screenshot & Frame Extraction

```typescript
// Take screenshot at current time
const blob = await player.screenshot({
  format: 'png',
  quality: 0.9
});

// Extract specific frame
player.currentTime = 10.5;
const frameBlob = await player.screenshot();
```

### Event Handling

```typescript
// All events are strongly typed
player.on('loadedmetadata', (info) => {
  console.log(`Duration: ${info.duration}`);
  console.log(`Format: ${info.format}`);
  console.log(`Has video: ${info.hasVideo}`);
  console.log(`Has audio: ${info.hasAudio}`);
});

player.on('error', (error) => {
  console.error('Playback error:', error);
});

player.on('trackchange', ({ type, trackId }) => {
  console.log(`${type} track changed to ${trackId}`);
});
```

### Custom Rendering

```typescript
// Use your own canvas
const canvas = document.createElement('canvas');
player.setRenderTarget(canvas);

// Or use OffscreenCanvas for worker rendering
const offscreen = canvas.transferControlToOffscreen();
player.setRenderTarget(offscreen);
```

## API Reference

### Constructor Options

```typescript
interface PlayerOptions {
  renderTarget?: HTMLCanvasElement | OffscreenCanvas;
  audioContext?: AudioContext;
  volume?: number;
  muted?: boolean;
  playbackRate?: number;
  autoplay?: boolean;
  preload?: 'none' | 'metadata' | 'auto';
  crossOrigin?: string;
  maxCacheSize?: number;
}
```

### Main Methods

- `load(source: MediaSource, options?: LoadOptions): Promise<void>` - Load media file
- `play(): Promise<void>` - Start playback
- `pause(): void` - Pause playback
- `seek(time: number): Promise<void>` - Seek to time
- `stop(): void` - Stop playback and reset
- `screenshot(options?: ScreenshotOptions): Promise<Blob>` - Take screenshot
- `dispose(): void` - Clean up resources
- `destroy(): void` - Destroy player completely

### Properties

- `currentTime: number` - Current playback position
- `duration: number` - Total duration (readonly)
- `volume: number` - Volume level (0-1)
- `muted: boolean` - Mute state
- `playbackRate: number` - Playback speed
- `paused: boolean` - Pause state (readonly)
- `ended: boolean` - Ended state (readonly)
- `seeking: boolean` - Seeking state (readonly)

### State Management

```typescript
// Subscribe to all state changes
const subscription = player.subscribe(state => {
  // state contains all player state
});

// Get current state
const state = player.getState();

// Unsubscribe
subscription.unsubscribe();
```

### Events

All events follow the pattern:
```typescript
player.on(eventName, callback);
player.once(eventName, callback);
player.off(eventName, callback);
```

Available events:
- `loadstart`, `loadedmetadata`, `loadeddata`, `canplay`, `canplaythrough`
- `play`, `pause`, `playing`, `ended`
- `timeupdate`, `durationchange`, `volumechange`, `ratechange`
- `seeking`, `seeked`, `waiting`, `progress`
- `error`, `trackchange`, `qualitychange`, `resize`

## Browser Support

AVPlay requires a modern browser with support for:
- WebCodecs API
- Web Audio API
- Canvas API
- ES2022+

## License

MIT

## Credits

Powered by [Mediabunny](https://github.com/Vanilagy/mediabunny) - the powerful media processing library for the web.
