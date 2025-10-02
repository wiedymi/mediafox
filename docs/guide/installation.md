# Installation

## Prerequisites

Before installing MediaFox, make sure you have:

- Node.js 18+ or Bun installed
- A modern browser that supports WebCodecs API
- Basic knowledge of JavaScript/TypeScript

## Package Managers

MediaFox requires both the core package and mediabunny (peer dependency):

::: code-group

```bash [bun]
bun add @mediafox/core mediabunny
```

```bash [npm]
npm install @mediafox/core mediabunny
```

```bash [yarn]
yarn add @mediafox/core mediabunny
```

```bash [pnpm]
pnpm add @mediafox/core mediabunny
```

:::

::: tip Why Peer Dependency?
Mediabunny is a peer dependency to give you control over the version and avoid duplication if you're using it directly in your project.
:::

## Framework Packages

For React applications, use the dedicated React package:

::: code-group

```bash [bun]
bun add @mediafox/react @mediafox/core mediabunny
```

```bash [npm]
npm install @mediafox/react @mediafox/core mediabunny
```

```bash [yarn]
yarn add @mediafox/react @mediafox/core mediabunny
```

```bash [pnpm]
pnpm add @mediafox/react @mediafox/core mediabunny
```

:::

## What's Included

When you install MediaFox, you get:

- **Core Player** - The main MediaFox class
- **TypeScript Definitions** - Complete type definitions for TypeScript users
- **Utilities** - Helper functions for time formatting, error handling, etc.

Mediabunny (installed separately) provides:
- **Media Processing** - Video/audio decoding and encoding
- **Format Support** - Wide range of media formats
- **WebCodecs Integration** - Hardware-accelerated processing

## CDN Usage

For quick prototyping, you can use MediaFox from a CDN:

```html
<script type="module">
  import { MediaFox } from 'https://unpkg.com/@mediafox/core@latest/dist/index.js';

  const player = new MediaFox({
    renderTarget: document.querySelector('canvas')
  });
</script>
```

::: warning
CDN usage is not recommended for production as it may impact performance and reliability.
:::

## Browser Requirements

MediaFox requires modern browser features:

| Feature | Required For | Browser Support |
|---------|-------------|-----------------|
| WebCodecs API | Video/audio decoding | Chrome 94+, Edge 94+, Safari 16.4+ |
| Web Audio API | Audio playback | All modern browsers |
| Canvas API | Video rendering | All modern browsers |
| ES2022 | Core functionality | All modern browsers |

## TypeScript Configuration

If you're using TypeScript, MediaFox includes all necessary type definitions. Your `tsconfig.json` should include:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "moduleResolution": "bundler"
  }
}
```

## Verify Installation

After installation, you can verify MediaFox is working:

```javascript
import { MediaFox, VERSION } from '@mediafox/core';

console.log(`MediaFox version: ${VERSION}`);

// Create a test instance
const player = new MediaFox();
console.log('Player created successfully!');
```

## Bundle Size

MediaFox is designed to be lightweight:

- **@mediafox/core**: ~38KB minified (mediabunny excluded as peer dependency)
- **@mediafox/react**: ~3KB minified
- **mediabunny**: ~220KB minified (peer dependency, loaded separately)
- **Total Gzipped**: ~80KB total

The library is tree-shakable, so you only include what you use.

## Development Setup

For development, you might want to clone the repository:

```bash
git clone https://github.com/wiedymi/mediafox.git
cd mediafox
bun install
bun run dev
```

## Next Steps

- [Basic Usage](/guide/basic-usage) - Learn the fundamentals
- [Getting Started](/guide/getting-started) - Build your first player
- [Framework Integration](/guide/react) - Use with React, Vue, etc.
