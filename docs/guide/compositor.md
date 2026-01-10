# Video Compositor

The Compositor is a powerful canvas-based compositing engine for layering multiple video and image sources. It's perfect for building video editors, multi-source players, and real-time compositing applications.

## Overview

Unlike the main MediaFox player which focuses on single-source playback, the Compositor lets you:

- Layer multiple videos and images
- Apply transforms (position, scale, rotation, opacity)
- Preview compositions in real-time
- Export individual frames
- Build timeline-based video editors

## Basic Setup

```typescript
import { Compositor } from '@mediafox/core';

// Create compositor with a canvas
const canvas = document.querySelector('canvas');
const compositor = new Compositor({
  canvas,
  width: 1920,
  height: 1080,
  backgroundColor: '#000000'
});
```

## Loading Sources

Load videos, images, and audio into the source pool:

```typescript
// Load a video
const video = await compositor.loadSource('https://example.com/video.mp4');
console.log(`Video duration: ${video.duration}s`);
console.log(`Video size: ${video.width}x${video.height}`);

// Load an image (for overlays, logos, etc.)
const logo = await compositor.loadImage('logo.png');

// Load audio
const music = await compositor.loadAudio('soundtrack.mp3');

// Load from file input
const fileVideo = await compositor.loadSource(fileInput.files[0]);
```

## Rendering Frames

Render a single composition frame:

```typescript
await compositor.render({
  time: 5.0, // Current time in seconds
  layers: [
    // Background video
    {
      source: video,
      sourceTime: 5.0, // Time within the source
      transform: { opacity: 1 },
      zIndex: 0
    },
    // Logo overlay
    {
      source: logo,
      transform: {
        x: 50,
        y: 50,
        scaleX: 0.3,
        scaleY: 0.3,
        opacity: 0.8
      },
      zIndex: 1
    }
  ]
});
```

## Layer Transforms

Each layer can have these transform properties:

```typescript
{
  source: mySource,
  transform: {
    x: 100,          // X position in pixels
    y: 50,           // Y position in pixels
    width: 640,      // Override width
    height: 360,     // Override height
    scaleX: 1.5,     // Horizontal scale
    scaleY: 1.5,     // Vertical scale
    rotation: 45,    // Rotation in degrees
    opacity: 0.8,    // Opacity (0-1)
    anchorX: 0.5,    // Anchor point X (0-1)
    anchorY: 0.5     // Anchor point Y (0-1)
  }
}
```

## Preview Playback

Set up real-time preview with a composition callback:

```typescript
compositor.preview({
  duration: 60, // Total duration in seconds
  fps: 30,
  loop: true,
  getComposition: (time) => {
    // Return composition for any given time
    return {
      time,
      layers: [
        {
          source: video,
          sourceTime: time,
          transform: { opacity: 1 }
        },
        // Show logo only between 5-15 seconds
        ...(time >= 5 && time < 15 ? [{
          source: logo,
          transform: { x: 50, y: 50, opacity: 1 },
          zIndex: 1
        }] : [])
      ]
    };
  }
});

// Control playback
await compositor.play();
compositor.pause();
await compositor.seek(30); // Seek to 30 seconds
```

## Listening to Events

```typescript
compositor.on('timeupdate', ({ currentTime }) => {
  console.log(`Time: ${currentTime.toFixed(2)}s`);
  updateProgressBar(currentTime);
});

compositor.on('play', () => console.log('Playing'));
compositor.on('pause', () => console.log('Paused'));
compositor.on('ended', () => console.log('Finished'));

compositor.on('sourceloaded', ({ id, source }) => {
  console.log(`Loaded: ${id} (${source.duration}s)`);
});
```

## Changing Dimensions

Resize the compositor without losing loaded sources:

```typescript
// Switch to portrait mode
compositor.resize(1080, 1920);

// Common aspect ratios
const PRESETS = {
  '16:9': [1920, 1080],
  '9:16': [1080, 1920],
  '4:3': [1440, 1080],
  '1:1': [1080, 1080],
  '21:9': [2560, 1080]
};

function setAspectRatio(ratio) {
  const [w, h] = PRESETS[ratio];
  compositor.resize(w, h);
}
```

## Exporting Frames

Export the current frame as an image:

```typescript
// Export as PNG
const png = await compositor.exportFrame(compositor.currentTime);

// Export as JPEG with quality
const jpeg = await compositor.exportFrame(15.0, {
  format: 'jpeg',
  quality: 0.9
});

// Download
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

downloadBlob(png, 'frame.png');
```

## Worker Rendering (OffscreenCanvas)

