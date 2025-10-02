# Basic Usage

This guide covers the fundamental concepts and basic usage patterns of AVPlay. For hands-on learning, check out the **interactive demo on the home page** first!

## Core Concepts

### 1. The Player Instance

AVPlay follows an object-oriented approach where you create a player instance:

```typescript
import { AVPlay } from '@avplay/core';

const player = new AVPlay(options);
```

Each instance manages its own:
- Media source
- Playback state
- Rendering target
- Event handlers
- Audio/video tracks

::: tip Try It Now!
See this in action in the **live demo on the home page** - load your own videos and experiment with the controls!
:::

### 2. Media Sources

AVPlay accepts various media sources. **Try them all in the interactive demo!**

```typescript
// File from input element
const file = inputElement.files[0];
await player.load(file);

// URL (local or remote)
await player.load('https://example.com/video.mp4');
await player.load('/local/video.mp4');

// Blob
const blob = new Blob([data], { type: 'video/mp4' });
await player.load(blob);

// ArrayBuffer or Uint8Array
const buffer = await response.arrayBuffer();
await player.load(buffer);

// ReadableStream
const stream = response.body;
await player.load(stream);
```

::: tip Interactive Demo
The **live demo on the home page** lets you try loading videos from files, URLs, and more. Upload your own videos to test compatibility!
:::

### 3. Canvas Rendering

AVPlay renders video to a canvas element for maximum performance and control:

```html
<canvas id="video-canvas" width="1280" height="720"></canvas>
```

```typescript
const canvas = document.querySelector('#video-canvas');
const player = new AVPlay({
  renderTarget: canvas
});
```

**Benefits of canvas rendering:**
- **Hardware acceleration** - GPU-powered video decoding and rendering
- **Custom overlays** - Draw text, controls, and effects on top of video
- **Pixel-level control** - Access individual frames for processing
- **Cross-platform consistency** - Same rendering behavior across browsers

::: tip See It In Action!
The **live demo on the home page** shows canvas rendering with smooth playback, progress bars, and custom controls overlaid on the video.
:::

## Basic Operations

### Loading Media

```typescript
try {
  await player.load('video.mp4');
  console.log('Media loaded successfully');
} catch (error) {
  console.error('Failed to load media:', error);
}
```

::: tip Interactive Demo
Try loading different videos in the **live demo on the home page** to see how media loading works with real-time feedback!
:::

### Playback Control

```typescript
// Play
await player.play();

// Pause
player.pause();

// Stop (resets to beginning)
player.stop();

// Toggle play/pause
if (player.paused) {
  await player.play();
} else {
  player.pause();
}
```

::: tip Try It Now!
The **live demo on the home page** has play/pause buttons, progress bars, and all these controls you can interact with!
:::

### Seeking

```typescript
// Seek to specific time (in seconds)
player.currentTime = 30;

// Or use the seek method
await player.seek(30);

// Seek to percentage
const percentage = 0.5; // 50%
player.currentTime = player.duration * percentage;
```

::: tip Interactive Demo
Click and drag on the progress bar in the **live demo on the home page** to see seeking in action with smooth visual feedback!
:::

### Volume Control

```javascript
// Set volume (0 to 1)
player.volume = 0.5; // 50% volume

// Mute/unmute
player.muted = true;  // Mute
player.muted = false; // Unmute

// Toggle mute
player.muted = !player.muted;
```

## State Management

### Reading State

```javascript
// Get current state
const state = player.getState();
console.log({
  playing: state.playing,
  currentTime: state.currentTime,
  duration: state.duration,
  volume: state.volume,
  muted: state.muted
});

// Direct property access
console.log(`Current time: ${player.currentTime}`);
console.log(`Duration: ${player.duration}`);
console.log(`Is playing: ${!player.paused}`);
```

### Subscribing to State Changes

```javascript
// Subscribe to all state changes
const unsubscribe = player.subscribe(state => {
  updateUI(state);
});

// Clean up when done
unsubscribe();
```

## Event Handling

### Common Events

```javascript
// Media loaded
player.on('loadedmetadata', (info) => {
  console.log(`Duration: ${info.duration}`);
  console.log(`Has video: ${info.hasVideo}`);
  console.log(`Has audio: ${info.hasAudio}`);
});

// Playback events
player.on('play', () => console.log('Started playing'));
player.on('pause', () => console.log('Paused'));
player.on('ended', () => console.log('Playback ended'));

// Time updates
player.on('timeupdate', ({ currentTime }) => {
  updateProgressBar(currentTime);
});

// Errors
player.on('error', (error) => {
  console.error('Player error:', error);
  showErrorMessage(error.message);
});
```

