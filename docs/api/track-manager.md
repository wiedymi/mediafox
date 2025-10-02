# TrackManager API Documentation

The TrackManager handles multi-track media content, providing APIs for track discovery, selection, and management in MediaFox. It supports video tracks (different qualities/angles), audio tracks (different languages), and subtitle tracks.

## Class Overview

```typescript
class TrackManager {
  constructor(player: MediaFox);

  // Track discovery
  getTracks(): TrackList;
  getVideoTracks(): VideoTrack[];
  getAudioTracks(): AudioTrack[];
  getSubtitleTracks(): SubtitleTrack[];

  // Track selection
  selectVideoTrack(index: number): Promise<void>;
  selectAudioTrack(index: number): Promise<void>;
  selectSubtitleTrack(index: number): Promise<void>;

  // Current track info
  getCurrentVideoTrack(): number;
  getCurrentAudioTrack(): number;
  getCurrentSubtitleTrack(): number;

  // Track management
  enableTrack(type: TrackType, index: number): Promise<void>;
  disableTrack(type: TrackType, index: number): Promise<void>;
  isTrackEnabled(type: TrackType, index: number): boolean;

  // Track utilities
  findTrackByLanguage(type: TrackType, language: string): number | null;
  findTrackByLabel(type: TrackType, label: string): number | null;
  getTrackInfo(type: TrackType, index: number): TrackInfo | null;

  // Events
  on(event: TrackManagerEvent, listener: Function): void;
  off(event: TrackManagerEvent, listener?: Function): void;
}
```

## Track Types

### TrackList

```typescript
interface TrackList {
  video: VideoTrack[];
  audio: AudioTrack[];
  subtitle: SubtitleTrack[];
}
```

### VideoTrack

```typescript
interface VideoTrack {
  id: string;
  label?: string;
  language?: string;
  width: number;
  height: number;
  frameRate: number;
  bitrate?: number;
  codec: string;
  enabled: boolean;
  selected: boolean;

  // Additional metadata
  metadata?: {
    profile?: string;
    level?: string;
    aspectRatio?: string;
    orientation?: 'landscape' | 'portrait';
    hdr?: boolean;
  };
}
```

### AudioTrack

```typescript
interface AudioTrack {
  id: string;
  label?: string;
  language?: string;
  channels: number;
  sampleRate: number;
  bitrate?: number;
  codec: string;
  enabled: boolean;
  selected: boolean;

  // Additional metadata
  metadata?: {
    channelLayout?: string;
    kind?: 'main' | 'alternative' | 'commentary' | 'descriptions';
    default?: boolean;
  };
}
```

### SubtitleTrack

```typescript
interface SubtitleTrack {
  id: string;
  label?: string;
  language?: string;
  format: 'vtt' | 'srt' | 'ass' | 'ttml';
  url?: string;
  data?: string;
  enabled: boolean;
  selected: boolean;

  // Additional metadata
  metadata?: {
    kind?: 'subtitles' | 'captions' | 'descriptions' | 'chapters';
    default?: boolean;
    forced?: boolean;
  };
}
```

## Track Discovery

### getTracks()

Returns all available tracks.

```typescript
// Get all tracks
const tracks = trackManager.getTracks();
console.log('Video tracks:', tracks.video.length);
console.log('Audio tracks:', tracks.audio.length);
console.log('Subtitle tracks:', tracks.subtitle.length);

// Display track information
function displayTrackInfo(tracks: TrackList) {
  tracks.video.forEach((track, index) => {
    console.log(`Video ${index}: ${track.width}x${track.height} (${track.codec})`);
  });

  tracks.audio.forEach((track, index) => {
    console.log(`Audio ${index}: ${track.language} ${track.channels}ch (${track.codec})`);
  });

  tracks.subtitle.forEach((track, index) => {
    console.log(`Subtitle ${index}: ${track.language} (${track.format})`);
  });
}

// React to track changes
trackManager.on('tracksChanged', (tracks: TrackList) => {
  updateTrackSelectors(tracks);
  displayTrackInfo(tracks);
});
```

**Returns:** TrackList - Object containing all track arrays

### getVideoTracks() / getAudioTracks() / getSubtitleTracks()

Returns tracks of a specific type.

