# XiaoMei Player API

## Constructor

### `new XiaoMei(options?)`

Creates a new player instance with comprehensive media playback capabilities.

<div class="method-signature">

```typescript
constructor(options?: PlayerOptions)
```

</div>

#### Options

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `renderTarget` | `HTMLCanvasElement \| OffscreenCanvas` | `undefined` | Canvas element for video rendering |
| `audioContext` | `AudioContext` | `undefined` | Audio context for audio playback |
| `volume` | `number` | `1` | Initial volume level (0-1) |
| `muted` | `boolean` | `false` | Initial mute state |
| `playbackRate` | `number` | `1` | Initial playback speed (0.25-4) |
| `autoplay` | `boolean` | `false` | Auto-play when media loads |
| `preload` | `'none' \| 'metadata' \| 'auto'` | `'metadata'` | Preloading strategy |
| `crossOrigin` | `string` | `undefined` | CORS setting for cross-origin content |
| `maxCacheSize` | `number` | `undefined` | Maximum cache size for buffering |
| `fallbackDecoder` | `MediaConverterDecoder` | `undefined` | Decoder for unsupported codecs |

#### Example

```typescript
// Basic setup
const player = new XiaoMei({
  renderTarget: document.querySelector('#video-canvas'),
  volume: 0.8,
  autoplay: true
});

// Advanced configuration
const advancedPlayer = new XiaoMei({
  renderTarget: canvas,
  audioContext: new AudioContext(),
  volume: 0.7,
  muted: false,
  playbackRate: 1.0,
  autoplay: false,
  preload: 'metadata',
  crossOrigin: 'anonymous',
  maxCacheSize: 200 * 1024 * 1024 // 200MB
});
```

## Interactive Demo

Try the player with different configurations:

<div class="demo-container">
  <div class="demo-controls">
    <label>
      <input type="checkbox" id="demo-autoplay" checked>
      Autoplay
    </label>
    <label>
      <input type="range" id="demo-volume" min="0" max="1" step="0.1" value="0.8">
      Volume: <span id="demo-volume-value">0.8</span>
    </label>
    <button id="demo-load-btn">Load Sample Video</button>
  </div>
  <div class="demo-player">
    <canvas id="demo-canvas" width="640" height="360"></canvas>
    <div id="demo-controls" class="demo-controls-hidden">
      <button id="demo-play-pause">Play</button>
      <div class="demo-progress-container">
        <div id="demo-progress-bar"></div>
        <div id="demo-progress-handle"></div>
      </div>
      <span id="demo-time">0:00 / 0:00</span>
    </div>
  </div>
</div>

<!-- <script>
let demoPlayer;
let demoAnimationId;

async function initDemoPlayer() {
  const canvas = document['getElementById']('demo-canvas');
  const autoplay = document['getElementById']('demo-autoplay').checked;
  const volume = parseFloat(document['getElementById']('demo-volume').value);

  if (demoPlayer) {
    demoPlayer.destroy();
  }

  demoPlayer = new XiaoMei({
    renderTarget: canvas,
    autoplay,
    volume
  });

  // Setup demo controls
  setupDemoControls();
}

