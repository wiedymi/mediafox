# MediaFox - Monorepo

[![GitHub](https://img.shields.io/badge/-GitHub-181717?style=flat-square&logo=github&logoColor=white)](https://github.com/wiedymi)
[![Twitter](https://img.shields.io/badge/-Twitter-1DA1F2?style=flat-square&logo=twitter&logoColor=white)](https://x.com/wiedymi)
[![Email](https://img.shields.io/badge/-Email-EA4335?style=flat-square&logo=gmail&logoColor=white)](mailto:contact@wiedymi.com)
[![Discord](https://img.shields.io/badge/-Discord-5865F2?style=flat-square&logo=discord&logoColor=white)](https://discord.gg/eKW7GNesuS)
[![Support me](https://img.shields.io/badge/-Support%20me-ff69b4?style=flat-square&logo=githubsponsors&logoColor=white)](https://github.com/sponsors/vivy-company)

A monorepo for MediaFox, a framework-agnostic, TypeScript-first Media Player library powered by [Mediabunny](https://github.com/Vanilagy/mediabunny).

```bash
bun add @mediafox/core mediabunny
```

## Packages

- **[@mediafox/core](./packages/mediafox)** - Core Media Player library
- **[@mediafox/react](./packages/react)** - React hooks for MediaFox

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
mediafox/
├── packages/
│   ├── mediafox/         # Core player library (@mediafox/core)
│   └── react/          # React hooks (@mediafox/react)
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
# Run build for @mediafox/core package only
bun run --filter @mediafox/core build

# Run tests for all packages
bun run test
```

## Documentation

Visit the documentation site for detailed guides and API references.

To run the documentation locally:

```bash
bun run docs:dev
```

## License

MIT

## Credits

Powered by [Mediabunny](https://github.com/Vanilagy/mediabunny) - the powerful media processing library for the web.
