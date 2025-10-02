# Events API Documentation

AVPlay provides a comprehensive event system that allows you to respond to various player states and user interactions. This document details all available events and their usage.

## Event System Overview

AVPlay's event system is built on a type-safe EventEmitter that:
- Supports all standard HTML media events
- Provides AVPlay-specific events for advanced functionality
- Includes proper TypeScript typing for all events
- Implements memory leak protection
- Supports event listener limits and cleanup

## Core Playback Events

### play
Fired when playback starts.

```typescript
player.on('play', () => {
  console.log('Playback started');
  updatePlayButton('pause');
});
```

**When fired:**
- When `player.play()` is called and playback begins
- After seeking completes and playback resumes
- After buffering completes and playback continues

### pause
Fired when playback is paused.

```typescript
player.on('pause', () => {
  console.log('Playback paused');
  updatePlayButton('play');
});
```

**When fired:**
- When `player.pause()` is called
- When playback is automatically paused due to buffering
- When an error occurs that stops playback

### ended
Fired when playback reaches the end of the media.

```typescript
player.on('ended', () => {
  console.log('Playback completed');
  showReplayButton();
  trackAnalytics('video_complete');
});
```

**When fired:**
- When currentTime reaches the duration
- Only fires once per playback session

### seeking
Fired when a seek operation starts.

```typescript
player.on('seeking', () => {
  console.log('Seeking started');
  showSeekingSpinner();
});
```

**When fired:**
- When `player.seek(time)` is called
- When user drags the progress bar

### seeked
Fired when a seek operation completes.

```typescript
player.on('seeked', () => {
  console.log('Seek completed');
  hideSeekingSpinner();
});
```

**When fired:**
- When the seek operation finishes and playback can continue
- After the player has moved to the new position

### timeupdate
Fired regularly during playback with the current time.

```typescript
player.on('timeupdate', (currentTime: number) => {
  updateProgressBar(currentTime, player.duration);
  updateTimeDisplay(currentTime);

  // Check for specific time markers
  if (currentTime > 30 && !hasTrackedEngagement) {
    trackAnalytics('engaged_viewer');
    hasTrackedEngagement = true;
  }
});
```

**Parameters:**
- `currentTime` (number): Current playback position in seconds

**When fired:**
- Approximately every 250ms during playback
- When seeking to a new position

### ratechange
Fired when the playback rate changes.

```typescript
player.on('ratechange', (rate: number) => {
  console.log(`Playback rate changed to ${rate}x`);
  updatePlaybackRateDisplay(rate);
});
```

**Parameters:**
- `rate` (number): New playback rate (e.g., 0.5, 1, 1.5, 2)

**When fired:**
- When `player.playbackRate` is modified
- When user changes playback speed

## Loading Events

### loadstart
Fired when loading of the media begins.

```typescript
player.on('loadstart', () => {
  console.log('Started loading media');
  showLoadingIndicator();
  resetErrorState();
});
```

**When fired:**
- When `player.load()` is called
- When a new source is set

### loadedmetadata
Fired when media metadata has been loaded.

```typescript
player.on('loadedmetadata', () => {
  console.log('Metadata loaded');
  console.log(`Duration: ${player.duration}s`);
  console.log(`Dimensions: ${player.videoWidth}x${player.videoHeight}`);

  initializeProgressBar(player.duration);
  updateVideoInfo(player.videoWidth, player.videoHeight);
});
```

**When fired:**
- When basic media information becomes available
- Before any actual media data is loaded

### loadeddata
Fired when the first frame of media has been loaded.

```typescript
player.on('loadeddata', () => {
  console.log('First frame loaded');
  hideLoadingIndicator();
  enablePlayButton();
});
```

**When fired:**
- When enough data is available to render the first frame
- Player is ready for basic interaction

### canplay
Fired when the player can start playing the media.

```typescript
player.on('canplay', () => {
  console.log('Can start playing');
  enableAllControls();

  // Auto-play if enabled
  if (shouldAutoPlay) {
    player.play();
  }
});
```

**When fired:**
- When enough data is buffered to start playback
- May still require buffering during playback

### canplaythrough
Fired when the player can play through the entire media without buffering.

```typescript
player.on('canplaythrough', () => {
  console.log('Can play through without buffering');
  hideBufferingIndicator();
  setOptimalQuality();
});
```

**When fired:**
- When sufficient data is buffered for smooth playback
- Indicates good network conditions

### progress
Fired periodically as the media downloads.