function setupDemoControls() {
  const playPauseBtn = document['getElementById']('demo-play-pause');
  const progressContainer = document['getElementById']('demo-progress-container');
  const progressBar = document['getElementById']('demo-progress-bar');
  const progressHandle = document['getElementById']('demo-progress-handle');
  const timeDisplay = document['getElementById']('demo-time');

  demoPlayer.on('play', () => {
    playPauseBtn.textContent = 'Pause';
  });

  demoPlayer.on('pause', () => {
    playPauseBtn.textContent = 'Play';
  });

  demoPlayer.on('timeupdate', (currentTime) => {
    const duration = demoPlayer.duration || 0;
    const percentage = duration > 0 ? (currentTime / duration) * 100 : 0;

    progressBar.style.width = percentage + '%';
    progressHandle.style.left = percentage + '%';

    const current = formatTime(currentTime);
    const total = formatTime(duration);
    timeDisplay.textContent = `${current} / ${total}`;
  });

  playPauseBtn.onclick = async () => {
    if (demoPlayer.playing) {
      await demoPlayer.pause();
    } else {
      await demoPlayer.play();
    }
  };

  // Progress bar seeking
  progressContainer.onclick = async (e) => {
    const rect = progressContainer.getBoundingClientRect();
    const percentage = (e.clientX - rect.left) / rect.width;
    const time = percentage * (demoPlayer.duration || 0);
    await demoPlayer.seek(time);
  };
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Initialize demo
document['getElementById']('demo-load-btn').onclick = async () => {
  if (!demoPlayer) {
    await initDemoPlayer();
  }

  try {
    await demoPlayer.load('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4');
  } catch (error) {
    console.error('Failed to load demo video:', error);
    alert('Failed to load demo video. Please check your internet connection.');
  }
};

// Volume control
document['getElementById']('demo-volume').oninput = (e) => {
  const volume = parseFloat(e.target.value);
  document['getElementById']('demo-volume-value').textContent = volume;
  if (demoPlayer) {
    demoPlayer.volume = volume;
  }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  initDemoPlayer();
});
</script> -->

<style>
.demo-container {
  margin: 2rem 0;
  padding: 1rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.demo-controls {
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-bottom: 1rem;
  padding: 0.5rem;
  background: var(--vp-c-bg);
  border-radius: 4px;
}

.demo-controls label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.demo-player {
  position: relative;
  background: #000;
  border-radius: 4px;
  overflow: hidden;
}

#demo-canvas {
  width: 100%;
  height: auto;
  display: block;
}

.demo-controls-hidden {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0,0,0,0.8));
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  opacity: 0;
  transition: opacity 0.3s;
}

.demo-player:hover .demo-controls-hidden {
  opacity: 1;
}

.demo-progress-container {
  flex: 1;
  height: 6px;
  background: rgba(255,255,255,0.3);
  border-radius: 3px;
  cursor: pointer;
  position: relative;
}

#demo-progress-bar {
  height: 100%;
  background: var(--vp-c-brand);
  border-radius: 3px;
  width: 0%;
  transition: width 0.1s ease;
}

#demo-progress-handle {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 12px;
  height: 12px;
  background: white;
  border-radius: 50%;
  cursor: pointer;
  left: 0%;
  transition: left 0.1s ease;
}

#demo-time {
  color: white;
  font-size: 0.9rem;
  min-width: 80px;
  text-align: center;
}
</style>

## Properties

### Playback Properties

| Property | Type | Read/Write | Description |
|----------|------|------------|-------------|
| `currentTime` | `number` | R/W | Current playback position in seconds |
| `duration` | `number` | R | Total duration in seconds (from state) |
| `paused` | `boolean` | R | Whether playback is paused |
| `ended` | `boolean` | R | Whether playback has ended |
| `seeking` | `boolean` | R | Whether seeking is in progress |

### Audio Properties

| Property | Type | Read/Write | Description |
|----------|------|------------|-------------|
| `volume` | `number` | R/W | Volume level (0-1) |
| `muted` | `boolean` | R/W | Mute state |
| `playbackRate` | `number` | R/W | Playback speed (0.25-4) |

## Interactive Property Demo

Try changing these properties in real-time:

<div class="property-demo">
  <div class="property-controls">
    <div class="control-group">
      <label>Volume: <span id="volume-display">1.0</span></label>
      <input type="range" id="volume-control" min="0" max="1" step="0.1" value="1">
    </div>
    <div class="control-group">
      <label>Playback Rate: <span id="rate-display">1.0x</span></label>
      <input type="range" id="rate-control" min="0.25" max="4" step="0.25" value="1">
    </div>
    <div class="control-group">
      <label>Mute:</label>
      <input type="checkbox" id="mute-control">
    </div>
  </div>
</div>

