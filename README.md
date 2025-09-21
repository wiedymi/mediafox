# XiaoMei 小美 - Monorepo

A monorepo for XiaoMei, a framework-agnostic, TypeScript-first video player library powered by [Mediabunny](https://github.com/Vanilagy/mediabunny).

## Packages

- **[xiaomei](./packages/xiaomei)** - Core video player library

## Getting Started

This is a Bun workspace monorepo. To get started:

```bash
# Install dependencies
bun install

# Build all packages
bun run build

# Run development
bun run dev

# Run type checking
bun run typecheck

# Build documentation
bun run docs:build
```

## Workspace Structure

```
xiaomei/
├── packages/
│   └── xiaomei/        # Core player library
├── docs/               # Documentation site
├── scripts/            # Build and utility scripts
└── package.json        # Workspace configuration
```

## Development

### Adding a New Package

1. Create a new directory under `packages/`
2. Add a `package.json` with the package configuration
3. Run `bun install` from the root to link the package

### Running Commands

You can run commands for specific packages using filters:

```bash
# Run build for xiaomei package only
bun run --filter xiaomei build

# Run tests for all packages
bun run test
```

## Documentation

Visit the [documentation site](https://xiaomei.vivysub.com) for detailed guides and API references.

To run the documentation locally:

```bash
bun run docs:dev
```

## License

MIT

## Credits

Powered by [Mediabunny](https://github.com/Vanilagy/mediabunny) - the powerful media processing library for the web.
