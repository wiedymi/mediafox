# Basic Player Example

This example demonstrates how to create a simple, interactive video player using XiaoMei with essential controls and features.

## Interactive Demo

Try the basic player with different videos and controls:

<div class="basic-player-demo">
  <div class="demo-header">
    <h3>Basic XiaoMei Player</h3>
    <div class="demo-actions">
      <input type="file" id="demo-file-input" accept="video/*" style="display: none;">
      <button id="demo-choose-file">Choose File</button>
      <div class="url-section">
        <input type="url" id="demo-url-input" placeholder="Enter video URL" value="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4">
        <button id="demo-load-url">Load Video</button>
      </div>
        </div>
        </div>

  <div id="demo-error" class="demo-error" style="display: none;"></div>

  <div class="demo-video-container">
    <canvas id="demo-video-canvas" width="640" height="360"></canvas>
    <div id="demo-loading" class="demo-loading" style="display: none;">
      <div class="spinner"></div>
      <span>Loading video...</span>
    </div>
        </div>

  <div class="demo-controls">
    <button id="demo-play-pause" class="demo-btn">▶️ Play</button>

    <div class="demo-progress-container">
      <div id="demo-progress-track" class="demo-progress-track">
        <div id="demo-buffer-bar" class="demo-buffer-bar"></div>
        <div id="demo-progress-fill" class="demo-progress-fill"></div>
        <div id="demo-progress-handle" class="demo-progress-handle"></div>
      </div>
            </div>

    <div id="demo-time" class="demo-time">0:00 / 0:00</div>

    <div class="demo-volume-section">
      <button id="demo-mute-btn" class="demo-btn">🔊</button>
      <input type="range" id="demo-volume" min="0" max="1" step="0.1" value="1" class="demo-volume-slider">
            </div>
        </div>
    </div>

<script>
class BasicPlayerDemo {
    constructor() {
        this.player = null;
        this.isDragging = false;
        this.initializeElements();
        this.setupEventListeners();
    this.initializePlayer();
    }

    initializeElements() {
        // Canvas and containers
    this.canvas = document.getElementById('demo-video-canvas');
    this.loadingIndicator = document.getElementById('demo-loading');
    this.errorDisplay = document.getElementById('demo-error');

        // Controls
    this.playPauseBtn = document.getElementById('demo-play-pause');
    this.progressTrack = document.getElementById('demo-progress-track');
    this.progressFill = document.getElementById('demo-progress-fill');
    this.bufferBar = document.getElementById('demo-buffer-bar');
    this.progressHandle = document.getElementById('demo-progress-handle');
    this.timeDisplay = document.getElementById('demo-time');
    this.muteBtn = document.getElementById('demo-mute-btn');
    this.volumeSlider = document.getElementById('demo-volume');

        // Inputs
    this.fileInput = document.getElementById('demo-file-input');
    this.chooseFileBtn = document.getElementById('demo-choose-file');
    this.urlInput = document.getElementById('demo-url-input');
    this.loadUrlBtn = document.getElementById('demo-load-url');
    }

    async initializePlayer() {
        try {
            this.player = new XiaoMei({
        renderTarget: this.canvas
            });

            this.setupPlayerEvents();
      console.log('Basic player demo initialized');
        } catch (error) {
            console.error('Failed to initialize player:', error);
            this.showError('Failed to initialize player: ' + error.message);
        }
    }