<style>
.property-demo {
  margin: 2rem 0;
  padding: 1rem;
  background: var(--vp-c-bg-soft);
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
}

.property-controls {
  display: flex;
  gap: 2rem;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
}

.control-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.control-group label {
  font-size: 0.9rem;
  font-weight: 500;
}

.control-group input[type="range"] {
  width: 120px;
}
</style>

## Methods

### Media Loading

#### `load(source, options?)`

Loads media from various sources.

<div class="method-signature">

```typescript
async load(
  source: MediaSource,
  options?: LoadOptions
): Promise<void>
```

</div>

**Parameters:**
- `source`: File, Blob, URL, ArrayBuffer, Uint8Array, or ReadableStream
- `options`: Optional loading configuration

**Example:**

```typescript
// Load from file
await player.load(fileInput.files[0]);

// Load from URL
await player.load('https://example.com/video.mp4');

// Load from blob
await player.load(blob, {
  preload: 'metadata'
});
```

### Playback Control

#### `play()`

Starts or resumes playback.

<div class="method-signature">

```typescript
async play(): Promise<void>
```

</div>

**Example:**

```typescript
await player.play();
```

#### `pause()`

Pauses playback.

<div class="method-signature">

```typescript
pause(): void
```

</div>

**Example:**

```typescript
player.pause();
```

#### `stop()`

Stops playback and resets to the beginning.

<div class="method-signature">

```typescript
async stop(): Promise<void>
```

</div>

**Example:**

```typescript
await player.stop();
```

#### `seek(time, options?)`

Seeks to a specific time position.

<div class="method-signature">

```typescript
async seek(
  time: number,
  options?: SeekOptions
): Promise<void>
```

</div>

**Parameters:**
- `time`: Target time in seconds
- `options.precise`: Whether to seek to exact frame (slower but precise)
- `options.keyframe`: Whether to seek to keyframes only (faster but less precise)

**Example:**

```typescript
// Quick seek
await player.seek(30);

// Precise seek to exact frame
await player.seek(30, { precise: true });

// Keyframe-only seek (fastest)
await player.seek(30, { keyframe: true });
```

### Track Management

#### `getVideoTracks()`

Returns all available video tracks.

<div class="method-signature">

```typescript
getVideoTracks(): VideoTrackInfo[]
```

</div>

**Returns:** Array of video track information objects

**Example:**

```typescript
const videoTracks = player.getVideoTracks();
videoTracks.forEach(track => {
  console.log(`${track.codec} ${track.width}x${track.height}`);
});
```

#### `getAudioTracks()`

Returns all available audio tracks.

<div class="method-signature">

```typescript
getAudioTracks(): AudioTrackInfo[]
```

</div>

**Returns:** Array of audio track information objects

**Example:**

```typescript
const audioTracks = player.getAudioTracks();
audioTracks.forEach(track => {
  console.log(`${track.codec} ${track.channels}ch ${track.sampleRate}Hz`);
});
```

#### `selectVideoTrack(trackId)`

Selects a specific video track.

<div class="method-signature">

```typescript
async selectVideoTrack(trackId: string | null): Promise<void>
```

</div>

**Parameters:**
- `trackId`: ID of the video track to select (or null to disable video)

**Example:**

```typescript
const tracks = player.getVideoTracks();
await player.selectVideoTrack(tracks[0].id);
```

#### `selectAudioTrack(trackId)`

Selects a specific audio track.

<div class="method-signature">

```typescript
async selectAudioTrack(trackId: string | null): Promise<void>
```

</div>

**Parameters:**
- `trackId`: ID of the audio track to select (or null to disable audio)

**Example:**

```typescript
const tracks = player.getAudioTracks();
await player.selectAudioTrack(tracks[1].id);
```

#### `getSubtitleTracks()`

Returns all available subtitle tracks.

<div class="method-signature">

```typescript
getSubtitleTracks(): SubtitleTrackInfo[]
```

</div>

**Returns:** Array of subtitle track information objects

**Example:**