```typescript
// Get video tracks only
const videoTracks = trackManager.getVideoTracks();
const highestQuality = videoTracks.reduce((max, track) =>
  (track.width * track.height) > (max.width * max.height) ? track : max
);

// Get audio tracks only
const audioTracks = trackManager.getAudioTracks();
const englishTrack = audioTracks.find(track => track.language === 'en');

// Get subtitle tracks only
const subtitleTracks = trackManager.getSubtitleTracks();
const captionTracks = subtitleTracks.filter(track =>
  track.metadata?.kind === 'captions'
);

// Create track selector UI
function createVideoQualitySelector() {
  const select = document.createElement('select');
  const videoTracks = trackManager.getVideoTracks();

  videoTracks.forEach((track, index) => {
    const option = document.createElement('option');
    option.value = index.toString();
    option.textContent = `${track.width}x${track.height}`;
    if (track.selected) option.selected = true;
    select.appendChild(option);
  });

  select.addEventListener('change', (e) => {
    const index = parseInt((e.target as HTMLSelectElement).value);
    trackManager.selectVideoTrack(index);
  });

  return select;
}
```

**Returns:** Array of tracks for the specified type

## Track Selection

### selectVideoTrack(index) / selectAudioTrack(index) / selectSubtitleTrack(index)

Switches to a different track.

```typescript
// Switch video quality
async function switchToHighQuality() {
  const videoTracks = trackManager.getVideoTracks();
  const highestIndex = videoTracks.findIndex(track =>
    track.width === Math.max(...videoTracks.map(t => t.width))
  );

  if (highestIndex !== -1) {
    await trackManager.selectVideoTrack(highestIndex);
    console.log('Switched to highest quality');
  }
}

// Switch audio language
async function switchToLanguage(language: string) {
  const audioTracks = trackManager.getAudioTracks();
  const trackIndex = audioTracks.findIndex(track => track.language === language);

  if (trackIndex !== -1) {
    await trackManager.selectAudioTrack(trackIndex);
    console.log(`Switched to ${language} audio`);
  } else {
    console.log(`No ${language} audio track found`);
  }
}

// Enable/disable subtitles
async function toggleSubtitles(enable: boolean) {
  if (enable) {
    const subtitleTracks = trackManager.getSubtitleTracks();
    if (subtitleTracks.length > 0) {
      await trackManager.selectSubtitleTrack(0);
    }
  } else {
    await trackManager.selectSubtitleTrack(-1); // Disable subtitles
  }
}

// Handle track switching with loading states
async function switchVideoTrackWithUI(index: number) {
  const button = document.getElementById('quality-button');
  button.disabled = true;
  button.textContent = 'Switching...';

  try {
    await trackManager.selectVideoTrack(index);
    button.textContent = 'Quality';
  } catch (error) {
    console.error('Failed to switch video track:', error);
    alert('Failed to switch quality');
  } finally {
    button.disabled = false;
  }
}
```

**Parameters:**
- `index` (number): Track index to select (-1 to disable for subtitles)

**Returns:** Promise&lt;void&gt;

**Events fired:**
- `trackSwitching` - Before switching begins
- `trackSwitched` - After switching completes
- `trackSwitchFailed` - If switching fails

## Current Track Information

### getCurrentVideoTrack() / getCurrentAudioTrack() / getCurrentSubtitleTrack()

Returns the index of the currently selected track.

```typescript
// Get current track indices
const currentVideo = trackManager.getCurrentVideoTrack();
const currentAudio = trackManager.getCurrentAudioTrack();
const currentSubtitle = trackManager.getCurrentSubtitleTrack();

console.log(`Current tracks: Video ${currentVideo}, Audio ${currentAudio}, Subtitle ${currentSubtitle}`);

// Update UI to reflect current selections
function updateTrackIndicators() {
  const videoIndex = trackManager.getCurrentVideoTrack();
  const audioIndex = trackManager.getCurrentAudioTrack();

  // Update quality indicator
  const videoTrack = trackManager.getVideoTracks()[videoIndex];
  document.getElementById('quality-indicator').textContent =
    `${videoTrack.width}x${videoTrack.height}`;

  // Update language indicator
  const audioTrack = trackManager.getAudioTracks()[audioIndex];
  document.getElementById('language-indicator').textContent =
    audioTrack.language || 'Unknown';
}

// Save user preferences
function saveTrackPreferences() {
  const preferences = {
    videoQuality: trackManager.getCurrentVideoTrack(),
    audioLanguage: trackManager.getCurrentAudioTrack(),
    subtitlesEnabled: trackManager.getCurrentSubtitleTrack() !== -1
  };

  localStorage.setItem('trackPreferences', JSON.stringify(preferences));
}
```

