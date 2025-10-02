# @avplay/react

React hooks for [AVPlay](https://github.com/wiedymi/avplay) video player.

## Installation

```bash
npm install @avplay/react @avplay/core
# or
bun add @avplay/react @avplay/core
# or
yarn add @avplay/react @avplay/core
```

## Usage

### Basic Example

```tsx
import { useRef, useEffect } from 'react';
import { useAVPlay } from '@avplay/react';

function VideoPlayer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { state, play, pause, load } = useAVPlay({
    renderTarget: canvasRef.current,
    onError: (error) => console.error('Player error:', error),
  });

  useEffect(() => {
    load('/path/to/video.mp4');
  }, [load]);

  return (
    <div>
      <canvas ref={canvasRef} />
      <div>
        <button onClick={play} disabled={!state?.canPlay}>
          Play
        </button>
        <button onClick={pause}>Pause</button>
        <p>
          {state?.currentTime.toFixed(2)}s / {state?.duration.toFixed(2)}s
        </p>
      </div>
    </div>
  );
}
```

### With Event Handlers

```tsx
import { useAVPlay } from '@avplay/react';

function VideoPlayer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { state, play, pause, seek, load } = useAVPlay({
    renderTarget: canvasRef.current,
    volume: 0.8,
    onPlay: () => console.log('Playing'),
    onPause: () => console.log('Paused'),
    onEnded: () => console.log('Ended'),
    onTimeUpdate: ({ currentTime }) => console.log('Time:', currentTime),
  });

  // ... rest of component
}
```

## API

### `useAVPlay(options?)`

Returns an object with:

- `player` - The AVPlay instance (or null if not initialized)
- `state` - Current player state (reactive)
- `load(source, options?)` - Load a media source
- `play()` - Start playback
- `pause()` - Pause playback
- `seek(time, options?)` - Seek to time in seconds
- `stop()` - Stop playback and reset to start
- `screenshot(options?)` - Capture current frame
- `setRenderTarget(canvas)` - Update render target

### Options

All `PlayerOptions` from `@avplay/core` plus event handlers:

- `onLoadStart`, `onLoadedMetadata`, `onLoadedData`
- `onCanPlay`, `onCanPlayThrough`
- `onPlay`, `onPause`, `onPlaying`, `onEnded`
- `onTimeUpdate`, `onDurationChange`
- `onVolumeChange`, `onRateChange`
- `onSeeking`, `onSeeked`, `onWaiting`
- `onProgress`, `onError`, `onWarning`
- `onTrackChange`, `onStateChange`

## Features

- ✅ Automatic cleanup on unmount
- ✅ Optimized with `useSyncExternalStore` for React 18+
- ✅ SSR safe (lazy loads AVPlay)
- ✅ Fully typed with TypeScript
- ✅ Framework-agnostic core

## License

MIT