    setupEventListeners() {
        // Play/Pause button
    this.playPauseBtn.addEventListener('click', () => this.togglePlayback());

        // Progress bar interaction
    this.progressTrack.addEventListener('mousedown', (e) => this.startProgressDrag(e));
    document.addEventListener('mousemove', (e) => this.handleProgressDrag(e));
    document.addEventListener('mouseup', () => this.endProgressDrag());

        // Volume controls
    this.muteBtn.addEventListener('click', () => this.toggleMute());
    this.volumeSlider.addEventListener('input', (e) => this.setVolume(parseFloat(e.target.value)));

        // File input
    this.chooseFileBtn.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', (e) => this.loadFile(e.target.files[0]));

        // URL input
    this.loadUrlBtn.addEventListener('click', () => this.loadUrl(this.urlInput.value));
        this.urlInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.loadUrl(this.urlInput.value);
        });

        // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    setupPlayerEvents() {
        // Playback events
        this.player.on('play', () => {
      this.playPauseBtn.textContent = '⏸️ Pause';
        });

        this.player.on('pause', () => {
      this.playPauseBtn.textContent = '▶️ Play';
        });

        this.player.on('ended', () => {
      this.playPauseBtn.textContent = '🔄 Replay';
        });

        // Time updates
        this.player.on('timeupdate', (currentTime) => {
            this.updateTimeDisplay(currentTime);
            this.updateProgress(currentTime);
        });

        // Loading events
        this.player.on('loadstart', () => {
            this.showLoading();
            this.hideError();
    });

    this.player.on('loadedmetadata', (info) => {
      console.log('Video loaded:', info);
        });

        this.player.on('loadeddata', () => {
            this.hideLoading();
        });

        this.player.on('canplay', () => {
      console.log('Video ready to play');
    });

    // Progress events
    this.player.on('progress', (buffered) => {
      this.updateBufferDisplay(buffered);
        });

        // Volume events
        this.player.on('volumechange', (volume, muted) => {
            this.updateVolumeDisplay(volume, muted);
        });

    // Error handling
    this.player.on('error', (error) => {
      this.hideLoading();
      this.showError(error.message);
    });
    }

    async togglePlayback() {
        if (!this.player) return;

        try {
            if (this.player.playing) {
                await this.player.pause();
            } else {
                await this.player.play();
            }
        } catch (error) {
            console.error('Error toggling playback:', error);
            this.showError('Playback error: ' + error.message);
        }
    }

    startProgressDrag(e) {
        if (!this.player || this.player.duration === 0) return;
        this.isDragging = true;
        this.handleProgressDrag(e);
    }

    handleProgressDrag(e) {
        if (!this.isDragging || !this.player) return;

    const rect = this.progressTrack.getBoundingClientRect();
        const percentage = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const time = percentage * this.player.duration;

        this.updateProgressVisual(percentage);
        this.updateTimeDisplay(time);
    }

    endProgressDrag() {
        if (!this.isDragging || !this.player) return;

        const percentage = parseFloat(this.progressHandle.style.left) / 100;
        const time = percentage * this.player.duration;

        this.player.seek(time);
        this.isDragging = false;
    }

    updateProgress(currentTime) {
        if (this.isDragging || !this.player || this.player.duration === 0) return;

        const percentage = (currentTime / this.player.duration) * 100;
        this.updateProgressVisual(percentage);
    }

    updateProgressVisual(percentage) {
    this.progressFill.style.width = `${percentage}%`;
        this.progressHandle.style.left = `${percentage}%`;
    }

  updateBufferDisplay(buffered) {
    if (!buffered || buffered.length === 0) return;

    const duration = this.player.duration || 1;
    let maxBuffered = 0;

    for (let i = 0; i < buffered.length; i++) {
      maxBuffered = Math.max(maxBuffered, buffered.end(i));
    }

    const percentage = (maxBuffered / duration) * 100;
    this.bufferBar.style.width = `${percentage}%`;
  }

    updateTimeDisplay(currentTime) {
        const duration = this.player ? this.player.duration : 0;
        const current = this.formatTime(currentTime);
        const total = this.formatTime(duration);
        this.timeDisplay.textContent = `${current} / ${total}`;
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    toggleMute() {
        if (!this.player) return;
        this.player.muted = !this.player.muted;
    }

    setVolume(volume) {
        if (!this.player) return;
        this.player.volume = volume;
    }

    updateVolumeDisplay(volume, muted) {
        this.volumeSlider.value = volume;

        if (muted) {
            this.muteBtn.textContent = '🔇';
        } else if (volume > 0.5) {
            this.muteBtn.textContent = '🔊';
        } else if (volume > 0) {
            this.muteBtn.textContent = '🔉';
        } else {
            this.muteBtn.textContent = '🔇';
        }
    }

    async loadFile(file) {
        if (!file || !this.player) return;

        try {
            await this.player.load(file);
      this.urlInput.value = ''; // Clear URL input
        } catch (error) {
            console.error('Error loading file:', error);
            this.showError('Failed to load file: ' + error.message);
        }
    }

    async loadUrl(url) {
        if (!url || !this.player) return;

        try {
            await this.player.load(url);
      this.fileInput.value = ''; // Clear file input
        } catch (error) {
            console.error('Error loading URL:', error);
            this.showError('Failed to load URL: ' + error.message);
        }
    }

    handleKeyboard(e) {
        if (!this.player) return;

        // Ignore if user is typing in inputs
        if (e.target.tagName === 'INPUT') return;

        switch (e.code) {
            case 'Space':
                e.preventDefault();
                this.togglePlayback();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                this.player.seek(Math.max(0, this.player.currentTime - 10));
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.player.seek(Math.min(this.player.duration, this.player.currentTime + 10));
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.player.volume = Math.min(1, this.player.volume + 0.1);
                break;
            case 'ArrowDown':
                e.preventDefault();
                this.player.volume = Math.max(0, this.player.volume - 0.1);
                break;
            case 'KeyM':
                e.preventDefault();
                this.toggleMute();
                break;
        }
    }

    showLoading() {
    this.loadingIndicator.style.display = 'flex';
    }

    hideLoading() {
        this.loadingIndicator.style.display = 'none';
    }

    showError(message) {
    this.errorDisplay.textContent = message;
    this.errorDisplay.style.display = 'block';
    }

    hideError() {
    this.errorDisplay.style.display = 'none';
    }

    destroy() {
        if (this.player) {
            this.player.destroy();
            this.player = null;
        }
    }
}

