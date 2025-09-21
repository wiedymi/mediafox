---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "XiaoMei 小美"
  text: "Modern Video Player Library"
  tagline: Framework-agnostic, TypeScript-first media player powered by MediaBunny. Full control over rendering and UI.
  image:
    src: /logo.png
    alt: XiaoMei
    class: hero-image
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

features:
  - title: Framework Agnostic
    details: Works seamlessly with React, Vue, Angular, Svelte, or vanilla JavaScript. No UI opinions - you control the interface.
  - title: Complete Media Support
    details: Handle video, audio, and subtitle tracks with ease. Support for multiple formats through MediaBunny's WebCodecs implementation.
  - title: Performance First
    details: Efficient frame buffering, smart audio scheduling, and optimized rendering. Built for smooth 60fps playback.
  - title: Small & Tree-shakable
    details: Modular architecture means you only include what you use. Core player is under 50KB minified.
  - title: UI Flexibility
    details: No built-in UI components. Build exactly the interface you want with complete control over every pixel.
  - title: TypeScript Native
    details: Written in TypeScript with complete type definitions. Enjoy full IDE support and catch errors at compile time.
  - title: Advanced Features
    details: Screenshot capture, frame extraction, multi-track support, quality switching, and plugin system.
  - title: Extensible
    details: Plugin system allows you to extend functionality. Reactive state management with subscription support.
  - title: Intuitive API
    details: Familiar HTML5 video-like API with modern async/await support. Property-based access for common operations.
---

## Try It Live

<ClientOnly>
  <VideoPlayerDemo />
</ClientOnly>

## Quick Example

```typescript
import { XiaoMei } from 'xiaomei';

// Create player instance
const player = new XiaoMei({
  renderTarget: document.querySelector('canvas'),
  volume: 0.8
});

// Load and play media
await player.load(videoFile);
await player.play();

// React to state changes
player.subscribe(state => {
  console.log(`Playing: ${state.playing}`);
  console.log(`Time: ${state.currentTime}/${state.duration}`);
});
```

## Why XiaoMei?

Unlike traditional video player libraries that come with pre-built UI components, XiaoMei gives you complete control. You get a powerful media engine with a clean API, and you build the interface that matches your design system perfectly.

**Perfect for:**
- Custom video players that match your brand
- Advanced media applications with unique requirements
- Projects where bundle size matters
- Applications requiring precise control over playback
- Cross-platform media solutions

## Get Started in Minutes

```bash
# Install with your favorite package manager
bun add xiaomei
npm install xiaomei
yarn add xiaomei
```

Check out our [Getting Started Guide](/guide/getting-started) to build your first video player!
