# AVPlay Development Guide

## Project Overview

AVPlay is a framework-agnostic video player library that wraps Mediabunny functionality with an ergonomic TypeScript API. It provides complete control over media playback while allowing developers to build their own UI.

## Architecture

### Core Components

1. **AVPlay Class** (`src/avplay.ts`)
   - Main player class that orchestrates all components
   - Manages state, events, and provides public API
   - Integrates with all subsystems

2. **State Management** (`src/state/`)
   - Reactive store with subscription capabilities
   - Immutable state updates
   - Batched updates for performance

3. **Event System** (`src/events/`)
   - Type-safe event emitter
   - Supports all standard media events
   - Memory leak protection with max listeners

4. **Source Management** (`src/sources/`)
   - Handles different media sources (File, Blob, URL, Stream)
   - Creates Mediabunny Input instances
   - Manages source lifecycle

5. **Playback Controller** (`src/playback/controller.ts`)
   - Coordinates video and audio playback
   - Handles synchronization
   - Manages play/pause/seek operations

6. **Video Renderer** (`src/playback/renderer.ts`)
   - Canvas-based rendering
   - Frame buffering and management
   - Screenshot and frame extraction

7. **Audio Manager** (`src/playback/audio.ts`)
   - Web Audio API integration
   - Audio scheduling and synchronization
   - Volume and mute control

8. **Track Manager** (`src/tracks/`)
   - Multi-track support
   - Track selection and switching
   - Track information extraction

## Key Design Decisions

### Framework Agnostic
- No framework dependencies
- Pure TypeScript/JavaScript
- Works with any UI library or vanilla JS

### TypeScript First
- Complete type definitions
- Strongly typed events and state
- IDE-friendly with full IntelliSense

### Performance Optimized
- Frame buffering for smooth playback
- Efficient audio scheduling
- Batched state updates
- Canvas pooling for video rendering

### Ergonomic API
- Simple, intuitive methods
- Property-based access for common operations
- Reactive state subscriptions
- Standard media element-like API

## Development Setup

```bash
# Install dependencies
bun install

# Development mode with watch
bun run dev

# Build for production
bun run build

# Run tests
bun test

# Type checking
bun run typecheck

# Linting
bun run lint
```

## Testing Strategy

### Unit Tests
- Test each component in isolation
- Mock Mediabunny dependencies
- Focus on state management and event handling

### Integration Tests
- Test component interactions
- Verify playback synchronization
- Test track switching and seeking

### E2E Tests
- Test with real media files
- Verify browser compatibility
- Performance benchmarks

## Common Tasks

### Adding a New Event
1. Add event to `PlayerEventMap` in `types.ts`
2. Emit event in appropriate component
3. Update documentation

### Adding a New State Property
1. Add to `PlayerStateData` interface
2. Initialize in `Store.getInitialState()`
3. Add update method in `Store`
4. Update relevant components

### Adding a New Media Source Type
1. Extend `SourceManager.createSource()`
2. Add type detection logic
3. Test with various inputs

## Performance Considerations

### Video Rendering
- Use canvas pooling to reduce GC pressure
- Render only when frame changes
- Use requestAnimationFrame for smooth playback

### Audio Playback
- Schedule audio buffers ahead of time
- Use AudioContext clock for precise timing
- Manage buffer queue efficiently

### State Updates
- Batch state updates using microtasks
- Only notify listeners when state actually changes
- Use immutable updates for predictability

## Browser Compatibility

### Required APIs
- WebCodecs API (for Mediabunny)
- Web Audio API
- Canvas API
- ES2022+ features

### Polyfills
- Consider AudioContext prefix for older browsers
- Handle vendor-prefixed APIs
- Graceful degradation for missing features

## Common Issues and Solutions

### Audio-Video Sync
- Always use AudioContext clock as master clock
- Sync video frames to audio time
- Handle drift with periodic corrections

### Memory Management
- Dispose of resources properly
- Close video frames after use
- Clean up event listeners
- Clear iterators on seek/stop

### Seek Performance
- Use key frame seeking when possible
- Prefetch frames after seek
- Cancel pending operations on new seek

## Future Enhancements

### Planned Features
- [ ] Subtitle rendering
- [ ] Quality/resolution switching
- [ ] Adaptive bitrate streaming
- [ ] DRM support
- [ ] Picture-in-Picture API
- [ ] Playback speed control with pitch correction
- [ ] Audio effects and filters
- [ ] Video filters and transformations

### Architecture Improvements
- [ ] Web Worker support for decoding

## Post-Interaction Checklist

Use these commands from the repository root to validate changes before merging:

- Typecheck
  - `bun run typecheck` (runs in all workspaces)
  - Package-only: `bun run --filter avplay typecheck`

- Build
  - `bun run build` (builds all workspaces)
  - Package-only: `bun run --filter avplay build`

- Biome (Lint/Format/Check)
  - Lint (auto-fix safe issues): `bun run lint`
  - Format (apply formatting): `bun run format`
  - Check (apply remaining safe fixes): `bun run check`
  - CI (no writes, reports only): `bun run ci`

Tips
- If a typecheck fails, narrow scope: `bun run --cwd packages/avplay typecheck`
- Re-run Biome after edits to keep formatting consistent
- Ensure no explicit `any` is introduced (enforced during review)
- [ ] WASM acceleration for video processing
- [ ] Better buffering strategies
- [ ] Preloading and caching system

## Contributing Guidelines

### Code Style
- Use TypeScript strict mode
- Follow existing patterns
- Add JSDoc comments for public APIs
- Keep functions small and focused

### Pull Requests
- Test thoroughly with various media files
- Update documentation
- Add tests for new features
- Ensure no performance regressions

### Bug Reports
- Include browser and OS information
- Provide sample media files if possible
- Include console errors
- Describe expected vs actual behavior

## Resources

- [Mediabunny Documentation](https://github.com/Vanilagy/mediabunny)
- [WebCodecs API](https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)

## Contact

For questions or support, please open an issue on GitHub.
