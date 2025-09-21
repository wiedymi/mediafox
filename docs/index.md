---
layout: home

hero:
  name: "XiaoMei 小美"
  text: "Framework-Agnostic Video Player"
  tagline: A TypeScript-first video player library powered by MediaBunny. Full control over rendering and UI, zero opinions.
  image:
    src: /logo.png
    alt: XiaoMei
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: API Reference
      link: /api/player
    - theme: alt
      text: View on GitHub
      link: https://github.com/wiedymi/xiaomei
---

<ClientOnly>
  <VideoPlayerDemo />
</ClientOnly>

<div style="text-align: center; margin: 80px auto; max-width: 800px; font-size: 20px;">

```bash
bun add xiaomei
```

</div>

<div style="display: flex; flex-direction: column; gap: 80px; margin-top: 80px;">

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: center;">
<div>
<h1 style="background: -webkit-linear-gradient(-30deg, #3b82f6, #06b6d4); -webkit-background-clip: text; color: transparent; display: inline-block;">Complete media playback control</h1>
<p style="font-size: 18px; line-height: 1.6;">XiaoMei gives you full control over video playback without imposing any UI constraints. Handle multi-track media files with video, audio, and subtitle tracks. Perfect canvas-based rendering with hardware acceleration.</p>
<a href="/guide/basic-usage" style="text-decoration: none; display: inline-flex; align-items: center; gap: 6px; color: var(--vp-c-brand);">
    Learn more
    <span style="margin-left: 4px;">→</span>
</a>
</div>
<div style="font-size: 14px; position: relative;">

```typescript
import { XiaoMei } from 'xiaomei';

const player = new XiaoMei({
  renderTarget: document.querySelector('#canvas'),
  volume: 0.8,
  autoplay: false
});

// Load media from various sources
await player.load(videoFile);
await player.load('https://example.com/video.mp4');
await player.load(blob);

// Control playback
await player.play();
player.pause();
await player.seek(30);

// Multi-track support
const videoTracks = player.getVideoTracks();
const audioTracks = player.getAudioTracks();
await player.selectAudioTrack(audioTracks[1].id);
```

</div>
</div>

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: center;">
<div style="font-size: 14px; position: relative;">

```typescript
// React to all state changes
player.subscribe(state => {
  console.log('Current time:', state.currentTime);
  console.log('Duration:', state.duration);
  console.log('Playing:', state.playing);
  console.log('Volume:', state.volume);
  console.log('Selected tracks:', {
    video: state.selectedVideoTrack,
    audio: state.selectedAudioTrack,
    subtitle: state.selectedSubtitleTrack
  });
});

// Listen to specific events
player.on('loadedmetadata', (info) => {
  console.log(`Format: ${info.format}`);
  console.log(`Duration: ${info.duration}s`);
});

player.on('timeupdate', ({ currentTime }) => {
  updateProgressBar(currentTime);
});
```

</div>
<div>
<h1 style="background: -webkit-linear-gradient(-30deg, #3b82f6, #06b6d4); -webkit-background-clip: text; color: transparent; display: inline-block;">Reactive state management</h1>
<p style="font-size: 18px; line-height: 1.6;">Subscribe to state changes and handle events with a clean, type-safe API. Get real-time updates on playback progress, track changes, and media loading states.</p>
<a href="/guide/state-management" style="text-decoration: none; display: inline-flex; align-items: center; gap: 6px; color: var(--vp-c-brand);">
    Docs
    <span style="margin-left: 4px;">→</span>
</a>
</div>
</div>

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: center;">
<div>
<h1 style="background: -webkit-linear-gradient(-30deg, #3b82f6, #06b6d4); -webkit-background-clip: text; color: transparent; display: inline-block;">Automatic codec conversion</h1>
<p style="font-size: 18px; line-height: 1.6;">Handle unsupported codecs gracefully with the fallback decoder system. Automatically convert audio and video tracks using custom decoder functions like FFmpeg.wasm when browsers can't handle them natively.</p>
<a href="/guide/fallback-decoder" style="text-decoration: none; display: inline-flex; align-items: center; gap: 6px; color: var(--vp-c-brand);">
    Learn more
    <span style="margin-left: 4px;">→</span>
