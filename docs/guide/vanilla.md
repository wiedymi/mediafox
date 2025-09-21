# Vanilla JavaScript Guide

This guide demonstrates how to use XiaoMei with vanilla JavaScript/TypeScript without any framework dependencies.

## Basic Setup

XiaoMei works perfectly with vanilla JavaScript. Here's a simple setup:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>XiaoMei Vanilla Player</title>
    <style>
        .player-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }

        canvas {
            width: 100%;
            height: auto;
            background: black;
            border-radius: 8px;
        }

        .controls {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-top: 10px;
            padding: 15px;
            background: #f5f5f5;
            border-radius: 8px;
        }

        .seek-bar {
            flex: 1;
            height: 6px;
        }

        button {
            padding: 8px 16px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }

        button:hover {
            background: #0056b3;
        }

        button:disabled {
            background: #ccc;
            cursor: not-allowed;
        }
    </style>
</head>
<body>
    <div class="player-container">
        <h1>XiaoMei Video Player</h1>
        <canvas id="video-canvas"></canvas>

        <div class="controls">
            <button id="play-btn">Play</button>
            <input type="range" id="seek-bar" class="seek-bar" min="0" max="100" value="0">
            <span id="time-display">0:00 / 0:00</span>
            <input type="range" id="volume-bar" min="0" max="1" step="0.1" value="1">
            <button id="mute-btn">Mute</button>
            <button id="fullscreen-btn">Fullscreen</button>
        </div>

        <div class="file-input">
            <input type="file" id="file-input" accept="video/*">
            <button id="load-url-btn">Load URL</button>
            <input type="url" id="url-input" placeholder="Enter video URL">
        </div>
    </div>

    <script type="module" src="./player.js"></script>
</body>
</html>
```

## JavaScript Implementation

```javascript
// player.js
import { XiaoMei } from '@vivysub/xiaomei';

class VanillaVideoPlayer {
    constructor() {
        this.player = null;
        this.initializeElements();
        this.setupEventListeners();
    }

    initializeElements() {
        this.canvas = document.getElementById('video-canvas');
        this.playBtn = document.getElementById('play-btn');
        this.seekBar = document.getElementById('seek-bar');
        this.timeDisplay = document.getElementById('time-display');
        this.volumeBar = document.getElementById('volume-bar');
        this.muteBtn = document.getElementById('mute-btn');
        this.fullscreenBtn = document.getElementById('fullscreen-btn');
        this.fileInput = document.getElementById('file-input');
        this.loadUrlBtn = document.getElementById('load-url-btn');
        this.urlInput = document.getElementById('url-input');
    }

    async initializePlayer() {
        if (this.player) {
            this.player.destroy();
        }

        this.player = new XiaoMei({
            canvas: this.canvas
        });

        // Subscribe to state changes
        this.player.store.subscribe(this.handleStateChange.bind(this));

        // Setup player event listeners
        this.setupPlayerEvents();
    }

    setupEventListeners() {
        this.playBtn.addEventListener('click', this.togglePlay.bind(this));
        this.seekBar.addEventListener('input', this.handleSeek.bind(this));
        this.volumeBar.addEventListener('input', this.handleVolumeChange.bind(this));
        this.muteBtn.addEventListener('click', this.toggleMute.bind(this));
        this.fullscreenBtn.addEventListener('click', this.toggleFullscreen.bind(this));
        this.fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        this.loadUrlBtn.addEventListener('click', this.loadUrl.bind(this));

        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyboard.bind(this));

