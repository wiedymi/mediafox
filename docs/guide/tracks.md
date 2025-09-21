# Track Management Guide

XiaoMei provides comprehensive multi-track support for handling videos with multiple video and audio streams. This guide covers track discovery, selection, and management.

## Understanding Tracks

Modern video files often contain multiple tracks:
- **Video tracks**: Different resolutions, bitrates, or camera angles
- **Audio tracks**: Different languages, commentary, or audio descriptions
- **Subtitle tracks**: Different languages or accessibility features (future feature)

## Track Structure

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
}

interface AudioTrack {
  id: string;
  label?: string;
  language?: string;
  channels: number;
  sampleRate: number;
  bitrate?: number;
  codec: string;
  enabled: boolean;
}

interface TrackList {
  video: VideoTrack[];
  audio: AudioTrack[];
}
```

## Accessing Track Information

### Getting Available Tracks

```typescript
import { XiaoMei } from 'xiaomei';

const player = new XiaoMei({ canvas: canvasElement });

// Load media and access tracks
await player.load('multi-track-video.mp4');

// Get all available tracks
const tracks = player.tracks;
console.log('Video tracks:', tracks.video);
console.log('Audio tracks:', tracks.audio);

// Access current track indices
console.log('Current video track:', player.currentVideoTrack);
console.log('Current audio track:', player.currentAudioTrack);
```

### Track Information Display

```typescript
function displayTrackInfo(tracks: TrackList) {
  console.log('\n=== Video Tracks ===');
  tracks.video.forEach((track, index) => {
    console.log(`Track ${index}:`);
    console.log(`  Resolution: ${track.width}x${track.height}`);
    console.log(`  Frame Rate: ${track.frameRate} fps`);
    console.log(`  Codec: ${track.codec}`);
    console.log(`  Bitrate: ${track.bitrate ? `${Math.round(track.bitrate / 1000)} kbps` : 'Unknown'}`);
    console.log(`  Language: ${track.language || 'Unknown'}`);
    console.log(`  Enabled: ${track.enabled}`);
    console.log('');
  });

  console.log('\n=== Audio Tracks ===');
  tracks.audio.forEach((track, index) => {
    console.log(`Track ${index}:`);
    console.log(`  Channels: ${track.channels}`);
    console.log(`  Sample Rate: ${track.sampleRate} Hz`);
    console.log(`  Codec: ${track.codec}`);
    console.log(`  Bitrate: ${track.bitrate ? `${Math.round(track.bitrate / 1000)} kbps` : 'Unknown'}`);
    console.log(`  Language: ${track.language || 'Unknown'}`);
    console.log(`  Enabled: ${track.enabled}`);
    console.log('');
  });
}

// Display track information when available
player.on('tracksChanged', displayTrackInfo);
```

## Track Selection

### Switching Video Tracks

```typescript
// Switch to a specific video track
async function switchVideoTrack(trackIndex: number) {
  try {
    await player.selectVideoTrack(trackIndex);
    console.log(`Switched to video track ${trackIndex}`);
  } catch (error) {
    console.error('Failed to switch video track:', error);
  }
}

// Switch to highest quality video track
function selectHighestQuality() {
  const videoTracks = player.tracks.video;
  if (videoTracks.length === 0) return;

  let highestQualityIndex = 0;
  let maxPixels = 0;

  videoTracks.forEach((track, index) => {
    const pixels = track.width * track.height;
    if (pixels > maxPixels) {
      maxPixels = pixels;
      highestQualityIndex = index;
    }
  });

  switchVideoTrack(highestQualityIndex);
}

// Switch to lowest quality for bandwidth saving
function selectLowestQuality() {
  const videoTracks = player.tracks.video;
  if (videoTracks.length === 0) return;

  let lowestQualityIndex = 0;
  let minPixels = Infinity;

  videoTracks.forEach((track, index) => {
    const pixels = track.width * track.height;
    if (pixels < minPixels) {
      minPixels = pixels;
      lowestQualityIndex = index;
    }
  });

  switchVideoTrack(lowestQualityIndex);
}
```

### Switching Audio Tracks

```typescript
// Switch to a specific audio track
async function switchAudioTrack(trackIndex: number) {
  try {
    await player.selectAudioTrack(trackIndex);
    console.log(`Switched to audio track ${trackIndex}`);
  } catch (error) {
    console.error('Failed to switch audio track:', error);
  }
}