```typescript
const subtitleTracks = player.getSubtitleTracks();
subtitleTracks.forEach(track => {
  console.log(`${track.language}: ${track.name || 'Subtitle'}`);
});
```

#### `selectSubtitleTrack(trackId)`

Selects a specific subtitle track.

<div class="method-signature">

```typescript
selectSubtitleTrack(trackId: string | null): void
```

</div>

**Parameters:**
- `trackId`: ID of the subtitle track to select (or null to disable subtitles)

**Example:**

```typescript
const tracks = player.getSubtitleTracks();
player.selectSubtitleTrack(tracks[0].id);

// Disable subtitles
player.selectSubtitleTrack(null);
```

#### `registerSubtitleTracks(sourceId, registrations)`

Registers external subtitle tracks.

<div class="method-signature">

```typescript
registerSubtitleTracks(
  sourceId: string,
  registrations: SubtitleTrackRegistration[]
): void
```

</div>

**Parameters:**
- `sourceId`: Unique identifier for this subtitle source
- `registrations`: Array of subtitle track registrations

**Example:**

```typescript
player.registerSubtitleTracks('external-subs', [
  {
    info: {
      id: 'en-subs',
      codec: null,
      language: 'en',
      name: 'English Subtitles',
      selected: false
    },
    resolver: async () => ({
      format: 'srt',
      content: await fetch('/subtitles/en.srt').then(r => r.text())
    })
  }
]);
```

#### `unregisterSubtitleTracks(sourceId)`

Removes previously registered subtitle tracks.

<div class="method-signature">

```typescript
unregisterSubtitleTracks(sourceId: string): void
```

</div>

**Parameters:**
- `sourceId`: ID of the subtitle source to remove

**Example:**

```typescript
player.unregisterSubtitleTracks('external-subs');
```

#### `getSubtitleTrackResource(trackId)`

Gets the resource data for a subtitle track.

<div class="method-signature">

```typescript
async getSubtitleTrackResource(
  trackId: string | null
): Promise<SubtitleTrackResource | null>
```

</div>

**Parameters:**
- `trackId`: ID of the subtitle track

**Returns:** Subtitle resource data or null

**Example:**

```typescript
const resource = await player.getSubtitleTrackResource('en-subs');
if (resource) {
  console.log('Format:', resource.format);
  if (resource.content) {
    console.log('Content loaded');
  } else if (resource.url) {
    console.log('URL:', resource.url);
  }
}
```

### Advanced Features

#### `screenshot(options?)`

Takes a screenshot of the current video frame.

<div class="method-signature">

```typescript
async screenshot(options?: ScreenshotOptions): Promise<Blob | null>
```

</div>

**Parameters:**
- `options.format`: Image format ('png', 'jpeg', 'webp')
- `options.quality`: JPEG/WebP quality (0-1)

**Returns:** Blob containing the image data

**Example:**

```typescript
// PNG screenshot
const blob = await player.screenshot();

// JPEG with quality
const jpegBlob = await player.screenshot({
  format: 'jpeg',
  quality: 0.9
});

// Download screenshot
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'screenshot.png';
a.click();
URL.revokeObjectURL(url);
```

#### `setRenderTarget(target)`

Changes the rendering target canvas.

<div class="method-signature">

```typescript
setRenderTarget(target: HTMLCanvasElement | OffscreenCanvas | null): void
```

</div>

**Parameters:**
- `target`: New canvas element or null to disable rendering

**Example:**

```typescript
// Change canvas
const newCanvas = document.querySelector('#new-canvas');
player.setRenderTarget(newCanvas);

// Use OffscreenCanvas for worker rendering
const offscreen = canvas.transferControlToOffscreen();
player.setRenderTarget(offscreen);
```

### State Management

#### `subscribe(listener)`

Subscribes to all state changes.

<div class="method-signature">

```typescript
subscribe(listener: (state: PlayerStateData) => void): Subscription
```

</div>

**Parameters:**
- `listener`: Callback function that receives state updates

