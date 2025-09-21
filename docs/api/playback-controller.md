# PlaybackController API Documentation

The PlaybackController manages all aspects of media playback in XiaoMei, including play/pause controls, seeking, timing, synchronization, and playback rate management.

## Class Overview

```typescript
class PlaybackController {
  constructor(player: XiaoMei);

  // Playback control
  play(): Promise<void>;
  pause(): Promise<void>;
  stop(): Promise<void>;
  togglePlayback(): Promise<void>;

  // Seeking and time control
  seek(time: number): Promise<void>;
  seekBy(delta: number): Promise<void>;
  seekToPercentage(percentage: number): Promise<void>;

  // Playback rate
  setPlaybackRate(rate: number): Promise<void>;
  getPlaybackRate(): number;

  // Time information
  getCurrentTime(): number;
  getDuration(): number;
  getProgress(): number;

  // Playback state
  isPlaying(): boolean;
  isPaused(): boolean;
  isEnded(): boolean;
  isSeeking(): boolean;

  // Advanced controls
  frame(direction: 'forward' | 'backward'): Promise<void>;
  setLoop(enabled: boolean): void;
  isLooping(): boolean;

  // Events
  on(event: PlaybackEvent, listener: Function): void;
  off(event: PlaybackEvent, listener?: Function): void;
}
```

## Basic Playback Controls

### play()

Starts or resumes playback.

```typescript
// Basic play
await playbackController.play();

// Play with error handling
try {
  await playbackController.play();
  console.log('Playback started');
  updatePlayButton('pause');
} catch (error) {
  console.error('Failed to start playback:', error);
  showPlaybackError(error.message);
}

// Conditional play
if (!playbackController.isPlaying()) {
  await playbackController.play();
}

// Play after user interaction (for autoplay policies)
document.addEventListener('click', async () => {
  if (shouldAutoPlay) {
    await playbackController.play();
  }
}, { once: true });

// Play with analytics
async function playWithTracking() {
  const startTime = Date.now();

  await playbackController.play();

  analytics.track('video_play', {
    video_id: getCurrentVideoId(),
    start_time: playbackController.getCurrentTime(),
    timestamp: startTime
  });
}
```

**Returns:** Promise&lt;void&gt; - Resolves when playback starts

**Events fired:**
- `play` - When playback starts
- `playing` - When playback begins after being paused/buffering

**Possible errors:**
- `NotAllowedError` - Autoplay prevented by browser policy
- `NotSupportedError` - Media format not supported
- `AbortError` - Operation was aborted

### pause()

Pauses playback.

```typescript
// Basic pause
await playbackController.pause();

// Pause with UI update
async function pauseWithFeedback() {
  await playbackController.pause();
  updatePlayButton('play');
  showPauseIndicator();
}

// Conditional pause
if (playbackController.isPlaying()) {
  await playbackController.pause();
}

// Auto-pause on visibility change
document.addEventListener('visibilitychange', async () => {
  if (document.hidden && playbackController.isPlaying()) {
    await playbackController.pause();
  }
});

// Pause with position tracking
async function pauseWithTracking() {
  const currentTime = playbackController.getCurrentTime();

  await playbackController.pause();

  analytics.track('video_pause', {
    video_id: getCurrentVideoId(),
    pause_time: currentTime,
    total_watched: getTotalWatchedTime()
  });
}
```

**Returns:** Promise&lt;void&gt; - Resolves when playback pauses

**Events fired:**
- `pause` - When playback is paused

### stop()

Stops playback and resets position to beginning.

```typescript
// Basic stop
await playbackController.stop();

// Stop with cleanup
async function stopWithCleanup() {
  await playbackController.stop();
  clearProgressTimer();
  resetPlayerUI();
  saveWatchProgress(0);
}

// Stop on component unmount
class VideoPlayer {
  async destroy() {
    await playbackController.stop();
    // Additional cleanup...
  }
}

// Stop with confirmation
async function stopWithConfirmation() {
  const confirmed = confirm('Stop playback and return to beginning?');
  if (confirmed) {
    await playbackController.stop();
  }
}
```