// Switch by language preference
function selectAudioByLanguage(preferredLanguage: string) {
  const audioTracks = player.tracks.audio;

  const matchingTrack = audioTracks.findIndex(track =>
    track.language === preferredLanguage
  );

  if (matchingTrack !== -1) {
    switchAudioTrack(matchingTrack);
    return true;
  }

  console.log(`No audio track found for language: ${preferredLanguage}`);
  return false;
}

// Try multiple language preferences
function selectPreferredAudio(languages: string[]) {
  for (const language of languages) {
    if (selectAudioByLanguage(language)) {
      return;
    }
  }

  console.log('No preferred audio language found, keeping default');
}

// Usage
selectPreferredAudio(['en', 'en-US', 'fr', 'es']);
```

## Event Handling

### Track Change Events

```typescript
// Listen for track changes
player.on('tracksChanged', (tracks: TrackList) => {
  console.log('Available tracks updated');
  updateTrackSelectors(tracks);
});

player.on('trackChanged', (type: 'video' | 'audio', trackIndex: number) => {
  console.log(`${type} track changed to index: ${trackIndex}`);

  if (type === 'video') {
    updateVideoQualityIndicator(trackIndex);
  } else {
    updateAudioLanguageIndicator(trackIndex);
  }
});

// Handle track loading states
player.on('trackSwitching', (type: 'video' | 'audio') => {
  console.log(`Switching ${type} track...`);
  showTrackSwitchingSpinner(type);
});

player.on('trackSwitched', (type: 'video' | 'audio', trackIndex: number) => {
  console.log(`${type} track switched successfully`);
  hideTrackSwitchingSpinner(type);
});
```

## UI Components

### Track Selector Component

```typescript
class TrackSelector {
  private videoSelect: HTMLSelectElement;
  private audioSelect: HTMLSelectElement;

  constructor(private player: XiaoMei, container: HTMLElement) {
    this.createSelectors(container);
    this.setupEventListeners();
  }

  private createSelectors(container: HTMLElement) {
    const wrapper = document.createElement('div');
    wrapper.className = 'track-selectors';

    // Video track selector
    const videoWrapper = document.createElement('div');
    videoWrapper.innerHTML = `
      <label for="video-track-select">Video Quality:</label>
      <select id="video-track-select" class="video-track-select">
        <option value="">Loading...</option>
      </select>
    `;
    this.videoSelect = videoWrapper.querySelector('select')!;

    // Audio track selector
    const audioWrapper = document.createElement('div');
    audioWrapper.innerHTML = `
      <label for="audio-track-select">Audio Track:</label>
      <select id="audio-track-select" class="audio-track-select">
        <option value="">Loading...</option>
      </select>
    `;
    this.audioSelect = audioWrapper.querySelector('select')!;

    wrapper.appendChild(videoWrapper);
    wrapper.appendChild(audioWrapper);
    container.appendChild(wrapper);
  }

  private setupEventListeners() {
    // Video track selection
    this.videoSelect.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      const trackIndex = parseInt(target.value);
      if (!isNaN(trackIndex)) {
        this.player.selectVideoTrack(trackIndex);
      }
    });

    // Audio track selection
    this.audioSelect.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      const trackIndex = parseInt(target.value);
      if (!isNaN(trackIndex)) {
        this.player.selectAudioTrack(trackIndex);
      }
    });

    // Update selectors when tracks change
    this.player.on('tracksChanged', this.updateSelectors.bind(this));
    this.player.on('trackChanged', this.updateCurrentSelection.bind(this));
  }

  private updateSelectors(tracks: TrackList) {
    this.updateVideoSelector(tracks.video);
    this.updateAudioSelector(tracks.audio);
  }

  private updateVideoSelector(videoTracks: VideoTrack[]) {
    this.videoSelect.innerHTML = '';

    if (videoTracks.length === 0) {
      this.videoSelect.innerHTML = '<option value="">No video tracks</option>';
      this.videoSelect.disabled = true;
      return;
    }

    videoTracks.forEach((track, index) => {
      const option = document.createElement('option');
      option.value = index.toString();
      option.textContent = this.formatVideoTrackLabel(track, index);
      this.videoSelect.appendChild(option);
    });

    this.videoSelect.disabled = false;
    this.videoSelect.value = this.player.currentVideoTrack.toString();
  }

  private updateAudioSelector(audioTracks: AudioTrack[]) {
    this.audioSelect.innerHTML = '';

    if (audioTracks.length === 0) {
      this.audioSelect.innerHTML = '<option value="">No audio tracks</option>';
      this.audioSelect.disabled = true;
      return;
    }

    audioTracks.forEach((track, index) => {
      const option = document.createElement('option');
      option.value = index.toString();
      option.textContent = this.formatAudioTrackLabel(track, index);
      this.audioSelect.appendChild(option);
    });

    this.audioSelect.disabled = false;
    this.audioSelect.value = this.player.currentAudioTrack.toString();
  }

  private formatVideoTrackLabel(track: VideoTrack, index: number): string {
    const resolution = `${track.width}x${track.height}`;
    const bitrate = track.bitrate ? ` (${Math.round(track.bitrate / 1000)}k)` : '';
    return `${resolution}${bitrate}`;
  }

  private formatAudioTrackLabel(track: AudioTrack, index: number): string {
    const language = track.language || `Track ${index + 1}`;
    const channels = track.channels > 2 ? ` ${track.channels}ch` : '';
    return `${language}${channels}`;
  }

  private updateCurrentSelection(type: 'video' | 'audio', trackIndex: number) {
    if (type === 'video') {
      this.videoSelect.value = trackIndex.toString();
    } else {
      this.audioSelect.value = trackIndex.toString();
    }
  }
}