**Returns:** number - Index of current track (-1 if none selected)

## Track Management

### enableTrack(type, index) / disableTrack(type, index)

Enables or disables a track without switching to it.

```typescript
// Enable multiple audio tracks for mixing
await trackManager.enableTrack('audio', 0); // Main audio
await trackManager.enableTrack('audio', 1); // Commentary

// Disable a problematic track
await trackManager.disableTrack('video', 2);

// Bulk track management
async function configureAccessibility() {
  // Enable audio descriptions
  const audioTracks = trackManager.getAudioTracks();
  const descriptiveIndex = audioTracks.findIndex(track =>
    track.metadata?.kind === 'descriptions'
  );

  if (descriptiveIndex !== -1) {
    await trackManager.enableTrack('audio', descriptiveIndex);
  }

  // Enable captions
  const subtitleTracks = trackManager.getSubtitleTracks();
  const captionIndex = subtitleTracks.findIndex(track =>
    track.metadata?.kind === 'captions'
  );

  if (captionIndex !== -1) {
    await trackManager.enableTrack('subtitle', captionIndex);
  }
}
```

**Parameters:**
- `type` (TrackType): 'video' | 'audio' | 'subtitle'
- `index` (number): Track index

**Returns:** Promise&lt;void&gt;

### isTrackEnabled(type, index)

Checks if a track is currently enabled.

```typescript
// Check track status
const isVideoEnabled = trackManager.isTrackEnabled('video', 0);
const isAudioEnabled = trackManager.isTrackEnabled('audio', 1);

// Update UI based on track status
function updateTrackCheckboxes() {
  const audioTracks = trackManager.getAudioTracks();

  audioTracks.forEach((track, index) => {
    const checkbox = document.getElementById(`audio-${index}`) as HTMLInputElement;
    if (checkbox) {
      checkbox.checked = trackManager.isTrackEnabled('audio', index);
    }
  });
}

// Conditional logic based on track state
if (trackManager.isTrackEnabled('subtitle', 0)) {
  showSubtitleSettings();
} else {
  hideSubtitleSettings();
}
```

**Parameters:**
- `type` (TrackType): Track type
- `index` (number): Track index

**Returns:** boolean - Whether track is enabled

## Track Utilities

### findTrackByLanguage(type, language)

Finds the first track matching a language.

```typescript
// Find tracks by language
const spanishAudio = trackManager.findTrackByLanguage('audio', 'es');
const frenchSubtitles = trackManager.findTrackByLanguage('subtitle', 'fr');

if (spanishAudio !== null) {
  await trackManager.selectAudioTrack(spanishAudio);
}

// Language preference system
async function applyLanguagePreferences(preferences: string[]) {
  for (const language of preferences) {
    const audioIndex = trackManager.findTrackByLanguage('audio', language);
    if (audioIndex !== null) {
      await trackManager.selectAudioTrack(audioIndex);
      break;
    }
  }

  // Apply same for subtitles
  for (const language of preferences) {
    const subtitleIndex = trackManager.findTrackByLanguage('subtitle', language);
    if (subtitleIndex !== null) {
      await trackManager.selectSubtitleTrack(subtitleIndex);
      break;
    }
  }
}

// Usage
await applyLanguagePreferences(['en-US', 'en', 'es', 'fr']);
```

**Parameters:**
- `type` (TrackType): Track type
- `language` (string): Language code (e.g., 'en', 'es', 'fr')

**Returns:** number | null - Track index or null if not found

### findTrackByLabel(type, label)

Finds the first track matching a label.

