# Installation

## Prerequisites

Before installing XiaoMei, make sure you have:

- Node.js 18+ or Bun installed
- A modern browser that supports WebCodecs API
- Basic knowledge of JavaScript/TypeScript

## Package Managers

XiaoMei can be installed using any popular package manager:

::: code-group

```bash [bun]
bun add @vivysub/xiaomei
```

```bash [npm]
npm install @vivysub/xiaomei
```

```bash [yarn]
yarn add @vivysub/xiaomei
```

```bash [pnpm]
pnpm add @vivysub/xiaomei
```

:::

## What's Included

When you install XiaoMei, you get:

- **Core Player** - The main XiaoMei class
- **MediaBunny** - Automatically included as a dependency for media processing
- **TypeScript Definitions** - Complete type definitions for TypeScript users
- **Utilities** - Helper functions for time formatting, error handling, etc.

## CDN Usage

For quick prototyping, you can use XiaoMei from a CDN:

```html
<script type="module">
  import { XiaoMei } from 'https://unpkg.com/@vivysub/xiaomei@latest/dist/index.js';

  const player = new XiaoMei({
    renderTarget: document.querySelector('canvas')
  });
</script>
```

::: warning
CDN usage is not recommended for production as it may impact performance and reliability.
:::

## Browser Requirements

XiaoMei requires modern browser features:

| Feature | Required For | Browser Support |
|---------|-------------|-----------------|
| WebCodecs API | Video/audio decoding | Chrome 94+, Edge 94+, Safari 16.4+ |
| Web Audio API | Audio playback | All modern browsers |
| Canvas API | Video rendering | All modern browsers |
| ES2022 | Core functionality | All modern browsers |

## TypeScript Configuration

If you're using TypeScript, XiaoMei includes all necessary type definitions. Your `tsconfig.json` should include:

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

After installation, you can verify XiaoMei is working:

```javascript
import { XiaoMei, VERSION } from '@vivysub/xiaomei';

console.log(`XiaoMei version: ${VERSION}`);

// Create a test instance
const player = new XiaoMei();
console.log('Player created successfully!');
```

## Bundle Size

XiaoMei is designed to be lightweight:

- **Core Player**: ~50KB minified
- **With MediaBunny**: ~250KB minified
- **Gzipped**: ~80KB total

The library is tree-shakable, so you only include what you use.

## Development Setup

For development, you might want to clone the repository:

```bash
git clone https://github.com/wiedymi/xiaomei.git
cd xiaomei
bun install
bun run dev
```

## Next Steps

- [Basic Usage](/guide/basic-usage) - Learn the fundamentals
- [Getting Started](/guide/getting-started) - Build your first player
- [Framework Integration](/guide/react) - Use with React, Vue, etc.