        // Initialize player when DOM is ready
        this.initializePlayer();
    }

    setupPlayerEvents() {
        if (!this.player) return;

        this.player.on('play', () => {
            console.log('Playback started');
        });

        this.player.on('pause', () => {
            console.log('Playback paused');
        });

        this.player.on('ended', () => {
            console.log('Playback ended');
            this.playBtn.textContent = 'Replay';
        });

        this.player.on('error', (error) => {
            console.error('Player error:', error);
            alert(`Error: ${error.message}`);
        });

        this.player.on('loadstart', () => {
            console.log('Loading started');
            this.playBtn.disabled = true;
        });

        this.player.on('loadeddata', () => {
            console.log('Data loaded');
            this.playBtn.disabled = false;
        });

        this.player.on('seeking', () => {
            console.log('Seeking...');
        });

        this.player.on('seeked', () => {
            console.log('Seek completed');
        });
    }

    handleStateChange(state) {
        if (!state) return;

        // Update play button
        this.playBtn.textContent = state.playing ? 'Pause' : 'Play';

        // Update seek bar
        if (state.duration > 0) {
            const progress = (state.currentTime / state.duration) * 100;
            this.seekBar.value = progress;
        }

        // Update time display
        this.timeDisplay.textContent = this.formatTime(state.currentTime, state.duration);

        // Update volume controls
        this.volumeBar.value = state.volume;
        this.muteBtn.textContent = state.muted ? 'Unmute' : 'Mute';
    }

    formatTime(current, total) {
        const currentMins = Math.floor(current / 60);
        const currentSecs = Math.floor(current % 60);
        const totalMins = Math.floor(total / 60);
        const totalSecs = Math.floor(total % 60);

        const currentStr = `${currentMins}:${currentSecs.toString().padStart(2, '0')}`;
        const totalStr = `${totalMins}:${totalSecs.toString().padStart(2, '0')}`;

        return `${currentStr} / ${totalStr}`;
    }

    async togglePlay() {
        if (!this.player) return;

        try {
            if (this.player.playing) {
                await this.player.pause();
            } else {
                await this.player.play();
            }
        } catch (error) {
            console.error('Error toggling play:', error);
        }
    }

    handleSeek(event) {
        if (!this.player || this.player.duration === 0) return;

        const percentage = parseFloat(event.target.value);
        const time = (percentage / 100) * this.player.duration;
        this.player.seek(time);
    }

    handleVolumeChange(event) {
        if (!this.player) return;

        const volume = parseFloat(event.target.value);
        this.player.volume = volume;
    }

    toggleMute() {
        if (!this.player) return;

        this.player.muted = !this.player.muted;
    }

    async toggleFullscreen() {
        if (!document.fullscreenElement) {
            try {
                await this.canvas.requestFullscreen();
                this.fullscreenBtn.textContent = 'Exit Fullscreen';
            } catch (error) {
                console.error('Error entering fullscreen:', error);
            }
        } else {
            try {
                await document.exitFullscreen();
                this.fullscreenBtn.textContent = 'Fullscreen';
            } catch (error) {
                console.error('Error exiting fullscreen:', error);
            }
        }
    }

    async handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            await this.player.load(file);
        } catch (error) {
            console.error('Error loading file:', error);
            alert(`Error loading file: ${error.message}`);
        }
    }

    async loadUrl() {
        const url = this.urlInput.value.trim();
        if (!url) return;

        try {
            await this.player.load(url);
        } catch (error) {
            console.error('Error loading URL:', error);
            alert(`Error loading URL: ${error.message}`);
        }
    }

    handleKeyboard(event) {
        if (!this.player) return;

        // Ignore if user is typing in an input
        if (event.target.tagName === 'INPUT') return;

        switch (event.code) {
            case 'Space':
                event.preventDefault();
                this.togglePlay();
                break;
            case 'ArrowLeft':
                event.preventDefault();
                this.player.seek(Math.max(0, this.player.currentTime - 10));
                break;
            case 'ArrowRight':
                event.preventDefault();
                this.player.seek(Math.min(this.player.duration, this.player.currentTime + 10));
                break;
            case 'ArrowUp':
                event.preventDefault();
                this.player.volume = Math.min(1, this.player.volume + 0.1);
                break;
            case 'ArrowDown':
                event.preventDefault();
                this.player.volume = Math.max(0, this.player.volume - 0.1);
                break;
            case 'KeyM':
                event.preventDefault();
                this.toggleMute();
                break;
            case 'KeyF':
                event.preventDefault();
                this.toggleFullscreen();
                break;
        }
    }

    destroy() {
        if (this.player) {
            this.player.destroy();
            this.player = null;
        }
    }
}