// Usage
const trackSelector = new TrackSelector(player, document.getElementById('controls')!);
```

### Advanced Track Manager

```typescript
class AdvancedTrackManager {
  private preferences: {
    videoQuality: 'auto' | 'highest' | 'lowest' | number;
    audioLanguages: string[];
    adaptiveBitrate: boolean;
  };

  constructor(private player: XiaoMei) {
    this.preferences = {
      videoQuality: 'auto',
      audioLanguages: ['en', 'en-US'],
      adaptiveBitrate: true
    };

    this.setupAdaptiveHandling();
    this.setupAutoSelection();
  }

  private setupAdaptiveHandling() {
    if (!this.preferences.adaptiveBitrate) return;

    // Monitor network conditions and adjust quality
    let lastBandwidth = 0;
    let adaptiveTimer: NodeJS.Timeout;

    const checkNetworkCondition = () => {
      if (!navigator.connection) return;

      const connection = navigator.connection as any;
      const currentBandwidth = connection.downlink; // Mbps

      if (Math.abs(currentBandwidth - lastBandwidth) > 1) {
        this.adaptVideoQuality(currentBandwidth);
        lastBandwidth = currentBandwidth;
      }
    };

    // Check network conditions every 30 seconds
    adaptiveTimer = setInterval(checkNetworkCondition, 30000);

    // Initial check
    checkNetworkCondition();

    // Cleanup
    this.player.on('destroy', () => {
      clearInterval(adaptiveTimer);
    });
  }

  private adaptVideoQuality(bandwidth: number) {
    const videoTracks = this.player.tracks.video;
    if (videoTracks.length <= 1) return;

    let targetTrackIndex = 0;

    if (bandwidth > 10) {
      // High bandwidth - select highest quality
      targetTrackIndex = this.findHighestQualityTrack();
    } else if (bandwidth > 5) {
      // Medium bandwidth - select medium quality
      targetTrackIndex = this.findMediumQualityTrack();
    } else {
      // Low bandwidth - select lowest quality
      targetTrackIndex = this.findLowestQualityTrack();
    }

    if (targetTrackIndex !== this.player.currentVideoTrack) {
      console.log(`Adapting to ${bandwidth} Mbps: switching to track ${targetTrackIndex}`);
      this.player.selectVideoTrack(targetTrackIndex);
    }
  }

  private setupAutoSelection() {
    this.player.on('tracksChanged', (tracks) => {
      this.autoSelectTracks(tracks);
    });
  }

  private autoSelectTracks(tracks: TrackList) {
    // Auto-select video track based on preference
    if (tracks.video.length > 0) {
      this.selectVideoTrackByPreference();
    }

    // Auto-select audio track based on language preference
    if (tracks.audio.length > 0) {
      this.selectAudioTrackByLanguage();
    }
  }

  private selectVideoTrackByPreference() {
    const videoTracks = this.player.tracks.video;

    switch (this.preferences.videoQuality) {
      case 'highest':
        this.player.selectVideoTrack(this.findHighestQualityTrack());
        break;
      case 'lowest':
        this.player.selectVideoTrack(this.findLowestQualityTrack());
        break;
      case 'auto':
        // Use adaptive logic
        this.adaptVideoQuality(10); // Assume good connection initially
        break;
      default:
        if (typeof this.preferences.videoQuality === 'number') {
          const trackIndex = this.preferences.videoQuality;
          if (trackIndex < videoTracks.length) {
            this.player.selectVideoTrack(trackIndex);
          }
        }
    }
  }