```typescript
// Find tracks by label
const directorCommentary = trackManager.findTrackByLabel('audio', 'Director Commentary');
const forcedSubtitles = trackManager.findTrackByLabel('subtitle', 'Forced');

// Find highest quality video
const uhd4k = trackManager.findTrackByLabel('video', '4K UHD');
const hd1080p = trackManager.findTrackByLabel('video', '1080p HD');

// Fallback quality selection
async function selectBestQuality() {
  const qualities = ['4K UHD', '1080p HD', '720p HD', 'SD'];

  for (const quality of qualities) {
    const index = trackManager.findTrackByLabel('video', quality);
    if (index !== null) {
      await trackManager.selectVideoTrack(index);
      console.log(`Selected ${quality}`);
      break;
    }
  }
}
```

**Parameters:**
- `type` (TrackType): Track type
- `label` (string): Track label

**Returns:** number | null - Track index or null if not found

### getTrackInfo(type, index)

Gets detailed information about a specific track.

```typescript
// Get detailed track info
const videoInfo = trackManager.getTrackInfo('video', 0);
if (videoInfo) {
  console.log('Video track info:', {
    resolution: `${videoInfo.width}x${videoInfo.height}`,
    frameRate: videoInfo.frameRate,
    bitrate: videoInfo.bitrate,
    codec: videoInfo.codec
  });
}

// Display track details in UI
function showTrackDetails(type: TrackType, index: number) {
  const info = trackManager.getTrackInfo(type, index);
  if (!info) return;

  const details = document.getElementById('track-details');
  details.innerHTML = `
    <h3>${type.charAt(0).toUpperCase() + type.slice(1)} Track ${index}</h3>
    <p>Label: ${info.label || 'N/A'}</p>
    <p>Language: ${info.language || 'N/A'}</p>
    <p>Codec: ${info.codec}</p>
    ${type === 'video' ? `
      <p>Resolution: ${info.width}x${info.height}</p>
      <p>Frame Rate: ${info.frameRate} fps</p>
    ` : ''}
    ${type === 'audio' ? `
      <p>Channels: ${info.channels}</p>
      <p>Sample Rate: ${info.sampleRate} Hz</p>
    ` : ''}
  `;
}
```

**Parameters:**
- `type` (TrackType): Track type
- `index` (number): Track index

**Returns:** TrackInfo | null - Track information or null if not found

## Event Handling

### Track Events

```typescript
// Listen for track changes
trackManager.on('tracksChanged', (tracks: TrackList) => {
  console.log('Available tracks updated');
  updateTrackSelectors(tracks);
  autoSelectPreferredTracks(tracks);
});

trackManager.on('trackSwitching', (type: TrackType, fromIndex: number, toIndex: number) => {
  console.log(`Switching ${type} track from ${fromIndex} to ${toIndex}`);
  showSwitchingIndicator(type);
});

trackManager.on('trackSwitched', (type: TrackType, trackIndex: number) => {
  console.log(`${type} track switched to ${trackIndex}`);
  hideSwitchingIndicator(type);
  updateCurrentTrackDisplay(type, trackIndex);
});

trackManager.on('trackSwitchFailed', (type: TrackType, trackIndex: number, error: Error) => {
  console.error(`Failed to switch ${type} track to ${trackIndex}:`, error);
  hideSwitchingIndicator(type);
  showSwitchError(type, error.message);
});

// Track enabling/disabling events
trackManager.on('trackEnabled', (type: TrackType, index: number) => {
  console.log(`${type} track ${index} enabled`);
  updateTrackStatus(type, index, true);
});

trackManager.on('trackDisabled', (type: TrackType, index: number) => {
  console.log(`${type} track ${index} disabled`);
  updateTrackStatus(type, index, false);
});
```

## Advanced Features

### Adaptive Track Selection