</a>
</div>
<div style="font-size: 14px; position: relative;">

```typescript
import { MediaConverterDecoder } from 'xiaomei';

const fallbackDecoder = new MediaConverterDecoder({
  decodeAudioTrack: async (data, trackIndex, options) => {
    // Convert unsupported audio to AAC
    return await convertToAAC(data, trackIndex);
  },
  decodeVideoTrack: async (data, trackIndex, options) => {
    // Convert unsupported video to H.264
    return await convertToH264(data, trackIndex);
  }
});

const player = new XiaoMei({
  renderTarget: canvas,
  fallbackDecoder // Handles unsupported codecs automatically
});

// Listen for conversion events
player.on('conversionstart', (event) => {
  console.log(`Converting ${event.type} track...`);
});
```

</div>
</div>

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: center;">
<div>
<h1 style="background: -webkit-linear-gradient(-30deg, #3b82f6, #06b6d4); -webkit-background-clip: text; color: transparent; display: inline-block;">Framework agnostic</h1>
<p style="font-size: 18px; line-height: 1.6;">Works seamlessly with React, Vue, Angular, Svelte, or vanilla JavaScript. No UI opinions means you can build exactly the interface you want with complete control over every pixel.</p>
<a href="/guide/react" style="text-decoration: none; display: inline-flex; align-items: center; gap: 6px; color: var(--vp-c-brand);">
    Framework guides
    <span style="margin-left: 4px;">→</span>
</a>
</div>
<div style="font-size: 14px; position: relative;">

```typescript
// Framework integration examples

// React
function VideoPlayer({ src }) {
  const playerRef = useRef();
  const [state, setState] = useState(null);

  useEffect(() => {
    const player = new XiaoMei({ renderTarget: canvasRef.current });
    const { unsubscribe } = player.subscribe(setState);

    playerRef.current = player;
    return () => { unsubscribe(); player.dispose(); };
  }, []);

  return <canvas ref={canvasRef} onClick={() => player.play()} />;
}

// Vue
const player = new XiaoMei({ renderTarget: canvasRef.value });
const state = ref(null);
player.subscribe(newState => state.value = newState);

// Vanilla
const player = new XiaoMei({ renderTarget: canvas });
player.subscribe(state => updateUI(state));
```

</div>
</div>

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: center;">
<div style="font-size: 14px; position: relative;">

```typescript
import {
  XiaoMei,
  PlayerStateData,
  VideoTrackInfo,
  AudioTrackInfo,
  MediaConverterDecoder
} from 'xiaomei';

const player = new XiaoMei({
  renderTarget: canvas,
  fallbackDecoder: myDecoder,
  volume: 0.8
});

// Full IntelliSense support
player.subscribe((state: PlayerStateData) => {
  updateUI({
    currentTime: state.currentTime, // number
    duration: state.duration,       // number
    playing: state.playing,         // boolean
    tracks: state.videoTracks       // VideoTrackInfo[]
  });
});
```

</div>
<div>
<h1 style="background: -webkit-linear-gradient(-30deg, #3b82f6, #06b6d4); -webkit-background-clip: text; color: transparent; display: inline-block;">TypeScript native</h1>
<p style="font-size: 18px; line-height: 1.6;">Built from scratch in TypeScript with complete type definitions. Tree-shakable architecture means you only include what you use. Zero dependencies beyond MediaBunny.</p>
<a href="/api/types" style="text-decoration: none; display: inline-flex; align-items: center; gap: 6px; color: var(--vp-c-brand);">
    Type reference
    <span style="margin-left: 4px;">→</span>
</a>
</div>
</div>

</div>