  private selectAudioTrackByLanguage() {
    const audioTracks = this.player.tracks.audio;

    for (const preferredLang of this.preferences.audioLanguages) {
      const trackIndex = audioTracks.findIndex(track =>
        track.language === preferredLang
      );

      if (trackIndex !== -1) {
        this.player.selectAudioTrack(trackIndex);
        return;
      }
    }

    // If no preferred language found, keep the default (index 0)
    console.log('No preferred audio language found, using default');
  }

  private findHighestQualityTrack(): number {
    const videoTracks = this.player.tracks.video;
    let maxPixels = 0;
    let bestIndex = 0;

    videoTracks.forEach((track, index) => {
      const pixels = track.width * track.height;
      if (pixels > maxPixels) {
        maxPixels = pixels;
        bestIndex = index;
      }
    });

    return bestIndex;
  }

  private findLowestQualityTrack(): number {
    const videoTracks = this.player.tracks.video;
    let minPixels = Infinity;
    let bestIndex = 0;

    videoTracks.forEach((track, index) => {
      const pixels = track.width * track.height;
      if (pixels < minPixels) {
        minPixels = pixels;
        bestIndex = index;
      }
    });

    return bestIndex;
  }

  private findMediumQualityTrack(): number {
    const videoTracks = this.player.tracks.video;
    if (videoTracks.length <= 2) {
      return videoTracks.length - 1;
    }

    // Sort tracks by quality and pick the middle one
    const sortedIndices = videoTracks
      .map((track, index) => ({ index, pixels: track.width * track.height }))
      .sort((a, b) => a.pixels - b.pixels)
      .map(item => item.index);

    return sortedIndices[Math.floor(sortedIndices.length / 2)];
  }

  // Public API for updating preferences
  setVideoQualityPreference(quality: 'auto' | 'highest' | 'lowest' | number) {
    this.preferences.videoQuality = quality;
    this.selectVideoTrackByPreference();
  }

  setAudioLanguagePreferences(languages: string[]) {
    this.preferences.audioLanguages = languages;
    this.selectAudioTrackByLanguage();
  }

  enableAdaptiveBitrate(enabled: boolean) {
    this.preferences.adaptiveBitrate = enabled;
    if (enabled) {
      this.setupAdaptiveHandling();
    }
  }
}

// Usage
const trackManager = new AdvancedTrackManager(player);

// Configure preferences
trackManager.setVideoQualityPreference('auto');
trackManager.setAudioLanguagePreferences(['es', 'en', 'fr']);
trackManager.enableAdaptiveBitrate(true);
```

## Performance Considerations

### Track Switching Optimization

```typescript
class OptimizedTrackSwitcher {
  private switchingInProgress = false;
  private pendingSwitches: Array<{type: 'video' | 'audio', index: number}> = [];

  constructor(private player: XiaoMei) {
    this.setupSwitchQueue();
  }

  async switchTrack(type: 'video' | 'audio', index: number) {
    // Queue the switch if one is already in progress
    if (this.switchingInProgress) {
      this.pendingSwitches.push({ type, index });
      return;
    }

    await this.performSwitch(type, index);
  }

  private async performSwitch(type: 'video' | 'audio', index: number) {
    this.switchingInProgress = true;

    try {
      if (type === 'video') {
        await this.player.selectVideoTrack(index);
      } else {
        await this.player.selectAudioTrack(index);
      }
    } finally {
      this.switchingInProgress = false;
      this.processNextSwitch();
    }
  }

  private processNextSwitch() {
    if (this.pendingSwitches.length > 0) {
      const nextSwitch = this.pendingSwitches.shift()!;
      this.performSwitch(nextSwitch.type, nextSwitch.index);
    }
  }

  private setupSwitchQueue() {
    // Process any pending switches when player is ready
    this.player.on('canplay', () => {
      if (this.pendingSwitches.length > 0) {
        this.processNextSwitch();
      }
    });
  }
}
```

## Best Practices

1. **User Preferences**: Store and restore user's track preferences
2. **Adaptive Selection**: Implement bandwidth-aware quality selection
3. **Language Fallbacks**: Provide fallback language options
4. **UI Feedback**: Show loading states during track switches
5. **Error Handling**: Handle track switching failures gracefully
6. **Performance**: Queue track switches to avoid conflicts
7. **Accessibility**: Label tracks clearly with resolution, language, etc.
8. **Network Awareness**: Use Network Information API for adaptive streaming

Track management in XiaoMei provides the foundation for building sophisticated video players with multi-language support and adaptive quality features.