```typescript
class AdaptiveTrackManager {
  constructor(private trackManager: TrackManager) {
    this.setupAdaptiveSelection();
  }

  private setupAdaptiveSelection() {
    // Monitor network conditions
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection.addEventListener('change', () => {
        this.adaptToNetworkCondition(connection.downlink);
      });
    }

    // Monitor viewport size for video quality adaptation
    window.addEventListener('resize', () => {
      this.adaptToViewportSize();
    });
  }

  private adaptToNetworkCondition(bandwidth: number) {
    const videoTracks = this.trackManager.getVideoTracks();
    if (videoTracks.length <= 1) return;

    let targetQuality: number;

    if (bandwidth > 10) {
      // High bandwidth - select highest quality
      targetQuality = this.findHighestQualityTrack(videoTracks);
    } else if (bandwidth > 2) {
      // Medium bandwidth - select medium quality
      targetQuality = this.findMediumQualityTrack(videoTracks);
    } else {
      // Low bandwidth - select lowest quality
      targetQuality = this.findLowestQualityTrack(videoTracks);
    }

    this.trackManager.selectVideoTrack(targetQuality);
  }

  private adaptToViewportSize() {
    const videoTracks = this.trackManager.getVideoTracks();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Find track that best matches viewport
    let bestTrack = 0;
    let bestScore = Infinity;

    videoTracks.forEach((track, index) => {
      const widthDiff = Math.abs(track.width - viewportWidth);
      const heightDiff = Math.abs(track.height - viewportHeight);
      const score = widthDiff + heightDiff;

      if (score < bestScore) {
        bestScore = score;
        bestTrack = index;
      }
    });

    this.trackManager.selectVideoTrack(bestTrack);
  }

  private findHighestQualityTrack(tracks: VideoTrack[]): number {
    return tracks.reduce((maxIndex, track, index) => {
      const maxTrack = tracks[maxIndex];
      return (track.width * track.height) > (maxTrack.width * maxTrack.height) ? index : maxIndex;
    }, 0);
  }

  private findLowestQualityTrack(tracks: VideoTrack[]): number {
    return tracks.reduce((minIndex, track, index) => {
      const minTrack = tracks[minIndex];
      return (track.width * track.height) < (minTrack.width * minTrack.height) ? index : minIndex;
    }, 0);
  }

  private findMediumQualityTrack(tracks: VideoTrack[]): number {
    const sorted = tracks
      .map((track, index) => ({ index, pixels: track.width * track.height }))
      .sort((a, b) => a.pixels - b.pixels);

    return sorted[Math.floor(sorted.length / 2)].index;
  }
}
```

### Track Synchronization

```typescript
class TrackSynchronizer {
  constructor(private trackManager: TrackManager) {
    this.setupSynchronization();
  }

  private setupSynchronization() {
    this.trackManager.on('trackSwitched', async (type, index) => {
      if (type === 'video') {
        await this.synchronizeAudioToVideo(index);
      }
    });
  }

  private async synchronizeAudioToVideo(videoIndex: number) {
    const videoTracks = this.trackManager.getVideoTracks();
    const audioTracks = this.trackManager.getAudioTracks();
    const currentVideo = videoTracks[videoIndex];

    // Find matching audio track
    const matchingAudio = audioTracks.findIndex(audio =>
      audio.language === currentVideo.language ||
      audio.metadata?.associatedVideo === currentVideo.id
    );

    if (matchingAudio !== -1) {
      await this.trackManager.selectAudioTrack(matchingAudio);
      console.log('Synchronized audio track with video');
    }
  }

  async synchronizeAllTracks(language: string) {
    // Synchronize all tracks to same language
    const videoIndex = this.trackManager.findTrackByLanguage('video', language);
    const audioIndex = this.trackManager.findTrackByLanguage('audio', language);
    const subtitleIndex = this.trackManager.findTrackByLanguage('subtitle', language);

    const promises = [];

    if (videoIndex !== null) {
      promises.push(this.trackManager.selectVideoTrack(videoIndex));
    }
    if (audioIndex !== null) {
      promises.push(this.trackManager.selectAudioTrack(audioIndex));
    }
    if (subtitleIndex !== null) {
      promises.push(this.trackManager.selectSubtitleTrack(subtitleIndex));
    }

    await Promise.all(promises);
    console.log(`All tracks synchronized to ${language}`);
  }
}
```

## Best Practices

1. **User Preferences**: Remember and restore user track preferences
2. **Adaptive Selection**: Implement adaptive quality based on network and device
3. **Accessibility**: Support audio descriptions and captions
4. **Language Fallbacks**: Provide fallback language options
5. **Loading States**: Show feedback during track switching
6. **Error Handling**: Handle track switching failures gracefully
7. **Synchronization**: Keep related tracks synchronized

The TrackManager API provides comprehensive multi-track support, enabling sophisticated video applications with quality adaptation, multi-language support, and accessibility features.