// Initialize the demo
const demo = new BasicPlayerDemo();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  demo.destroy();
});
</script>

<style>
.basic-player-demo {
  max-width: 800px;
  margin: 2rem auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  overflow: hidden;
}

.demo-header {
  padding: 20px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.demo-header h3 {
  margin: 0 0 15px 0;
  color: #333;
}

.demo-actions {
            display: flex;
  gap: 15px;
            align-items: center;
  flex-wrap: wrap;
}

.url-section {
  display: flex;
            gap: 10px;
  flex: 1;
}

.url-section input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
            border-radius: 4px;
  font-size: 14px;
        }

.demo-actions button,
.demo-btn {
  padding: 8px 16px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
  transition: background 0.2s;
        }

.demo-actions button:hover,
.demo-btn:hover {
            background: #0056b3;
        }

.demo-error {
  background: #dc3545;
  color: white;
  padding: 10px 20px;
  margin: 0;
  text-align: center;
}

.demo-video-container {
  position: relative;
  background: black;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}

#demo-video-canvas {
  max-width: 100%;
  height: auto;
  display: block;
}

.demo-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  background: rgba(0,0,0,0.7);
  padding: 15px 25px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid rgba(255,255,255,0.3);
  border-top: 3px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.demo-controls {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px 20px;
  background: #f8f9fa;
  border-top: 1px solid #e9ecef;
}

.demo-progress-container {
            flex: 1;
            position: relative;
  height: 8px;
            background: #ddd;
  border-radius: 4px;
            cursor: pointer;
  margin: 0 10px;
}

.demo-progress-track {
  position: relative;
  width: 100%;
  height: 100%;
}

.demo-buffer-bar {
  position: absolute;
  height: 100%;
  background: rgba(0,123,255,0.3);
  border-radius: 4px;
  width: 0%;
}

.demo-progress-fill {
  position: absolute;
            height: 100%;
            background: #007bff;
  border-radius: 4px;
            width: 0%;
            transition: width 0.1s ease;
        }