**Returns:** Subscription object with `unsubscribe()` method

**Example:**

```typescript
const subscription = player.subscribe(state => {
  console.log(`Time: ${state.currentTime}/${state.duration}`);
  console.log(`Playing: ${state.playing}`);
  console.log(`Volume: ${state.volume}`);
});

// Later, unsubscribe
subscription.unsubscribe();
```

#### `getState()`

Gets the current player state.

<div class="method-signature">

```typescript
getState(): PlayerStateData
```

</div>

**Returns:** Current state object

**Example:**

```typescript
const state = player.getState();
console.log(`Current time: ${state.currentTime}`);
console.log(`Duration: ${state.duration}`);
console.log(`Playing: ${state.playing}`);
console.log(`Volume: ${state.volume}`);
```

### Event Handling

#### `on(event, listener)`

Adds an event listener.

<div class="method-signature">

```typescript
on<K extends keyof PlayerEventMap>(
  event: K,
  listener: (data: PlayerEventMap[K]) => void
): UnsubscribeFn
```

</div>

**Parameters:**
- `event`: Event name
- `listener`: Event handler function

**Returns:** Function to remove the listener

**Example:**

```typescript
const unsubscribe = player.on('play', () => {
  console.log('Playback started');
});

player.on('error', (error) => {
  console.error('Player error:', error);
});

// Remove listener
unsubscribe();
```

#### `once(event, listener)`

Adds a one-time event listener.

<div class="method-signature">

```typescript
once<K extends keyof PlayerEventMap>(
  event: K,
  listener: (data: PlayerEventMap[K]) => void
): UnsubscribeFn
```

</div>

**Parameters:**
- `event`: Event name
- `listener`: Event handler function

**Returns:** Function to remove the listener

**Example:**

```typescript
player.once('loadedmetadata', (info) => {
  console.log('Media loaded:', info);
});
```

#### `off(event, listener?)`

Removes event listener(s).

<div class="method-signature">

```typescript
off<K extends keyof PlayerEventMap>(
  event: K,
  listener?: (data: PlayerEventMap[K]) => void
): void
```

</div>

**Parameters:**
- `event`: Event name
- `listener`: Specific listener to remove (optional)

**Example:**

```typescript
// Remove specific listener
player.off('play', playHandler);

// Remove all listeners for an event
player.off('play');
```


### Cleanup

#### `dispose()`

Releases resources but keeps the instance usable.

<div class="method-signature">

```typescript
dispose(): void
```

</div>

**Example:**

```typescript
player.dispose();
// Player can still be used after loading new media
```

#### `destroy()`

Completely destroys the player instance.

<div class="method-signature">

```typescript
destroy(): void
```

</div>

**Example:**

```typescript
player.destroy();
// Player instance should not be used after this
```

## Events

XiaoMei emits various events during playback. All events are strongly typed.

### Media Events

| Event | Data Type | Description |
|-------|-----------|-------------|
| `loadstart` | `void` | Loading has started |
| `loadedmetadata` | `MediaInfo` | Metadata has been loaded |
| `loadeddata` | `void` | First frame is available |
| `canplay` | `void` | Playback can start |
| `canplaythrough` | `void` | Playback can continue without buffering |

### Playback Events

| Event | Data Type | Description |
|-------|-----------|-------------|
| `play` | `void` | Playback has started |
| `pause` | `void` | Playback has been paused |
| `playing` | `void` | Playback has resumed |
| `ended` | `void` | Playback has ended |
| `seeking` | `{ currentTime: number }` | Seeking has started |
| `seeked` | `{ currentTime: number }` | Seeking has completed |
| `waiting` | `void` | Waiting for data |

### State Change Events

| Event | Data Type | Description |
|-------|-----------|-------------|
| `timeupdate` | `{ currentTime: number }` | Playback position has changed |
| `durationchange` | `{ duration: number }` | Duration has changed |
| `volumechange` | `{ volume: number, muted: boolean }` | Volume or mute state has changed |
| `ratechange` | `{ playbackRate: number }` | Playback rate has changed |
| `progress` | `{ buffered: TimeRange[] }` | Download progress |

