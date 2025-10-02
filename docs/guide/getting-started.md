# Getting Started

Welcome to AVPlay! Let's get you up and running with a powerful video player in just a few minutes.

## Quick Start

### Try It Now!

Before diving into the code, **try the interactive demo** to see AVPlay in action:

- **Live Player Demo** - Interactive video player on the home page with all essential features
- **[Player API Reference](/api/player)** - Complete API documentation with examples

### Installation

Install AVPlay and its peer dependency mediabunny:

::: code-group

```bash [bun]
bun add @avplay/core mediabunny
```

```bash [npm]
npm install @avplay/core mediabunny
```

```bash [yarn]
yarn add @avplay/core mediabunny
```

```bash [pnpm]
pnpm add @avplay/core mediabunny
```

:::

For React, use the dedicated package:

::: code-group

```bash [bun]
bun add @avplay/react @avplay/core mediabunny
```

```bash [npm]
npm install @avplay/react @avplay/core mediabunny
```

```bash [yarn]
yarn add @avplay/react @avplay/core mediabunny
```

```bash [pnpm]
pnpm add @avplay/react @avplay/core mediabunny
```

:::

### Browser Support

AVPlay works in all modern browsers:

| Browser | Minimum Version |
|---------|----------------|
| Chrome | 94+ |
| Edge | 94+ |
| Safari | 16.4+ |
| Firefox | 130+ (requires flag) |

::: tip Firefox Setup
Firefox users need to enable WebCodecs by setting `dom.media.webcodecs.enabled` to `true` in about:config.
:::

## Basic Usage

### Quick Setup (Copy & Run)

Here's the fastest way to get started:

```html
<!DOCTYPE html>
<html>
<head>
  <title>My First AVPlay Player</title>
</head>
<body>
  <canvas id="player" width="1280" height="720"></canvas>

  <script type="module">
    import { AVPlay } from '@avplay/core';

    // Create player
    const canvas = document.querySelector('#player');
    const player = new AVPlay({
      renderTarget: canvas,
      volume: 0.8
    });

    // Load and play video
    await player.load('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4');
    await player.play();

    console.log('Video is playing!');
  </script>
</body>
</html>
```

### Step-by-Step Guide

#### 1. Create Canvas Element

AVPlay renders video to a canvas element for maximum control:

```html
<canvas id="video-canvas" width="1280" height="720"></canvas>
```

#### 2. Initialize Player

```typescript
import { AVPlay } from '@avplay/core';

const canvas = document.querySelector('#video-canvas');
const player = new AVPlay({
  renderTarget: canvas,
  volume: 0.8,
  autoplay: false
});
```

#### 3. Load Media

AVPlay accepts various media sources:

```typescript
// From file input
const file = fileInput.files[0];
await player.load(file);

// From URL
await player.load('https://example.com/video.mp4');

// From Blob
const response = await fetch(url);
const blob = await response.blob();
await player.load(blob);

// From ArrayBuffer
const buffer = await file.arrayBuffer();
await player.load(buffer);
```

#### 4. Control Playback

```typescript
// Play/Pause
await player.play();
player.pause();

// Seek to specific time
player.currentTime = 30; // Jump to 30 seconds
await player.seek(30); // Alternative method

// Volume control
player.volume = 0.5; // 50% volume
player.muted = true; // Mute

// Stop and reset
player.stop();
```

#### 5. Subscribe to State Changes

```typescript
const subscription = player.subscribe(state => {
  console.log(`Time: ${state.currentTime}/${state.duration}`);
  console.log(`Playing: ${state.playing}`);
  console.log(`Paused: ${state.paused}`);
});

// Unsubscribe when done
subscription.unsubscribe();
```

::: tip Interactive Learning
Want to see these features in action? Check out the **live demo on the home page** for a complete working player you can interact with!
:::

## Interactive Demo

Try the **live player demo on the home page**:

- **Complete working player** you can interact with
- **File upload and URL loading**
- **Real-time progress tracking**
- **Volume and playback controls**
- **Keyboard shortcuts**
- **Mobile responsive design**
- **Multi-track support**
- **Screenshot functionality**

### Quick Start Code