// Initialize the player
const player = new VanillaVideoPlayer();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    player.destroy();
});
```

## TypeScript Implementation

For TypeScript projects, here's a more type-safe version:

```typescript
// player.ts
import { XiaoMei, type PlayerState, type PlayerEvents } from '@vivysub/xiaomei';

interface PlayerElements {
    canvas: HTMLCanvasElement;
    playBtn: HTMLButtonElement;
    seekBar: HTMLInputElement;
    timeDisplay: HTMLSpanElement;
    volumeBar: HTMLInputElement;
    muteBtn: HTMLButtonElement;
    fullscreenBtn: HTMLButtonElement;
    fileInput: HTMLInputElement;
    loadUrlBtn: HTMLButtonElement;
    urlInput: HTMLInputElement;
}

class TypedVideoPlayer {
    private player: XiaoMei | null = null;
    private elements: PlayerElements;

    constructor() {
        this.elements = this.initializeElements();
        this.setupEventListeners();
        this.initializePlayer();
    }

    private initializeElements(): PlayerElements {
        const getElement = <T extends HTMLElement>(id: string): T => {
            const element = document.getElementById(id) as T;
            if (!element) {
                throw new Error(`Element with id "${id}" not found`);
            }
            return element;
        };

        return {
            canvas: getElement<HTMLCanvasElement>('video-canvas'),
            playBtn: getElement<HTMLButtonElement>('play-btn'),
            seekBar: getElement<HTMLInputElement>('seek-bar'),
            timeDisplay: getElement<HTMLSpanElement>('time-display'),
            volumeBar: getElement<HTMLInputElement>('volume-bar'),
            muteBtn: getElement<HTMLButtonElement>('mute-btn'),
            fullscreenBtn: getElement<HTMLButtonElement>('fullscreen-btn'),
            fileInput: getElement<HTMLInputElement>('file-input'),
            loadUrlBtn: getElement<HTMLButtonElement>('load-url-btn'),
            urlInput: getElement<HTMLInputElement>('url-input')
        };
    }

    private async initializePlayer(): Promise<void> {
        if (this.player) {
            this.player.destroy();
        }

        this.player = new XiaoMei({
            canvas: this.elements.canvas
        });

        this.player.store.subscribe(this.handleStateChange.bind(this));
        this.setupPlayerEvents();
    }

    private setupEventListeners(): void {
        this.elements.playBtn.addEventListener('click', this.togglePlay.bind(this));
        this.elements.seekBar.addEventListener('input', this.handleSeek.bind(this));
        this.elements.volumeBar.addEventListener('input', this.handleVolumeChange.bind(this));
        this.elements.muteBtn.addEventListener('click', this.toggleMute.bind(this));
        this.elements.fullscreenBtn.addEventListener('click', this.toggleFullscreen.bind(this));
        this.elements.fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        this.elements.loadUrlBtn.addEventListener('click', this.loadUrl.bind(this));

        document.addEventListener('keydown', this.handleKeyboard.bind(this));
    }

    private setupPlayerEvents(): void {
        if (!this.player) return;

        const eventHandlers: Partial<Record<keyof PlayerEvents, Function>> = {
            play: () => console.log('Playback started'),
            pause: () => console.log('Playback paused'),
            ended: () => {
                console.log('Playback ended');
                this.elements.playBtn.textContent = 'Replay';
            },
            error: (error: Error) => {
                console.error('Player error:', error);
                this.showError(`Error: ${error.message}`);
            },
            loadstart: () => {
                console.log('Loading started');
                this.elements.playBtn.disabled = true;
            },
            loadeddata: () => {
                console.log('Data loaded');
                this.elements.playBtn.disabled = false;
            }
        };

        Object.entries(eventHandlers).forEach(([event, handler]) => {
            this.player!.on(event as keyof PlayerEvents, handler);
        });
    }