### Track Events

| Event | Data Type | Description |
|-------|-----------|-------------|
| `trackchange` | `{ type: 'video' \| 'audio' \| 'subtitle', trackId: string \| null }` | Track selection has changed |
| `resize` | `{ width: number, height: number }` | Video dimensions have changed |

### Conversion Events

| Event | Data Type | Description |
|-------|-----------|-------------|
| `conversionstart` | `{ type: 'audio' \| 'video', trackId: string, reason: 'unsupported-codec' \| 'decode-error' }` | Track conversion has started |
| `conversionprogress` | `{ type: 'audio' \| 'video', trackId: string, progress: number, stage: 'extracting' \| 'converting' \| 'finalizing' }` | Track conversion progress |
| `conversioncomplete` | `{ type: 'audio' \| 'video', trackId: string, duration: number }` | Track conversion completed |
| `conversionerror` | `{ type: 'audio' \| 'video', trackId: string, error: Error }` | Track conversion failed |

### Warning Events

| Event | Data Type | Description |
|-------|-----------|-------------|
| `warning` | `{ type: string, message: string, error?: Error }` | Non-fatal warning occurred |

### Error Events

| Event | Data Type | Description |
|-------|-----------|-------------|
| `error` | `XiaoMeiError` | An error has occurred |

### Event Example

```typescript
// Listen to all major events
player.on('loadstart', () => {
  console.log('Loading started');
});

player.on('loadedmetadata', (info) => {
  console.log(`Duration: ${info.duration}s`);
  console.log(`Has video: ${info.hasVideo}`);
  console.log(`Has audio: ${info.hasAudio}`);
});

player.on('play', () => {
  console.log('Playback started');
});

player.on('timeupdate', ({ currentTime }) => {
  updateProgressBar(currentTime);
});

player.on('error', (error) => {
  console.error(`Error ${error.code}: ${error.message}`);
});
```

## Type Definitions

### PlayerStateData

Complete player state object returned by `subscribe()` and `getState()`.

```typescript
interface PlayerStateData {
  // Playback state
  state: PlayerState;
  playing: boolean;
  paused: boolean;
  ended: boolean;
  seeking: boolean;

  // Time
  currentTime: number;
  duration: number;
  buffered: TimeRange[];

  // Audio
  volume: number;
  muted: boolean;
  playbackRate: number;

  // Media info
  mediaInfo: MediaInfo | null;
  videoTracks: VideoTrackInfo[];
  audioTracks: AudioTrackInfo[];
  subtitleTracks: SubtitleTrackInfo[];
  selectedVideoTrack: string | null;
  selectedAudioTrack: string | null;
  selectedSubtitleTrack: string | null;
  canPlay: boolean;
  canPlayThrough: boolean;
  isLive: boolean;

  // Error state
  error: Error | null;
}
```

### MediaInfo

Information about loaded media.

```typescript
interface MediaInfo {
  duration: number;
  format: string;
  mimeType: string;
  metadata: MetadataTags;
  hasVideo: boolean;
  hasAudio: boolean;
  hasSubtitles: boolean;
}
```

### VideoTrackInfo

Video track information.

```typescript
interface VideoTrackInfo {
  id: string;
  codec: VideoCodec | null;
  language: string;
  name: string | null;
  width: number;
  height: number;
  frameRate: number;
  bitrate: number;
  rotation: 0 | 90 | 180 | 270;
  selected: boolean;
  decodable: boolean;
  converted?: boolean;
}
```

### AudioTrackInfo

Audio track information.

```typescript
interface AudioTrackInfo {
  id: string;
  codec: AudioCodec | null;
  language: string;
  name: string | null;
  channels: number;
  sampleRate: number;
  bitrate: number;
  selected: boolean;
  decodable: boolean;
  converted?: boolean;
}
```