.demo-progress-handle {
            position: absolute;
            top: 50%;
  transform: translate(-50%, -50%);
  width: 16px;
  height: 16px;
            background: #007bff;
  border: 2px solid white;
            border-radius: 50%;
            cursor: pointer;
            left: 0%;
  transition: left 0.1s ease;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.demo-progress-container:hover .demo-progress-handle {
  transform: translate(-50%, -50%) scale(1.2);
}

.demo-time {
            font-size: 14px;
            color: #666;
            min-width: 80px;
            text-align: center;
  font-family: monospace;
        }

.demo-volume-section {
            display: flex;
            align-items: center;
  gap: 8px;
        }

.demo-volume-slider {
            width: 80px;
  height: 4px;
  background: #ddd;
  border-radius: 2px;
  outline: none;
  -webkit-appearance: none;
}

.demo-volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  background: #007bff;
  border-radius: 50%;
  cursor: pointer;
}

/* Responsive design */
@media (max-width: 768px) {
  .demo-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .url-section {
    flex-direction: column;
  }

  .demo-controls {
    flex-wrap: wrap;
            gap: 10px;
  }

  .demo-progress-container {
    order: 3;
    width: 100%;
    margin: 10px 0;
  }

  .demo-time {
    order: 4;
    width: 100%;
    text-align: center;
  }
        }
    </style>

## Features Demonstrated

This interactive basic player example showcases XiaoMei's core capabilities:

### 🎬 **Core Features**
- **Canvas-based Rendering**: Hardware-accelerated video playback using HTML5 Canvas
- **Multiple Source Support**: Load videos from URLs, files, or direct input
- **Responsive Controls**: Clean, mobile-friendly user interface
- **Real-time Progress**: Visual progress bar with smooth seeking
- **Buffer Display**: Shows download progress and buffering status

### 🎵 **Audio Controls**
- **Volume Control**: Precise volume adjustment with visual feedback
- **Mute Toggle**: Quick audio on/off with visual indicators
- **Audio State Management**: Proper handling of volume and mute states

### ⌨️ **Keyboard Shortcuts**
- **Space**: Play/Pause toggle
- **Left/Right Arrows**: Seek backward/forward by 10 seconds
- **Up/Down Arrows**: Increase/decrease volume
- **M**: Toggle mute

### 📱 **User Experience**
- **Loading States**: Visual feedback during video loading
- **Error Handling**: Clear error messages with user-friendly descriptions
- **Responsive Design**: Adapts to different screen sizes
- **Accessibility**: Proper focus management and keyboard navigation

### 🔧 **Developer Experience**
- **Event-driven Architecture**: Comprehensive event system for all player states
- **TypeScript Support**: Full type safety for better development experience
- **Clean API**: Simple, intuitive methods for common operations
- **Error Recovery**: Graceful handling of network and codec issues

## Key Implementation Points

### **Player Initialization**
```typescript
const player = new XiaoMei({
  renderTarget: canvas,
  volume: 0.8,
  autoplay: false
});
```

### **Event Handling**
```typescript
player.on('timeupdate', (currentTime) => {
  updateProgressBar(currentTime);
  updateTimeDisplay(currentTime);
});

player.on('error', (error) => {
  showErrorMessage(error.message);
});
```

### **Media Loading**
```typescript
// Load from URL
await player.load('https://example.com/video.mp4');

// Load from file
await player.load(fileInput.files[0]);
```

### **Playback Control**
```typescript
// Play/pause
await player.play();
player.pause();

// Seeking
await player.seek(30.5);

// Volume control
player.volume = 0.7;
player.muted = true;
```

## Browser Compatibility

This basic player works in all modern browsers that support:
- HTML5 Canvas
- Web Audio API
- Media Source Extensions (for advanced formats)
- ES6+ JavaScript features

## Performance Notes

- **Canvas Rendering**: More efficient than HTML5 video for custom UI overlays
- **Hardware Acceleration**: Leverages GPU for smooth playback
- **Memory Management**: Automatic cleanup of resources
- **Buffer Optimization**: Smart buffering strategy for smooth playback

This example provides a solid foundation that can be extended with additional features like quality selection, fullscreen support, subtitles, and more advanced controls.

