# Installation

## Prerequisites

Before installing AVPlay, make sure you have:

- Node.js 18+ or Bun installed
- A modern browser that supports WebCodecs API
- Basic knowledge of JavaScript/TypeScript

## Package Managers

AVPlay can be installed using any popular package manager:

::: code-group

```bash [bun]
bun add @avplay/core
```

```bash [npm]
npm install @avplay/core
```

```bash [yarn]
yarn add @avplay/core
```

```bash [pnpm]
pnpm add @avplay/core
```

:::

## What's Included

When you install AVPlay, you get:

- **Core Player** - The main AVPlay class
- **Mediabunny** - Automatically included as a dependency for media processing
- **TypeScript Definitions** - Complete type definitions for TypeScript users
- **Utilities** - Helper functions for time formatting, error handling, etc.

## CDN Usage

For quick prototyping, you can use AVPlay from a CDN:

```html
<script type="module">
  import { AVPlay } from 'https://unpkg.com/@avplay/core@latest/dist/index.js';

  const player = new AVPlay({
    renderTarget: document.querySelector('canvas')
  });
</script>
```

::: warning
CDN usage is not recommended for production as it may impact performance and reliability.
:::

## Browser Requirements

AVPlay requires modern browser features:

| Feature | Required For | Browser Support |
|---------|-------------|-----------------|
| WebCodecs API | Video/audio decoding | Chrome 94+, Edge 94+, Safari 16.4+ |
| Web Audio API | Audio playback | All modern browsers |
| Canvas API | Video rendering | All modern browsers |
| ES2022 | Core functionality | All modern browsers |

## TypeScript Configuration

If you're using TypeScript, AVPlay includes all necessary type definitions. Your `tsconfig.json` should include:

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

After installation, you can verify AVPlay is working:

```javascript
import { AVPlay, VERSION } from '@avplay/core';

console.log(`AVPlay version: ${VERSION}`);

// Create a test instance
const player = new AVPlay();
console.log('Player created successfully!');
```

## Bundle Size

AVPlay is designed to be lightweight:

- **Core Player**: ~50KB minified
- **With Mediabunny**: ~250KB minified
- **Gzipped**: ~80KB total

The library is tree-shakable, so you only include what you use.

## Development Setup

For development, you might want to clone the repository:

```bash
git clone https://github.com/wiedymi/avplay.git
cd avplay
bun install
bun run dev
```

## Next Steps

- [Basic Usage](/guide/basic-usage) - Learn the fundamentals
- [Getting Started](/guide/getting-started) - Build your first player
- [Framework Integration](/guide/react) - Use with React, Vue, etc.