```typescript
player.on('progress', (buffered: TimeRanges) => {
  updateBufferIndicator(buffered);

  // Calculate download progress
  if (buffered.length > 0) {
    const bufferedEnd = buffered.end(buffered.length - 1);
    const progress = (bufferedEnd / player.duration) * 100;
    console.log(`Downloaded: ${progress.toFixed(1)}%`);
  }
});
```

**Parameters:**
- `buffered` (TimeRanges): Buffered time ranges

**When fired:**
- As media data downloads
- When buffer state changes

### waiting
Fired when playback stops due to lack of data.

```typescript
player.on('waiting', () => {
  console.log('Waiting for data');
  showBufferingSpinner();
  pauseAnalyticsTracking();
});
```

**When fired:**
- When playback pauses due to buffering
- When network is slow or interrupted

### stalled
Fired when the download has stalled.

```typescript
player.on('stalled', () => {
  console.log('Download stalled');
  showNetworkIssueWarning();

  // Retry or switch quality
  handleNetworkIssue();
});
```

**When fired:**
- When download progress stops unexpectedly
- May indicate network issues

## Audio Events

### volumechange
Fired when volume or muted state changes.

```typescript
player.on('volumechange', (volume: number, muted: boolean) => {
  console.log(`Volume: ${Math.round(volume * 100)}%, Muted: ${muted}`);

  updateVolumeSlider(volume);
  updateMuteButton(muted);
  saveVolumePreference(volume, muted);
});
```

**Parameters:**
- `volume` (number): Volume level (0-1)
- `muted` (boolean): Whether audio is muted

**When fired:**
- When `player.volume` is changed
- When `player.muted` is toggled

## Error Events

### error
Fired when an error occurs.

```typescript
player.on('error', (error: Error) => {
  console.error('Player error:', error);

  showErrorMessage(error.message);
  hideLoadingIndicator();

  // Handle different error types
  if (error instanceof MediaError) {
    handleMediaError(error);
  } else if (error.message.includes('network')) {
    handleNetworkError(error);
  } else {
    handleGenericError(error);
  }
});
```

**Parameters:**
- `error` (Error): Error object with details

**When fired:**
- When media loading fails
- When decoding errors occur
- When network errors happen
- When invalid operations are attempted

## Track Events

### tracksChanged
Fired when available tracks change.

```typescript
player.on('tracksChanged', (tracks: TrackList) => {
  console.log('Tracks updated:', tracks);

  updateVideoQualitySelector(tracks.video);
  updateAudioTrackSelector(tracks.audio);

  // Auto-select preferred tracks
  selectPreferredTracks(tracks);
});
```

**Parameters:**
- `tracks` (TrackList): Object containing video and audio track arrays

**When fired:**
- When media is loaded and tracks are discovered
- When tracks are added or removed dynamically

### trackChanged
Fired when the active track changes.

```typescript
player.on('trackChanged', (type: 'video' | 'audio', trackIndex: number) => {
  console.log(`${type} track changed to index: ${trackIndex}`);

  if (type === 'video') {
    const track = player.tracks.video[trackIndex];
    updateQualityIndicator(track.width, track.height);
  } else {
    const track = player.tracks.audio[trackIndex];
    updateLanguageIndicator(track.language);
  }
});
```

**Parameters:**
- `type` ('video' | 'audio'): Type of track that changed
- `trackIndex` (number): Index of the new active track

**When fired:**
- When `player.selectVideoTrack()` or `player.selectAudioTrack()` is called
- When automatic track switching occurs

### trackSwitching
Fired when a track switch operation begins.

```typescript
player.on('trackSwitching', (type: 'video' | 'audio') => {
  console.log(`Switching ${type} track...`);
  showTrackSwitchingIndicator(type);
});
```

**Parameters:**
- `type` ('video' | 'audio'): Type of track being switched

### trackSwitched
Fired when a track switch operation completes.

```typescript
player.on('trackSwitched', (type: 'video' | 'audio', trackIndex: number) => {
  console.log(`${type} track switched successfully`);
  hideTrackSwitchingIndicator(type);
});
```

**Parameters:**
- `type` ('video' | 'audio'): Type of track that was switched
- `trackIndex` (number): Index of the new active track

## Source Events

### sourceChanged
Fired when the media source changes.

```typescript
player.on('sourceChanged', (source: string) => {
  console.log('Source changed to:', source);

  resetPlayerState();
  updateMediaInfo(source);
  saveRecentlyPlayed(source);
});
```