**Returns:** Promise&lt;void&gt; - Resolves when stopped and reset

**Events fired:**
- `pause` - When playback stops
- `seeked` - When position resets to 0

### togglePlayback()

Toggles between play and pause states.

```typescript
// Basic toggle
await playbackController.togglePlayback();

// Toggle with UI update
async function toggleWithFeedback() {
  const wasPlaying = playbackController.isPlaying();

  await playbackController.togglePlayback();

  const button = document.getElementById('play-pause-btn');
  button.textContent = wasPlaying ? 'Play' : 'Pause';
}

// Keyboard shortcut handler
document.addEventListener('keydown', async (e) => {
  if (e.code === 'Space' && e.target === document.body) {
    e.preventDefault();
    await playbackController.togglePlayback();
  }
});

// Toggle with state tracking
async function smartToggle() {
  const wasPlaying = playbackController.isPlaying();

  await playbackController.togglePlayback();

  analytics.track(wasPlaying ? 'video_pause' : 'video_play', {
    video_id: getCurrentVideoId(),
    time: playbackController.getCurrentTime()
  });
}
```

**Returns:** Promise&lt;void&gt; - Resolves when toggle completes

## Seeking and Time Control

### seek(time)

Seeks to a specific time position.

```typescript
// Seek to specific time
await playbackController.seek(120); // Seek to 2 minutes

// Seek with bounds checking
async function safSeek(time: number) {
  const duration = playbackController.getDuration();
  const clampedTime = Math.max(0, Math.min(time, duration));

  await playbackController.seek(clampedTime);
}

// Seek with UI feedback
async function seekWithFeedback(time: number) {
  showSeekingIndicator();

  try {
    await playbackController.seek(time);
    updateTimeDisplay(time);
  } catch (error) {
    console.error('Seek failed:', error);
    showSeekError();
  } finally {
    hideSeekingIndicator();
  }
}

// Seek to chapter markers
const chapters = [0, 300, 600, 900]; // Chapter start times

async function seekToChapter(chapterIndex: number) {
  if (chapterIndex >= 0 && chapterIndex < chapters.length) {
    await playbackController.seek(chapters[chapterIndex]);
  }
}

// Progress bar seeking
function setupProgressBarSeeking() {
  const progressBar = document.getElementById('progress-bar') as HTMLInputElement;

  progressBar.addEventListener('input', async (e) => {
    const percentage = parseFloat((e.target as HTMLInputElement).value);
    const duration = playbackController.getDuration();
    const seekTime = (percentage / 100) * duration;

    await playbackController.seek(seekTime);
  });
}
```

**Parameters:**
- `time` (number): Target time in seconds

**Returns:** Promise&lt;void&gt; - Resolves when seek completes

**Events fired:**
- `seeking` - When seek operation starts
- `seeked` - When seek operation completes

### seekBy(delta)

Seeks by a relative time delta.

```typescript
// Skip forward 10 seconds
await playbackController.seekBy(10);

// Skip backward 30 seconds
await playbackController.seekBy(-30);

// Keyboard shortcuts for seeking
document.addEventListener('keydown', async (e) => {
  switch (e.code) {
    case 'ArrowRight':
      e.preventDefault();
      await playbackController.seekBy(10);
      break;
    case 'ArrowLeft':
      e.preventDefault();
      await playbackController.seekBy(-10);
      break;
    case 'ArrowUp':
      e.preventDefault();
      await playbackController.seekBy(60); // Skip forward 1 minute
      break;
    case 'ArrowDown':
      e.preventDefault();
      await playbackController.seekBy(-60); // Skip back 1 minute
      break;
  }
});

// Smart seeking that respects boundaries
async function smartSeekBy(delta: number) {
  const currentTime = playbackController.getCurrentTime();
  const duration = playbackController.getDuration();
  const newTime = Math.max(0, Math.min(currentTime + delta, duration));

  await playbackController.seek(newTime);
}

// Variable seek distances based on video length
async function adaptiveSeekBy(direction: 'forward' | 'backward') {
  const duration = playbackController.getDuration();
  let delta: number;

  if (duration < 300) { // < 5 minutes
    delta = 5;
  } else if (duration < 1800) { // < 30 minutes
    delta = 10;
  } else {
    delta = 30;
  }

  if (direction === 'backward') delta = -delta;

  await playbackController.seekBy(delta);
}
```