## Complete Example

Here's a minimal but complete video player:

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    .player-container {
      max-width: 800px;
      margin: 0 auto;
    }

    canvas {
      width: 100%;
      background: black;
    }

    .controls {
      display: flex;
      gap: 10px;
      padding: 10px;
      background: #333;
    }

    button {
      padding: 5px 15px;
      cursor: pointer;
    }

    .time {
      color: white;
      margin-left: auto;
    }
  </style>
</head>
<body>
  <div class="player-container">
    <canvas id="video"></canvas>

    <div class="controls">
      <button id="playPause">Play</button>
      <input type="range" id="volume" min="0" max="1" step="0.1" value="1">
      <span class="time" id="time">0:00 / 0:00</span>
    </div>

    <input type="file" id="fileInput" accept="video/*">
  </div>

  <script type="module">
    import { AVPlay, formatTime } from '@avplay/core';

    // Initialize player
    const player = new AVPlay({
      renderTarget: document.getElementById('video')
    });

    // UI elements
    const playPauseBtn = document.getElementById('playPause');
    const volumeSlider = document.getElementById('volume');
    const timeDisplay = document.getElementById('time');
    const fileInput = document.getElementById('fileInput');

    // Load file
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        await player.load(file);
      }
    });

    // Play/pause
    playPauseBtn.addEventListener('click', async () => {
      if (player.paused) {
        await player.play();
      } else {
        player.pause();
      }
    });

    // Volume
    volumeSlider.addEventListener('input', (e) => {
      player.volume = parseFloat(e.target.value);
    });

    // Update UI on state change
    player.subscribe(state => {
      // Update button text
      playPauseBtn.textContent = state.playing ? 'Pause' : 'Play';

      // Update time
      timeDisplay.textContent = `${formatTime(state.currentTime)} / ${formatTime(state.duration)}`;
    });

    // Handle errors
    player.on('error', (error) => {
      alert(`Error: ${error.message}`);
    });
  </script>
</body>
</html>
```

## Common Patterns

### Auto-play with Mute

```javascript
// Browsers require muted autoplay
const player = new AVPlay({
  renderTarget: canvas,
  autoplay: true,
  muted: true
});
```

### Loop Playback

```javascript
player.on('ended', () => {
  player.currentTime = 0;
  player.play();
});
```

### Loading Indicator

```javascript
// Listen for waiting events to show loading
player.on('waiting', () => {
  showLoadingSpinner();
});

player.on('canplay', () => {
  hideLoadingSpinner();
});
```

### Keyboard Controls

```javascript
document.addEventListener('keydown', (e) => {
  switch(e.key) {
    case ' ':
      e.preventDefault();
      player.paused ? player.play() : player.pause();
      break;
    case 'ArrowLeft':
      player.currentTime = Math.max(0, player.currentTime - 5);
      break;
    case 'ArrowRight':
      player.currentTime = Math.min(player.duration, player.currentTime + 5);
      break;
    case 'm':
      player.muted = !player.muted;
      break;
  }
});
```

## Best Practices

### 1. Always Handle Errors

```javascript
try {
  await player.load(source);
  await player.play();
} catch (error) {
  console.error('Playback failed:', error);
  // Show user-friendly error message
}
```

### 2. Clean Up Resources

```javascript
// When done with the player
player.dispose();

// When unmounting/leaving page
window.addEventListener('beforeunload', () => {
  player.dispose();
});
```

### 3. Optimize Canvas Size

```javascript
// Match video resolution for best quality
player.on('loadedmetadata', (info) => {
  if (info.hasVideo) {
    canvas.width = player.videoWidth;
    canvas.height = player.videoHeight;
  }
});
```

### 4. Responsive Design

```css
canvas {
  width: 100%;
  height: auto;
  max-width: 100%;
}
```

## Next Steps

- [Framework Integration](/guide/react) - Use with React, Vue, etc.
- [State Management](/guide/state-management) - Advanced state handling
- [Event Handling](/guide/events) - Complete event reference
- [API Reference](/api/player) - Full API documentation
