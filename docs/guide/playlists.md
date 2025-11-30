# Playlists

MediaFox supports playlists for sequential or manual playback of multiple media sources. Playlists preserve playback position for each item, allowing users to switch away and return later.

## Basic Usage

Load a playlist and set the mode:

```ts
import { MediaFox, Source } from 'mediafox';

const player = new MediaFox({ renderTarget: canvas });

const playlistItems = [
  Source.fromUrl('video1.mp4', { title: 'First Video' }),
  { mediaSource: 'audio1.mp3', title: 'First Audio' },
  Source.fromBlob(blob, { title: 'Custom Blob' })
];

await player.loadPlaylist(playlistItems);
player.playlistMode = 'sequential'; // or 'manual'
player.play(); // Starts first item, auto-advances on end in sequential mode
```

Access playlist data:

```ts
console.log(player.playlist);        // Array of PlaylistItem
console.log(player.playlistIndex);   // Current index (0, 1, 2, ...)
console.log(player.nowPlaying);      // Current PlaylistItem
console.log(player.nowPlaying?.title); // Current title

player.on('playlistitemchange', (e) => {
  console.log(`Now playing: ${e.item.title} at index ${e.index}`);
});
```

Navigation:

```ts
await player.next();       // Switch to next, preserve position if returning
await player.prev();       // Switch to previous
await player.jumpTo(1);    // Switch to index 1

player.addToPlaylist(Source.fromUrl('new.mp4'), 0); // Add at start
await player.removeFromPlaylist(2);                 // Remove index 2
player.clearPlaylist();                             // Clear and stop
```

## Position Preservation

When switching items, the current playback time is saved to `savedPosition`. On return:

- Starts from saved position if exists, else 0.
- Global settings (volume, rate) persist across items.
- Mixed video/audio: Renderer/audio auto-adapt.

## Modes

- `null` (default): No playlist behavior (single source).
- `'manual'`: Navigation via `next()`/`prev()`/`jumpTo()`.
- `'sequential'`: Auto-advance on `'ended'`.
- `'repeat'`: Loop playlist on end.
- `'repeat-one'`: Repeat current item continuously.

## Events

- `playlistchange`: New/cleared playlist.
- `playlistitemchange`: Switched item (payload: `{ index, item, previousIndex? }`).
- `playlistend`: End reached (sequential/manual).
- `playlistadd`/`playlistremove`: Item added/removed.

## Performance

- Lazy loading: Only current item loads/decodes; automatic prefetch of next in sequential mode for faster switches.
- Immutable state: Efficient for reactive UIs (batched updates).
- Memory: Sources dispose on switch/remove/clear; queued prefetches limited to next item only—monitor for large playlists (>100 items fine with lazy).
- Duration tracking: Each item's duration is automatically populated after loading for total playlist duration calculation.

## Framework Integration

See framework-specific guides for examples (React, Vue, etc.).

## Future Enhancements

- Shuffle mode with unshuffle capability
- Cross-item seeking (seek into next/previous items directly)
- Playlist persistence/serialization