    private handleStateChange(state: PlayerState): void {
        this.elements.playBtn.textContent = state.playing ? 'Pause' : 'Play';

        if (state.duration > 0) {
            const progress = (state.currentTime / state.duration) * 100;
            this.elements.seekBar.value = progress.toString();
        }

        this.elements.timeDisplay.textContent = this.formatTime(state.currentTime, state.duration);
        this.elements.volumeBar.value = state.volume.toString();
        this.elements.muteBtn.textContent = state.muted ? 'Unmute' : 'Mute';
    }

    private formatTime(current: number, total: number): string {
        const format = (time: number): string => {
            const mins = Math.floor(time / 60);
            const secs = Math.floor(time % 60);
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        };

        return `${format(current)} / ${format(total)}`;
    }

    private async togglePlay(): Promise<void> {
        if (!this.player) return;

        try {
            if (this.player.playing) {
                await this.player.pause();
            } else {
                await this.player.play();
            }
        } catch (error) {
            this.handleError('Error toggling play', error);
        }
    }

    private handleSeek(event: Event): void {
        if (!this.player || this.player.duration === 0) return;

        const target = event.target as HTMLInputElement;
        const percentage = parseFloat(target.value);
        const time = (percentage / 100) * this.player.duration;
        this.player.seek(time);
    }

    private handleVolumeChange(event: Event): void {
        if (!this.player) return;

        const target = event.target as HTMLInputElement;
        const volume = parseFloat(target.value);
        this.player.volume = volume;
    }

    private toggleMute(): void {
        if (!this.player) return;
        this.player.muted = !this.player.muted;
    }

    private async toggleFullscreen(): Promise<void> {
        try {
            if (!document.fullscreenElement) {
                await this.elements.canvas.requestFullscreen();
                this.elements.fullscreenBtn.textContent = 'Exit Fullscreen';
            } else {
                await document.exitFullscreen();
                this.elements.fullscreenBtn.textContent = 'Fullscreen';
            }
        } catch (error) {
            this.handleError('Fullscreen error', error);
        }
    }

    private async handleFileSelect(event: Event): Promise<void> {
        const target = event.target as HTMLInputElement;
        const file = target.files?.[0];
        if (!file) return;

        try {
            await this.player?.load(file);
        } catch (error) {
            this.handleError('Error loading file', error);
        }
    }

    private async loadUrl(): Promise<void> {
        const url = this.elements.urlInput.value.trim();
        if (!url) return;

        try {
            await this.player?.load(url);
        } catch (error) {
            this.handleError('Error loading URL', error);
        }
    }

    private handleKeyboard(event: KeyboardEvent): void {
        if (!this.player || event.target instanceof HTMLInputElement) return;

        const keyActions: Record<string, () => void> = {
            Space: () => {
                event.preventDefault();
                this.togglePlay();
            },
            ArrowLeft: () => {
                event.preventDefault();
                this.player!.seek(Math.max(0, this.player!.currentTime - 10));
            },
            ArrowRight: () => {
                event.preventDefault();
                this.player!.seek(Math.min(this.player!.duration, this.player!.currentTime + 10));
            },
            ArrowUp: () => {
                event.preventDefault();
                this.player!.volume = Math.min(1, this.player!.volume + 0.1);
            },
            ArrowDown: () => {
                event.preventDefault();
                this.player!.volume = Math.max(0, this.player!.volume - 0.1);
            },
            KeyM: () => {
                event.preventDefault();
                this.toggleMute();
            },
            KeyF: () => {
                event.preventDefault();
                this.toggleFullscreen();
            }
        };

        const action = keyActions[event.code];
        if (action) {
            action();
        }
    }