**Parameters:**
- `delta` (number): Time delta in seconds (positive for forward, negative for backward)

**Returns:** Promise&lt;void&gt; - Resolves when seek completes

### seekToPercentage(percentage)

Seeks to a percentage of the total duration.

```typescript
// Seek to 50% of video
await playbackController.seekToPercentage(50);

// Seek to beginning
await playbackController.seekToPercentage(0);

// Seek to end
await playbackController.seekToPercentage(100);

// Thumbnail preview seeking
async function previewSeek(percentage: number) {
  // Show thumbnail at percentage
  const previewTime = (percentage / 100) * playbackController.getDuration();
  showThumbnailPreview(previewTime);

  // Seek when user confirms
  if (await confirmSeek()) {
    await playbackController.seekToPercentage(percentage);
  }
}

// Progress bar with percentage
function setupPercentageProgressBar() {
  const progressBar = document.getElementById('progress-bar') as HTMLInputElement;

  progressBar.addEventListener('change', async (e) => {
    const percentage = parseFloat((e.target as HTMLInputElement).value);
    await playbackController.seekToPercentage(percentage);
  });
}

// Seek to specific milestones
const milestones = [0, 25, 50, 75, 100]; // Percentage milestones

async function seekToMilestone(index: number) {
  if (index >= 0 && index < milestones.length) {
    await playbackController.seekToPercentage(milestones[index]);
  }
}
```

**Parameters:**
- `percentage` (number): Target percentage (0-100)

**Returns:** Promise&lt;void&gt; - Resolves when seek completes

## Playback Rate Control

### setPlaybackRate(rate)

Sets the playback speed.

```typescript
// Normal speed
await playbackController.setPlaybackRate(1);

// Double speed
await playbackController.setPlaybackRate(2);

// Half speed
await playbackController.setPlaybackRate(0.5);

// Speed control UI
const speedOptions = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

function createSpeedSelector() {
  const select = document.createElement('select');

  speedOptions.forEach(speed => {
    const option = document.createElement('option');
    option.value = speed.toString();
    option.textContent = `${speed}x`;
    if (speed === 1) option.selected = true;
    select.appendChild(option);
  });

  select.addEventListener('change', async (e) => {
    const rate = parseFloat((e.target as HTMLSelectElement).value);
    await playbackController.setPlaybackRate(rate);
  });

  return select;
}

// Keyboard shortcuts for speed control
document.addEventListener('keydown', async (e) => {
  if (e.shiftKey) {
    switch (e.code) {
      case 'Comma': // <
        e.preventDefault();
        await decreaseSpeed();
        break;
      case 'Period': // >
        e.preventDefault();
        await increaseSpeed();
        break;
    }
  }
});

async function increaseSpeed() {
  const currentRate = playbackController.getPlaybackRate();
  const newRate = Math.min(currentRate + 0.25, 4); // Max 4x speed
  await playbackController.setPlaybackRate(newRate);
}

async function decreaseSpeed() {
  const currentRate = playbackController.getPlaybackRate();
  const newRate = Math.max(currentRate - 0.25, 0.25); // Min 0.25x speed
  await playbackController.setPlaybackRate(newRate);
}
```

