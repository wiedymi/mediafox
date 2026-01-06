# Compositor API

The Compositor is a canvas-based video compositing engine for layering multiple media sources with transforms, opacity, and rotation. It's designed for building video editors, multi-source players, and compositing applications.

## Constructor

### `new Compositor(options)`

Creates a new Compositor instance.

<div class="method-signature">

```typescript
constructor(options: CompositorOptions)
```

</div>

#### Options

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `canvas` | `HTMLCanvasElement \| OffscreenCanvas` | Required | Canvas element for rendering |
| `width` | `number` | Canvas width or 1920 | Output width in pixels |
| `height` | `number` | Canvas height or 1080 | Output height in pixels |
| `backgroundColor` | `string` | `'#000000'` | Background color (CSS color string) |

#### Example

```typescript
import { Compositor } from '@mediafox/core';

const canvas = document.querySelector('canvas');
const compositor = new Compositor({
  canvas,
  width: 1920,
  height: 1080,
  backgroundColor: '#000000'
});
```

## Source Management

### `loadSource(source, options?)`

Loads a video source into the compositor's source pool.

<div class="method-signature">

```typescript
async loadSource(
  source: MediaSource,
  options?: CompositorSourceOptions
): Promise<CompositorSource>
```

</div>

**Parameters:**
- `source`: Video source (URL, File, Blob, or MediaStream)
- `options`: Optional loading configuration

**Returns:** The loaded compositor source

**Example:**

```typescript
// Load from URL
const video = await compositor.loadSource('https://example.com/video.mp4');

// Load from file
const fileSource = await compositor.loadSource(fileInput.files[0]);

console.log(`Duration: ${video.duration}s`);
console.log(`Size: ${video.width}x${video.height}`);
```

### `loadImage(source)`

Loads an image source into the compositor's source pool.

<div class="method-signature">

```typescript
async loadImage(source: string | Blob | File): Promise<CompositorSource>
```

</div>

**Parameters:**
- `source`: Image source (URL, File, or Blob)

**Returns:** The loaded compositor source

**Example:**

```typescript
const image = await compositor.loadImage('https://example.com/overlay.png');
```

### `loadAudio(source, options?)`

Loads an audio source into the compositor's source pool.

<div class="method-signature">

```typescript
async loadAudio(
  source: MediaSource,
  options?: CompositorSourceOptions
): Promise<CompositorSource>
```

</div>

**Parameters:**
- `source`: Audio source (URL, File, Blob, or MediaStream)
- `options`: Optional loading configuration

**Returns:** The loaded compositor source

**Example:**

```typescript
const audio = await compositor.loadAudio('https://example.com/music.mp3');
```

### `unloadSource(id)`

Unloads a source from the compositor's source pool.

<div class="method-signature">

```typescript
unloadSource(id: string): boolean
```

</div>

**Parameters:**
- `id`: The source ID to unload

**Returns:** True if the source was found and unloaded

**Example:**

```typescript
compositor.unloadSource(video.id);
```

### `getSource(id)`

Gets a source by ID from the source pool.

<div class="method-signature">

```typescript
getSource(id: string): CompositorSource | undefined
```

</div>

**Example:**

```typescript
const source = compositor.getSource('source-id');
if (source) {
  console.log(`Found source: ${source.id}`);
}
```

### `getAllSources()`

Gets all sources currently loaded in the source pool.

<div class="method-signature">

```typescript
getAllSources(): CompositorSource[]
```

</div>

**Example:**

```typescript
const sources = compositor.getAllSources();
console.log(`Loaded ${sources.length} sources`);
```

## Rendering

### `render(frame)`

Renders a composition frame to the canvas. Fetches all layer frames in parallel before drawing to prevent flicker.

<div class="method-signature">

```typescript
async render(frame: CompositionFrame): Promise<boolean>
```

</div>

**Parameters:**
- `frame`: The composition frame to render

**Returns:** True if rendering succeeded

**Example:**

```typescript
await compositor.render({
  time: 5.0,
  layers: [
    {
      source: backgroundVideo,
      transform: { opacity: 1 }
    },
    {
      source: overlayImage,
      transform: {
        x: 100,
        y: 50,
        scaleX: 0.5,
        scaleY: 0.5,
        opacity: 0.8,
        rotation: 15
      },
      zIndex: 1
    }
  ]
});
```

### `clear()`

Clears the canvas with the background color.

<div class="method-signature">

```typescript
clear(): void
```

</div>

## Preview Playback

The compositor includes a built-in playback system for previewing compositions.

### `preview(options)`

Configures the preview playback with a composition callback. Must be called before `play()` or `seek()`.

<div class="method-signature">

```typescript
preview(options: PreviewOptions): void
```

</div>