For a minimal working example, copy this HTML:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Quick AVPlay Player</title>
</head>
<body>
  <canvas id="player" width="1280" height="720"></canvas>

  <script type="module">
    import { AVPlay } from '@avplay/core';

    const canvas = document.querySelector('#player');
    const player = new AVPlay({ renderTarget: canvas });

    // Load sample video
    await player.load('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4');
    await player.play();
  </script>
</body>
</html>
```

::: tip Want More Features?
The **live demo on the home page** includes all the essential controls and features you'll need for most applications, plus advanced features like multi-track support and screenshot capture!
:::

## Browser Requirements

AVPlay requires modern browser features:

- **WebCodecs API** - For hardware-accelerated video decoding
- **Web Audio API** - For audio playback
- **Canvas API** - For video rendering
- **ES2022** - Modern JavaScript features

### Browser Support

| Browser | Minimum Version |
|---------|----------------|
| Chrome | 94+ |
| Edge | 94+ |
| Safari | 16.4+ |
| Firefox | 130+ (requires flag) |

::: tip
Firefox users need to enable WebCodecs by setting `dom.media.webcodecs.enabled` to `true` in about:config.

Check [caniuse.com/webcodecs](https://caniuse.com/webcodecs) for the latest browser support information.
:::

## TypeScript Support

AVPlay is written in TypeScript with full type safety:

```typescript
import { AVPlay, PlayerOptions, PlayerStateData } from '@avplay/core';

const options: PlayerOptions = {
  renderTarget: canvas,
  volume: 0.8,
  autoplay: true
};

const player = new AVPlay(options);

player.subscribe((state: PlayerStateData) => {
  // Full IntelliSense and type checking
  console.log(state.currentTime); // number
  console.log(state.playing); // boolean
  console.log(state.volume); // number
});
```

## Next Steps

### Try the Interactive Demo
- **Live Player Demo** - Perfect starting point with all essential features (on home page)
- **[Player API Reference](/api/player)** - Complete API documentation with examples

### Learn More
- **[API Reference](/api/player)** - Complete documentation with live examples
- **[React Integration](/guide/react)** - Use AVPlay in React applications
- **[Vue Integration](/guide/vue)** - Use AVPlay in Vue applications
- **[Angular Integration](/guide/angular)** - Use AVPlay in Angular applications

## Common Issues & Solutions

### CORS Errors
When loading videos from a different domain:

```typescript
const player = new AVPlay({
  crossOrigin: 'anonymous' // or 'use-credentials'
});
```

Make sure the server sends proper CORS headers.

### Autoplay Restrictions
Modern browsers restrict autoplay. Solutions:

1. **Start on user interaction** (recommended):
```typescript
document.addEventListener('click', async () => {
  await player.play();
}, { once: true });
```

2. **Mute for autoplay**:
```typescript
const player = new AVPlay({
  autoplay: true,
  muted: true // Required for autoplay
});
```

### Memory Management
Always clean up when done:

```typescript
// Component unmount / page unload
player.dispose(); // Releases resources but keeps instance

// Or completely destroy
player.destroy(); // Cannot be used after this
```

### Performance Tips
1. **Use appropriate canvas size** - Match your video resolution
2. **Enable hardware acceleration** - WebCodecs uses GPU by default
3. **Manage buffering** - Set appropriate `maxCacheSize`
4. **Dispose unused players** - Prevent memory leaks

## Ready to Build?

You've got everything you need to start building with AVPlay:

### **Start Here:**
1. **Try the Live Demo** - Get hands-on experience with the interactive player on the home page
2. **[Explore the API](/api/player)** - Complete API reference with examples

### **Need Help?**
- **[GitHub Issues](https://github.com/wiedymi/avplay/issues)** - Report bugs or request features
- **[API Reference](/api/player)** - Complete documentation with live examples
- **[Community Discussions](https://github.com/wiedymi/avplay/discussions)** - Ask questions and share ideas

### **Framework Integration:**
- **[React Guide](/guide/react)** - Use AVPlay in React apps
- **[Vue Guide](/guide/vue)** - Use AVPlay in Vue apps
- **[Angular Guide](/guide/angular)** - Use AVPlay in Angular apps
- **[Vanilla JS Guide](/guide/vanilla)** - Use AVPlay in vanilla JavaScript

Happy coding!