**Parameters:**
- `rate` (number): Playback rate multiplier (e.g., 1 = normal, 2 = double speed, 0.5 = half speed)

**Returns:** Promise&lt;void&gt; - Resolves when rate is set

**Events fired:**
- `ratechange` - When playback rate changes

### getPlaybackRate()

Returns the current playback rate.

```typescript
// Get current rate
const currentRate = playbackController.getPlaybackRate();
console.log(`Current speed: ${currentRate}x`);

// Update speed indicator
function updateSpeedIndicator() {
  const rate = playbackController.getPlaybackRate();
  const indicator = document.getElementById('speed-indicator');
  indicator.textContent = `${rate}x`;

  // Highlight non-normal speeds
  if (rate !== 1) {
    indicator.classList.add('non-normal-speed');
  } else {
    indicator.classList.remove('non-normal-speed');
  }
}

// Save speed preference
function saveSpeedPreference() {
  const rate = playbackController.getPlaybackRate();
  localStorage.setItem('preferredPlaybackRate', rate.toString());
}

// Restore speed preference
function restoreSpeedPreference() {
  const saved = localStorage.getItem('preferredPlaybackRate');
  if (saved) {
    const rate = parseFloat(saved);
    if (rate > 0 && rate <= 4) {
      playbackController.setPlaybackRate(rate);
    }
  }
}
```

**Returns:** number - Current playback rate

## Time Information

### getCurrentTime() / getDuration() / getProgress()

Returns timing information.

```typescript
// Get current position
const currentTime = playbackController.getCurrentTime();
console.log(`Current time: ${formatTime(currentTime)}`);

// Get total duration
const duration = playbackController.getDuration();
console.log(`Duration: ${formatTime(duration)}`);

// Get progress percentage
const progress = playbackController.getProgress();
console.log(`Progress: ${progress.toFixed(1)}%`);

// Update time display
function updateTimeDisplay() {
  const current = playbackController.getCurrentTime();
  const total = playbackController.getDuration();

  document.getElementById('current-time').textContent = formatTime(current);
  document.getElementById('total-time').textContent = formatTime(total);
  document.getElementById('progress-bar').value = playbackController.getProgress().toString();
}

// Format time helper
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

// Track watch progress
let watchProgress = 0;

playbackController.on('timeupdate', () => {
  const current = playbackController.getCurrentTime();
  const duration = playbackController.getDuration();

  if (duration > 0) {
    const progress = (current / duration) * 100;
    watchProgress = Math.max(watchProgress, progress);

    // Save progress periodically
    if (Math.floor(progress) % 5 === 0) { // Every 5%
      saveWatchProgress(current);
    }
  }
});
```

**Returns:**
- `getCurrentTime()`: number - Current time in seconds
- `getDuration()`: number - Total duration in seconds
- `getProgress()`: number - Progress percentage (0-100)

## Playback State

### State Check Methods

```typescript
// Check playback state
const isPlaying = playbackController.isPlaying();
const isPaused = playbackController.isPaused();
const isEnded = playbackController.isEnded();
const isSeeking = playbackController.isSeeking();

// Update UI based on state
function updatePlaybackUI() {
  const playButton = document.getElementById('play-button');
  const progressBar = document.getElementById('progress-bar');

  if (playbackController.isPlaying()) {
    playButton.textContent = 'Pause';
    playButton.classList.add('playing');
  } else {
    playButton.textContent = 'Play';
    playButton.classList.remove('playing');
  }

  if (playbackController.isSeeking()) {
    progressBar.classList.add('seeking');
  } else {
    progressBar.classList.remove('seeking');
  }

  if (playbackController.isEnded()) {
    showReplayButton();
  }
}

// Conditional actions based on state
async function handleSpaceKey() {
  if (playbackController.isSeeking()) {
    // Don't toggle during seeking
    return;
  }

  if (playbackController.isEnded()) {
    // Restart from beginning
    await playbackController.seek(0);
    await playbackController.play();
  } else {
    // Normal toggle
    await playbackController.togglePlayback();
  }
}

// State-based analytics
function trackPlaybackState() {
  const state = {
    playing: playbackController.isPlaying(),
    paused: playbackController.isPaused(),
    ended: playbackController.isEnded(),
    seeking: playbackController.isSeeking(),
    currentTime: playbackController.getCurrentTime(),
    playbackRate: playbackController.getPlaybackRate()
  };

  analytics.track('playback_state', state);
}
```

