# @mediafox/react

React hooks for [MediaFox](https://github.com/wiedymi/mediafox) Media Player.

## Installation

```bash
npm install @mediafox/react @mediafox/core
# or
bun add @mediafox/react @mediafox/core
# or
yarn add @mediafox/react @mediafox/core
```

## Usage

### Basic Example

```tsx
import { useRef, useEffect } from 'react';
import { useMediaFox } from '@mediafox/react';

function VideoPlayer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { state, play, pause, load } = useMediaFox({
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
import { useMediaFox } from '@mediafox/react';

function VideoPlayer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { state, play, pause, seek, load } = useMediaFox({
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

### `useMediaFox(options?)`

Returns an object with:

- `player` - The MediaFox instance (or null if not initialized)
- `state` - Current player state (reactive)
- `load(source, options?)` - Load a media source
- `play()` - Start playback
- `pause()` - Pause playback
- `seek(time, options?)` - Seek to time in seconds
- `stop()` - Stop playback and reset to start
- `screenshot(options?)` - Capture current frame
- `setRenderTarget(canvas)` - Update render target

### Options

All `PlayerOptions` from `@mediafox/core` plus event handlers:

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
- ✅ SSR safe (lazy loads MediaFox)
- ✅ Fully typed with TypeScript
- ✅ Framework-agnostic core

## License

MIT