**Parameters:**
- `options.duration`: Total duration in seconds
- `options.loop`: Whether to loop playback (optional)
- `options.getComposition`: Callback that returns the composition for a given time

**Example:**

```typescript
compositor.preview({
  duration: 30,
  loop: true,
  getComposition: (time) => ({
    time,
    layers: [
      {
        source: video1,
        sourceTime: time,
        transform: { opacity: 1 }
      },
      {
        source: overlay,
        transform: {
          x: 100,
          y: 50,
          opacity: time < 10 ? 1 : 0 // Hide after 10 seconds
        },
        zIndex: 1
      }
    ]
  })
});
```

### `play()`

Starts playback of the preview composition.

<div class="method-signature">

```typescript
async play(): Promise<void>
```

</div>

**Throws:** Error if `preview()` has not been called first

**Example:**

```typescript
await compositor.play();
```

### `pause()`

Pauses playback of the preview composition.

<div class="method-signature">

```typescript
pause(): void
```

</div>

**Example:**

```typescript
compositor.pause();
```

### `seek(time)`

Seeks to a specific time in the preview composition.

<div class="method-signature">

```typescript
async seek(time: number): Promise<void>
```

</div>

**Parameters:**
- `time`: Time in seconds to seek to

**Example:**

```typescript
await compositor.seek(15.5); // Seek to 15.5 seconds
```

## Frame Export

### `exportFrame(time, options?)`

Exports a single frame at the specified time as an image blob.

<div class="method-signature">

```typescript
async exportFrame(
  time: number,
  options?: FrameExportOptions
): Promise<Blob | null>
```

</div>

**Parameters:**
- `time`: Time in seconds to export
- `options.format`: Image format ('png', 'jpeg', 'webp')
- `options.quality`: JPEG/WebP quality (0-1)

**Returns:** Image blob or null if export failed

**Example:**

```typescript
// Export PNG
const png = await compositor.exportFrame(5.0);

// Export JPEG with quality
const jpeg = await compositor.exportFrame(5.0, {
  format: 'jpeg',
  quality: 0.9
});

// Download the frame
const url = URL.createObjectURL(png);
const a = document.createElement('a');
a.href = url;
a.download = 'frame.png';
a.click();
URL.revokeObjectURL(url);
```

## State Properties

| Property | Type | Description |
|----------|------|-------------|
| `currentTime` | `number` | Current playback time in seconds |
| `duration` | `number` | Total duration of the preview composition in seconds |
| `playing` | `boolean` | Whether the compositor is currently playing |
| `paused` | `boolean` | Whether the compositor is currently paused |
| `seeking` | `boolean` | Whether the compositor is currently seeking |

**Example:**

```typescript
console.log(`Time: ${compositor.currentTime}/${compositor.duration}`);
console.log(`Playing: ${compositor.playing}`);
```

## Dimension Methods

### `getWidth()`

Gets the current canvas width.

<div class="method-signature">

```typescript
getWidth(): number
```

</div>

**Returns:** Width in pixels

### `getHeight()`

Gets the current canvas height.

<div class="method-signature">

```typescript
getHeight(): number
```

</div>

**Returns:** Height in pixels

### `resize(width, height)`

Resizes the compositor canvas without disposing loaded sources.

<div class="method-signature">

```typescript
resize(width: number, height: number): void
```

</div>

**Parameters:**
- `width`: New width in pixels
- `height`: New height in pixels

**Example:**

```typescript
// Change to portrait orientation
compositor.resize(1080, 1920);

// Change aspect ratio presets
const PRESETS = {
  '16:9': [1920, 1080],
  '9:16': [1080, 1920],
  '4:3': [1440, 1080],
  '1:1': [1080, 1080]
};

compositor.resize(...PRESETS['9:16']);
```

## Events

### `on(event, listener)`

Subscribes to a compositor event.

<div class="method-signature">

```typescript
on<K extends keyof CompositorEventMap>(
  event: K,
  listener: CompositorEventListener<K>
): () => void
```

</div>

**Returns:** Unsubscribe function

### `once(event, listener)`

Subscribes to a compositor event for a single invocation.

<div class="method-signature">

```typescript
once<K extends keyof CompositorEventMap>(
  event: K,
  listener: CompositorEventListener<K>
): () => void
```

</div>

**Returns:** Unsubscribe function

### `off(event, listener?)`

Unsubscribes from a compositor event.

<div class="method-signature">

```typescript
off<K extends keyof CompositorEventMap>(
  event: K,
  listener?: CompositorEventListener<K>
): void
```

</div>

### Event Types