**Returns:** boolean - Current state

## Advanced Controls

### frame(direction)

Steps through video frame by frame.

```typescript
// Step forward one frame
await playbackController.frame('forward');

// Step backward one frame
await playbackController.frame('backward');

// Frame stepping controls
function setupFrameStepping() {
  document.addEventListener('keydown', async (e) => {
    if (e.shiftKey) {
      switch (e.code) {
        case 'ArrowRight':
          e.preventDefault();
          await playbackController.frame('forward');
          break;
        case 'ArrowLeft':
          e.preventDefault();
          await playbackController.frame('backward');
          break;
      }
    }
  });
}

// Frame analysis tool
let frameAnalysisMode = false;

async function toggleFrameAnalysis() {
  frameAnalysisMode = !frameAnalysisMode;

  if (frameAnalysisMode) {
    await playbackController.pause();
    showFrameControls();
  } else {
    hideFrameControls();
  }
}

// Precise frame navigation
async function stepFrames(count: number, direction: 'forward' | 'backward') {
  for (let i = 0; i < Math.abs(count); i++) {
    await playbackController.frame(direction);
    await new Promise(resolve => setTimeout(resolve, 50)); // Small delay between frames
  }
}
```

**Parameters:**
- `direction` ('forward' | 'backward'): Direction to step

**Returns:** Promise&lt;void&gt; - Resolves when frame step completes

### setLoop(enabled) / isLooping()

Controls video looping.

```typescript
// Enable looping
playbackController.setLoop(true);

// Disable looping
playbackController.setLoop(false);

// Toggle loop
const currentLoop = playbackController.isLooping();
playbackController.setLoop(!currentLoop);

// Loop button UI
function setupLoopButton() {
  const loopButton = document.getElementById('loop-button');

  loopButton.addEventListener('click', () => {
    const isLooping = playbackController.isLooping();
    playbackController.setLoop(!isLooping);

    // Update button appearance
    loopButton.classList.toggle('active', !isLooping);
    loopButton.title = !isLooping ? 'Disable loop' : 'Enable loop';
  });
}

// Auto-replay for short videos
playbackController.on('ended', () => {
  const duration = playbackController.getDuration();

  // Auto-loop videos under 10 seconds
  if (duration < 10) {
    playbackController.setLoop(true);
    playbackController.seek(0);
    playbackController.play();
  }
});

// Save loop preference
function saveLoopPreference() {
  const looping = playbackController.isLooping();
  localStorage.setItem('loopEnabled', looping.toString());
}
```

## Event Handling

```typescript
// Time updates
playbackController.on('timeupdate', (currentTime: number) => {
  updateTimeDisplay();
  checkPlaybackMilestones(currentTime);
});

// Playback state changes
playbackController.on('play', () => {
  console.log('Playback started');
  hidePlayButton();
  startActivityTimer();
});

playbackController.on('pause', () => {
  console.log('Playback paused');
  showPlayButton();
  stopActivityTimer();
});

playbackController.on('ended', () => {
  console.log('Playback ended');
  showReplayButton();
  trackVideoCompletion();
});

// Seeking events
playbackController.on('seeking', () => {
  console.log('Seeking started');
  showSeekingIndicator();
});

playbackController.on('seeked', () => {
  console.log('Seeking completed');
  hideSeekingIndicator();
});

// Rate changes
playbackController.on('ratechange', (rate: number) => {
  console.log(`Playback rate changed to ${rate}x`);
  updateSpeedIndicator(rate);
});

// Buffer events
playbackController.on('waiting', () => {
  console.log('Waiting for buffer');
  showBufferingIndicator();
});

playbackController.on('canplay', () => {
  console.log('Can resume playing');
  hideBufferingIndicator();
});
```