Move compositing work off the main thread with OffscreenCanvas for better performance.

### Basic Setup

The simplest approach is to import the worker URL from the package and pass it to the compositor:

```typescript
import { Compositor } from '@mediafox/core';
import CompositorWorkerUrl from '@mediafox/core/compositor-worker?url';

const compositor = new Compositor({
  canvas,
  width: 1920,
  height: 1080,
  worker: {
    enabled: true,
    url: CompositorWorkerUrl,
    type: 'module'
  }
});
```

### Bundler Configuration

#### Vite

Vite handles the `?url` import automatically. No extra configuration needed for production builds.

For development with local package linking (monorepo or `npm link`), add an alias:

```typescript
// vite.config.ts
export default defineConfig({
  resolve: {
    alias: [
      {
        find: '@mediafox/core/compositor-worker',
        replacement: './node_modules/@mediafox/core/dist/compositor-worker.js'
      }
    ]
  }
});
```

#### Webpack

Use asset modules to get the worker URL:

```typescript
import CompositorWorkerUrl from '@mediafox/core/compositor-worker?url';
// or
const CompositorWorkerUrl = new URL(
  '@mediafox/core/dist/compositor-worker.js',
  import.meta.url
);
```

#### Manual URL

If your bundler doesn't support URL imports, copy the worker file to your public directory and reference it directly:

```typescript
const compositor = new Compositor({
  canvas,
  worker: {
    enabled: true,
    url: '/assets/compositor-worker.js',
    type: 'module'
  }
});
```

### Worker Options

```typescript
interface CompositorWorkerOptions {
  enabled?: boolean;  // Enable worker rendering
  url?: string;       // URL to the worker script
  type?: 'module' | 'classic';  // Worker type (default: 'module')
}
```

### Requirements

Worker rendering requires:
- `HTMLCanvasElement` (not `OffscreenCanvas` as input)
- Browser support for `OffscreenCanvas`
- Browser support for `Worker`

### How It Works

When worker mode is enabled:
1. The canvas is transferred to an OffscreenCanvas in a Web Worker
2. All rendering happens off the main thread
3. Audio playback stays on the main thread for stable WebAudio scheduling
4. Source loading is proxied through the worker

::: warning
`CompositorSource.getFrameAt()` is not available in worker mode since frames are rendered directly in the worker.
:::

### Error Handling

Listen for worker errors:

```typescript
compositor.on('error', (error) => {
  console.error('Compositor error:', error);
});
```

Common issues:
- **Worker not found**: Check that the worker URL is correct and the file is accessible
- **CORS errors**: The worker file must be served from the same origin or with proper CORS headers
- **Module resolution**: Ensure `mediabunny` is available to the worker (it's an external dependency)

## Building a Simple Editor

Here's a pattern for building a timeline-based editor:

```typescript
// Define clips on timeline
interface Clip {
  id: string;
  source: CompositorSource;
  track: number;
  startTime: number;
  duration: number;
  sourceOffset: number;
  transform: LayerTransform;
}

const clips: Clip[] = [];

// Add a clip
async function addClip(file: File, track: number, startTime: number) {
  const source = await compositor.loadSource(file);
  clips.push({
    id: crypto.randomUUID(),
    source,
    track,
    startTime,
    duration: Math.min(source.duration, 10),
    sourceOffset: 0,
    transform: { opacity: 1, scaleX: 1, scaleY: 1 }
  });
  updatePreview();
}

// Configure preview
function updatePreview() {
  const duration = Math.max(...clips.map(c => c.startTime + c.duration), 10);

  compositor.preview({
    duration,
    fps: 30,
    loop: true,
    getComposition: (time) => {
      const visibleClips = clips
        .filter(c => time >= c.startTime && time < c.startTime + c.duration)
        .sort((a, b) => a.track - b.track);

      const layers = visibleClips.map((clip, i) => ({
        source: clip.source,
        sourceTime: time - clip.startTime + clip.sourceOffset,
        transform: clip.transform,
        zIndex: i
      }));

      return { time, layers };
    }
  });
}

// Playback controls
document.querySelector('#play').onclick = () => compositor.play();
document.querySelector('#pause').onclick = () => compositor.pause();
```

## Cleanup

Always dispose the compositor when done:

```typescript
// In a component's cleanup/unmount
compositor.dispose();
```

## Try It Out

Check out the [Playground](/playground) for a fully working video editor demo built with the Compositor.

## Next Steps

- [Compositor API Reference](/api/compositor) - Complete API documentation
- [Events](/guide/events) - Event handling patterns
- [Performance](/guide/performance) - Optimization tips