| Event | Data Type | Description |
|-------|-----------|-------------|
| `play` | `void` | Playback started |
| `pause` | `void` | Playback paused |
| `ended` | `void` | Playback ended |
| `seeking` | `{ time: number }` | Seeking started |
| `seeked` | `{ time: number }` | Seeking completed |
| `timeupdate` | `{ currentTime: number }` | Playback time changed |
| `compositionchange` | `void` | Composition configuration changed |
| `sourceloaded` | `{ id: string, source: CompositorSource }` | Source loaded |
| `sourceunloaded` | `{ id: string }` | Source unloaded |

**Example:**

```typescript
compositor.on('timeupdate', ({ currentTime }) => {
  updateTimeline(currentTime);
});

compositor.on('ended', () => {
  console.log('Playback finished');
});

compositor.on('sourceloaded', ({ id, source }) => {
  console.log(`Loaded source ${id}: ${source.duration}s`);
});
```

## Lifecycle

### `dispose()`

Disposes the compositor and releases all resources. After disposal, the compositor cannot be used.

<div class="method-signature">

```typescript
dispose(): void
```

</div>

**Example:**

```typescript
compositor.dispose();
```

## Type Definitions

### CompositorSource

A loaded media source.

```typescript
interface CompositorSource {
  id: string;
  type: 'video' | 'image' | 'audio';
  duration: number;
  width?: number;
  height?: number;
  getFrameAt(time: number): Promise<CanvasImageSource | null>;
}
```

### CompositionFrame

A single frame of the composition.

```typescript
interface CompositionFrame {
  time: number;
  layers: CompositorLayer[];
}
```

### CompositorLayer

A layer in the composition.

```typescript
interface CompositorLayer {
  source: CompositorSource;
  sourceTime?: number;      // Time in source (defaults to frame time)
  transform?: LayerTransform;
  zIndex?: number;          // Layer order (higher = on top)
  visible?: boolean;        // Whether to render (default: true)
}
```

### LayerTransform

Transform properties for a layer.

```typescript
interface LayerTransform {
  x?: number;           // X position (default: 0)
  y?: number;           // Y position (default: 0)
  width?: number;       // Override width
  height?: number;      // Override height
  scaleX?: number;      // Horizontal scale (default: 1)
  scaleY?: number;      // Vertical scale (default: 1)
  rotation?: number;    // Rotation in degrees (default: 0)
  opacity?: number;     // Opacity 0-1 (default: 1)
  anchorX?: number;     // Anchor point X 0-1 (default: 0.5)
  anchorY?: number;     // Anchor point Y 0-1 (default: 0.5)
}
```

### PreviewOptions

Options for preview playback.

```typescript
interface PreviewOptions {
  duration: number;
  loop?: boolean;
  getComposition: (time: number) => CompositionFrame;
}
```

### FrameExportOptions

Options for frame export.

```typescript
interface FrameExportOptions {
  format?: 'png' | 'jpeg' | 'webp';
  quality?: number;  // 0-1, for JPEG/WebP
}
```

## Complete Example

Here's a complete example of building a simple video editor preview:

```typescript
import { Compositor } from '@mediafox/core';

// Setup
const canvas = document.querySelector('canvas');
const compositor = new Compositor({
  canvas,
  width: 1920,
  height: 1080
});

// Load sources
const background = await compositor.loadSource('background.mp4');
const overlay = await compositor.loadImage('logo.png');
const music = await compositor.loadAudio('soundtrack.mp3');

// Define clips on timeline
const clips = [
  { source: background, start: 0, duration: 30 },
  { source: overlay, start: 5, duration: 10, x: 50, y: 50, scale: 0.3 }
];

// Configure preview
compositor.preview({
  duration: 30,
  loop: false,
  getComposition: (time) => {
    const layers = clips
      .filter(clip => time >= clip.start && time < clip.start + clip.duration)
      .map((clip, i) => ({
        source: clip.source,
        sourceTime: time - clip.start,
        transform: {
          x: clip.x ?? 0,
          y: clip.y ?? 0,
          scaleX: clip.scale ?? 1,
          scaleY: clip.scale ?? 1,
          opacity: 1
        },
        zIndex: i
      }));

    return { time, layers };
  }
});

// Playback controls
document.querySelector('#play').onclick = () => compositor.play();
document.querySelector('#pause').onclick = () => compositor.pause();
document.querySelector('#seek').oninput = (e) => {
  compositor.seek(parseFloat(e.target.value));
};

// Update UI
compositor.on('timeupdate', ({ currentTime }) => {
  document.querySelector('#time').textContent = currentTime.toFixed(2);
  document.querySelector('#seek').value = currentTime;
});

// Export frame
document.querySelector('#export').onclick = async () => {
  const blob = await compositor.exportFrame(compositor.currentTime);
  // Download blob...
};

// Cleanup
window.addEventListener('beforeunload', () => {
  compositor.dispose();
});
```