## Advanced Features

### Playback Analytics

```typescript
class PlaybackAnalytics {
  private startTime: number = 0;
  private totalWatched: number = 0;
  private lastPosition: number = 0;

  constructor(private controller: PlaybackController) {
    this.setupTracking();
  }

  private setupTracking() {
    this.controller.on('play', () => {
      this.startTime = Date.now();
      this.lastPosition = this.controller.getCurrentTime();
    });

    this.controller.on('pause', () => {
      this.updateWatchTime();
    });

    this.controller.on('seeked', () => {
      this.lastPosition = this.controller.getCurrentTime();
    });

    this.controller.on('ended', () => {
      this.updateWatchTime();
      this.trackCompletion();
    });
  }

  private updateWatchTime() {
    if (this.startTime > 0) {
      const sessionTime = Date.now() - this.startTime;
      this.totalWatched += sessionTime;
      this.startTime = 0;
    }
  }

  private trackCompletion() {
    const duration = this.controller.getDuration();
    const completionRate = (this.totalWatched / 1000) / duration;

    analytics.track('video_completion', {
      completion_rate: Math.min(completionRate, 1),
      total_watched_time: this.totalWatched / 1000,
      video_duration: duration
    });
  }

  getWatchStats() {
    return {
      totalWatched: this.totalWatched,
      currentPosition: this.controller.getCurrentTime(),
      completionRate: this.getCompletionRate()
    };
  }

  private getCompletionRate(): number {
    const duration = this.controller.getDuration();
    return duration > 0 ? (this.totalWatched / 1000) / duration : 0;
  }
}
```

### Synchronized Playback

```typescript
class SynchronizedPlayback {
  constructor(
    private controller: PlaybackController,
    private syncId: string
  ) {
    this.setupSynchronization();
  }

  private setupSynchronization() {
    // Send sync events to other players
    this.controller.on('play', () => {
      this.broadcast({ type: 'play', time: this.controller.getCurrentTime() });
    });

    this.controller.on('pause', () => {
      this.broadcast({ type: 'pause', time: this.controller.getCurrentTime() });
    });

    this.controller.on('seeked', () => {
      this.broadcast({ type: 'seek', time: this.controller.getCurrentTime() });
    });

    // Listen for sync events from other players
    this.listenForSyncEvents();
  }

  private broadcast(event: SyncEvent) {
    // Send to other players via WebSocket, WebRTC, etc.
    sendSyncEvent(this.syncId, event);
  }

  private listenForSyncEvents() {
    onSyncEvent(this.syncId, async (event: SyncEvent) => {
      switch (event.type) {
        case 'play':
          await this.controller.seek(event.time);
          await this.controller.play();
          break;
        case 'pause':
          await this.controller.pause();
          break;
        case 'seek':
          await this.controller.seek(event.time);
          break;
      }
    });
  }
}
```

## Best Practices

1. **Error Handling**: Always wrap playback operations in try-catch blocks
2. **User Feedback**: Provide visual feedback for loading and seeking states
3. **Accessibility**: Support keyboard shortcuts and screen reader announcements
4. **Performance**: Throttle frequent time updates to avoid overwhelming the UI
5. **State Management**: Track and respond to all playback state changes
6. **Analytics**: Implement comprehensive playback tracking for insights
7. **Synchronization**: Consider multi-device or multi-user synchronization needs

The PlaybackController provides comprehensive control over media playback with support for advanced features like frame stepping, variable speed playback, and sophisticated event handling.