**Parameters:**
- `source` (string): New source URL or identifier

**When fired:**
- When `player.load()` is called with a new source
- When source is changed programmatically

## Player Lifecycle Events

### ready
Fired when the player is fully initialized and ready.

```typescript
player.on('ready', () => {
  console.log('Player is ready');

  enablePlayerControls();
  loadUserPreferences();
  initializePlugins();
});
```

**When fired:**
- After player initialization is complete
- Before any media is loaded

### destroy
Fired when the player is being destroyed.

```typescript
player.on('destroy', () => {
  console.log('Player is being destroyed');

  savePlayerState();
  cleanupEventListeners();
  destroyPlugins();
});
```

**When fired:**
- When `player.destroy()` is called
- Before cleanup operations begin

## Advanced Events

### frameChanged
Fired when a new video frame is available.

```typescript
player.on('frameChanged', (frame: VideoFrame) => {
  // Process frame for custom effects
  processVideoFrame(frame);

  // Update frame counter
  frameCount++;
});
```

**Parameters:**
- `frame` (VideoFrame): New video frame object

**When fired:**
- When a new video frame is decoded and ready
- During active playback

### frameRendered
Fired when a frame is rendered to the canvas.

```typescript
player.on('frameRendered', (timestamp: number) => {
  // Track rendering performance
  trackFrameRate(timestamp);

  // Update custom overlays
  updateOverlays(timestamp);
});
```

**Parameters:**
- `timestamp` (number): Render timestamp in milliseconds

**When fired:**
- After each frame is drawn to the canvas
- Used for performance monitoring

### memoryUsage
Fired when memory usage information is available.

```typescript
player.on('memoryUsage', (bytes: number) => {
  console.log(`Memory usage: ${(bytes / 1024 / 1024).toFixed(2)} MB`);

  if (bytes > 100 * 1024 * 1024) { // 100MB
    optimizeMemoryUsage();
  }
});
```

**Parameters:**
- `bytes` (number): Current memory usage in bytes

**When fired:**
- Periodically during playback
- When memory usage changes significantly

## Event Listener Management

### Adding Listeners

```typescript
// Basic listener
player.on('play', handlePlay);

// Listener with context
player.on('timeupdate', function(time) {
  this.updateUI(time);
}.bind(uiController));

// One-time listener
player.once('canplay', () => {
  console.log('Ready to play - this will only fire once');
});

// Multiple events with same handler
['play', 'pause'].forEach(event => {
  player.on(event, updatePlayState);
});
```

### Removing Listeners

```typescript
// Remove specific listener
player.off('play', handlePlay);

// Remove all listeners for an event
player.off('timeupdate');

// Remove all listeners
player.removeAllListeners();
```

### Listener Limits

```typescript
// Set maximum listeners for memory protection
player.setMaxListeners(50);

// Check current listener count
const count = player.listenerCount('timeupdate');
console.log(`timeupdate has ${count} listeners`);

// Get all event names with listeners
const events = player.eventNames();
console.log('Events with listeners:', events);
```

## Error Handling

```typescript
// Comprehensive error handling
player.on('error', (error) => {
  console.error('Player error:', {
    message: error.message,
    code: error.code,
    timestamp: Date.now(),
    playerState: player.store.getState()
  });

  // Report to error tracking service
  errorTracker.report(error, {
    player: 'avplay',
    version: '1.0.0',
    userAgent: navigator.userAgent
  });
});

// Handle specific error types
player.on('error', (error) => {
  if (error instanceof MediaError) {
    switch (error.code) {
      case MediaError.MEDIA_ERR_NETWORK:
        showRetryDialog();
        break;
      case MediaError.MEDIA_ERR_DECODE:
        showFormatError();
        break;
      case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
        showUnsupportedError();
        break;
    }
  }
});
```

## Best Practices

1. **Always Clean Up**: Remove event listeners when components unmount
2. **Use Specific Events**: Subscribe to the most specific event for your needs
3. **Throttle Frequent Events**: Use throttling for high-frequency events like `timeupdate`
4. **Handle Errors Gracefully**: Always listen for error events
5. **Monitor Performance**: Use frame and memory events for optimization
6. **Type Safety**: Leverage TypeScript types for event parameters
7. **Avoid Memory Leaks**: Set reasonable listener limits and clean up properly

The event system in AVPlay provides comprehensive coverage of all player states and interactions, enabling you to build responsive and feature-rich video applications.