    private handleError(message: string, error: unknown): void {
        console.error(message, error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.showError(`${message}: ${errorMessage}`);
    }

    private showError(message: string): void {
        alert(message); // In production, use a better error display method
    }

    public destroy(): void {
        if (this.player) {
            this.player.destroy();
            this.player = null;
        }
    }
}

// Initialize the player
const player = new TypedVideoPlayer();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    player.destroy();
});
```

## Advanced Features

### Custom Controls

```javascript
class AdvancedControls {
    constructor(player) {
        this.player = player;
        this.createCustomControls();
    }

    createCustomControls() {
        const container = document.createElement('div');
        container.className = 'advanced-controls';

        // Playback speed control
        const speedControl = this.createSpeedControl();
        container.appendChild(speedControl);

        // Quality selector
        const qualityControl = this.createQualityControl();
        container.appendChild(qualityControl);

        // Track selector
        const trackControl = this.createTrackControl();
        container.appendChild(trackControl);

        document.body.appendChild(container);
    }

    createSpeedControl() {
        const container = document.createElement('div');
        container.innerHTML = `
            <label>Speed:</label>
            <select id="speed-select">
                <option value="0.5">0.5x</option>
                <option value="1" selected>1x</option>
                <option value="1.25">1.25x</option>
                <option value="1.5">1.5x</option>
                <option value="2">2x</option>
            </select>
        `;

        const select = container.querySelector('#speed-select');
        select.addEventListener('change', (e) => {
            this.player.playbackRate = parseFloat(e.target.value);
        });

        return container;
    }

    createQualityControl() {
        const container = document.createElement('div');
        container.innerHTML = `
            <label>Quality:</label>
            <select id="quality-select">
                <option value="auto">Auto</option>
            </select>
        `;

        // Populate with available qualities when tracks change
        this.player.on('tracksChanged', (tracks) => {
            const select = container.querySelector('#quality-select');
            select.innerHTML = '<option value="auto">Auto</option>';

            tracks.video.forEach((track, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = `${track.width}x${track.height}`;
                select.appendChild(option);
            });
        });

        return container;
    }

    createTrackControl() {
        const container = document.createElement('div');
        container.innerHTML = `
            <label>Audio Track:</label>
            <select id="audio-track-select">
                <option value="0">Default</option>
            </select>
        `;

        this.player.on('tracksChanged', (tracks) => {
            const select = container.querySelector('#audio-track-select');
            select.innerHTML = '';

            tracks.audio.forEach((track, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = track.language || `Track ${index + 1}`;
                select.appendChild(option);
            });
        });

        return container;
    }
}
```

### Progress Tracking

```javascript
class ProgressTracker {
    constructor(player) {
        this.player = player;
        this.watchedSegments = [];
        this.setupTracking();
    }

    setupTracking() {
        this.player.store.subscribe((state) => {
            this.trackProgress(state.currentTime, state.duration);
        });
    }

    trackProgress(currentTime, duration) {
        if (duration === 0) return;

        const percentage = (currentTime / duration) * 100;
        const segment = Math.floor(percentage / 5) * 5; // Track in 5% segments

        if (!this.watchedSegments.includes(segment)) {
            this.watchedSegments.push(segment);
            this.updateProgressDisplay();
        }
    }

    updateProgressDisplay() {
        const progress = (this.watchedSegments.length / 20) * 100; // 20 segments = 100%
        console.log(`Video ${progress.toFixed(1)}% watched`);

        // Update visual progress indicator
        const indicator = document.getElementById('progress-indicator');
        if (indicator) {
            indicator.style.width = `${progress}%`;
        }
    }

    getWatchedPercentage() {
        return (this.watchedSegments.length / 20) * 100;
    }
}
```

This guide provides a solid foundation for using XiaoMei in vanilla JavaScript environments, with examples ranging from basic setup to advanced features and TypeScript integration.
