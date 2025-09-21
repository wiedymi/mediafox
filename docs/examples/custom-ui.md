# Custom UI Example

This example demonstrates how to build completely custom video player interfaces using XiaoMei, showcasing different UI styles and interaction patterns.

## Modern Glass UI Player

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Custom UI - Glass Design</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .glass-player {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(20px);
            border-radius: 24px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            max-width: 900px;
            width: 100%;
        }

        .video-section {
            position: relative;
            background: black;
        }

        .video-canvas {
            width: 100%;
            height: auto;
            display: block;
            border-radius: 20px 20px 0 0;
        }

        .video-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0, 0, 0, 0.3);
            opacity: 0;
            transition: opacity 0.3s ease;
            cursor: pointer;
        }

        .video-overlay.visible {
            opacity: 1;
        }

        .play-button {
            width: 80px;
            height: 80px;
            background: rgba(255, 255, 255, 0.9);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            border: none;
            cursor: pointer;
            transform: scale(1);
            transition: transform 0.2s ease;
        }

        .play-button:hover {
            transform: scale(1.1);
        }

        .play-icon {
            width: 30px;
            height: 30px;
            margin-left: 4px;
        }

        .controls-section {
            padding: 24px;
            background: rgba(255, 255, 255, 0.05);
        }

        .progress-container {
            margin-bottom: 20px;
        }

        .progress-track {
            height: 6px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 3px;
            position: relative;
            cursor: pointer;
            overflow: hidden;
        }

        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #ff6b6b, #4ecdc4);
            border-radius: 3px;
            width: 0%;
            transition: width 0.1s ease;
            position: relative;
        }

        .progress-fill::after {
            content: '';
            position: absolute;
            right: -6px;
            top: 50%;
            transform: translateY(-50%);
            width: 12px;
            height: 12px;
            background: white;
            border-radius: 50%;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        .control-row {
            display: flex;
            align-items: center;
            gap: 16px;
        }

        .control-group {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .icon-button {
            width: 44px;
            height: 44px;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s ease;
            color: white;
        }

        .icon-button:hover {
            background: rgba(255, 255, 255, 0.2);
            transform: translateY(-1px);
        }

        .icon-button.active {
            background: rgba(255, 255, 255, 0.3);
        }

        .time-display {
            color: white;
            font-size: 14px;
            font-weight: 500;
            min-width: 100px;
            text-align: center;
            font-variant-numeric: tabular-nums;
        }

        .volume-control {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .volume-slider {
            width: 80px;
            height: 4px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 2px;
            outline: none;
            cursor: pointer;
            -webkit-appearance: none;
        }

        .volume-slider::-webkit-slider-thumb {
            appearance: none;
            width: 16px;
            height: 16px;
            background: white;
            border-radius: 50%;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        .spacer {
            flex: 1;
        }

        .loading-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            gap: 16px;
            color: white;
        }

        .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-top: 3px solid white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .file-drop-zone {
            margin-top: 20px;
            padding: 40px;
            border: 2px dashed rgba(255, 255, 255, 0.3);
            border-radius: 16px;
            text-align: center;
            color: white;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .file-drop-zone:hover,
        .file-drop-zone.dragover {
            border-color: rgba(255, 255, 255, 0.6);
            background: rgba(255, 255, 255, 0.05);
        }

        .hidden {
            display: none !important;
        }
    </style>
</head>
<body>
    <div class="glass-player">
        <div class="video-section">
            <canvas id="video-canvas" class="video-canvas"></canvas>

            <div id="video-overlay" class="video-overlay">
                <button id="center-play" class="play-button">
                    <svg class="play-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z"/>
                    </svg>
                </button>
            </div>

            <div id="loading-overlay" class="loading-overlay hidden">
                <div class="spinner"></div>
                <div>Loading video...</div>
            </div>
        </div>

        <div class="controls-section">
            <div class="progress-container">
                <div id="progress-track" class="progress-track">
                    <div id="progress-fill" class="progress-fill"></div>
                </div>
            </div>

            <div class="control-row">
                <div class="control-group">
                    <button id="play-pause" class="icon-button">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                    </button>

                    <button id="skip-back" class="icon-button">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z"/>
                        </svg>
                    </button>

                    <button id="skip-forward" class="icon-button">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/>
                        </svg>
                    </button>
                </div>

                <div class="time-display" id="time-display">0:00 / 0:00</div>

                <div class="spacer"></div>

                <div class="volume-control">
                    <button id="volume-btn" class="icon-button">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
                        </svg>
                    </button>
                    <input type="range" id="volume-slider" class="volume-slider" min="0" max="1" step="0.1" value="1">
                </div>

                <button id="fullscreen-btn" class="icon-button">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                    </svg>
                </button>
            </div>
        </div>

        <div id="file-drop-zone" class="file-drop-zone">
            <div>Drop a video file here or click to browse</div>
            <input type="file" id="file-input" accept="video/*" style="display: none;">
        </div>
    </div>

    <script type="module" src="./glass-ui.js"></script>
</body>
</html>
```

## Minimal Touch-Optimized UI

```html
<!-- minimal-ui.html -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Minimal Touch UI</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background: #000;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            touch-action: manipulation;
            user-select: none;
        }

        .minimal-player {
            position: relative;
            width: 100vw;
            height: 100vh;
            overflow: hidden;
        }

        .video-canvas {
            width: 100%;
            height: 100%;
            object-fit: contain;
            background: #000;
        }

        .touch-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            display: grid;
            grid-template-columns: 1fr 2fr 1fr;
            grid-template-rows: 1fr 1fr 1fr;
            z-index: 10;
        }

        .touch-zone {
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: background-color 0.1s ease;
        }

        .touch-zone:active {
            background: rgba(255, 255, 255, 0.1);
        }

        .center-zone {
            grid-column: 2;
            grid-row: 2;
        }

        .left-zone {
            grid-column: 1;
            grid-row: 2;
        }

        .right-zone {
            grid-column: 3;
            grid-row: 2;
        }

        .play-indicator {
            width: 60px;
            height: 60px;
            background: rgba(255, 255, 255, 0.9);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transform: scale(0.8);
            transition: all 0.2s ease;
            pointer-events: none;
        }

        .play-indicator.show {
            opacity: 1;
            transform: scale(1);
        }

        .seek-indicator {
            color: white;
            font-size: 24px;
            font-weight: bold;
            opacity: 0;
            transform: scale(0.8);
            transition: all 0.2s ease;
            text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
        }

        .seek-indicator.show {
            opacity: 1;
            transform: scale(1);
        }

        .controls-bar {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
            padding: 20px;
            transform: translateY(100%);
            transition: transform 0.3s ease;
        }

        .controls-bar.visible {
            transform: translateY(0);
        }

        .progress-bar {
            height: 4px;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 2px;
            margin-bottom: 15px;
            position: relative;
        }

        .progress-fill {
            height: 100%;
            background: #fff;
            border-radius: 2px;
            width: 0%;
            transition: width 0.1s ease;
        }

        .time-info {
            color: white;
            font-size: 14px;
            text-align: center;
            font-variant-numeric: tabular-nums;
        }

        .gesture-hint {
            position: absolute;
            top: 20px;
            left: 20px;
            color: white;
            font-size: 12px;
            background: rgba(0, 0, 0, 0.5);
            padding: 8px 12px;
            border-radius: 16px;
            opacity: 0;
            transition: opacity 0.3s ease;
        }

        .gesture-hint.visible {
            opacity: 1;
        }
    </style>
</head>
<body>
    <div class="minimal-player">
        <canvas id="video-canvas" class="video-canvas"></canvas>

        <div class="touch-overlay">
            <div class="touch-zone left-zone" data-action="seek-back">
                <div class="seek-indicator" id="seek-back-indicator">-10s</div>
            </div>

            <div class="touch-zone center-zone" data-action="play-pause">
                <div class="play-indicator" id="play-indicator">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z"/>
                    </svg>
                </div>
            </div>

            <div class="touch-zone right-zone" data-action="seek-forward">
                <div class="seek-indicator" id="seek-forward-indicator">+10s</div>
            </div>
        </div>

        <div class="controls-bar" id="controls-bar">
            <div class="progress-bar" id="progress-bar">
                <div class="progress-fill" id="progress-fill"></div>
            </div>
            <div class="time-info" id="time-info">0:00 / 0:00</div>
        </div>

        <div class="gesture-hint" id="gesture-hint">
            Tap center to play/pause • Tap sides to seek
        </div>

        <input type="file" id="file-input" accept="video/*" style="display: none;">
    </div>

    <script type="module" src="./minimal-touch.js"></script>
</body>
</html>
```

## Retro Terminal UI

```html
<!-- terminal-ui.html -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Terminal UI Player</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500&display=swap');

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            padding: 20px;
            background: #0d1117;
            color: #58a6ff;
            font-family: 'JetBrains Mono', monospace;
            font-size: 14px;
            line-height: 1.4;
        }

        .terminal-player {
            max-width: 1200px;
            margin: 0 auto;
            background: #161b22;
            border: 1px solid #30363d;
            border-radius: 8px;
            overflow: hidden;
        }

        .terminal-header {
            background: #21262d;
            padding: 12px 16px;
            border-bottom: 1px solid #30363d;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .terminal-dots {
            display: flex;
            gap: 6px;
        }

        .dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
        }

        .dot.red { background: #ff5f56; }
        .dot.yellow { background: #ffbd2e; }
        .dot.green { background: #27ca3f; }

        .terminal-title {
            margin-left: 12px;
            color: #f0f6fc;
            font-weight: 500;
        }

        .terminal-content {
            display: grid;
            grid-template-columns: 1fr 300px;
            gap: 1px;
            background: #30363d;
        }

        .video-section {
            background: #0d1117;
            padding: 20px;
            position: relative;
        }

        .video-canvas {
            width: 100%;
            height: auto;
            border: 1px solid #30363d;
            border-radius: 4px;
            background: #000;
        }

        .console-section {
            background: #161b22;
            padding: 20px;
            font-size: 12px;
            overflow-y: auto;
            max-height: 500px;
        }

        .console-line {
            margin-bottom: 4px;
            color: #7d8590;
        }

        .console-line.command {
            color: #58a6ff;
        }

        .console-line.output {
            color: #7ee787;
        }

        .console-line.error {
            color: #f85149;
        }

        .console-prompt {
            color: #58a6ff;
        }

        .console-input {
            display: flex;
            align-items: center;
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid #30363d;
        }

        .console-input input {
            background: transparent;
            border: none;
            color: #f0f6fc;
            font-family: inherit;
            font-size: inherit;
            flex: 1;
            outline: none;
            margin-left: 8px;
        }

        .controls-terminal {
            background: #161b22;
            border-top: 1px solid #30363d;
            padding: 16px 20px;
        }

        .command-line {
            display: flex;
            align-items: center;
            gap: 16px;
            margin-bottom: 12px;
        }

        .btn-terminal {
            background: #21262d;
            border: 1px solid #30363d;
            color: #58a6ff;
            padding: 6px 12px;
            border-radius: 4px;
            font-family: inherit;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .btn-terminal:hover {
            background: #30363d;
            border-color: #58a6ff;
        }

        .btn-terminal.active {
            background: #58a6ff;
            color: #0d1117;
        }

        .progress-terminal {
            display: flex;
            align-items: center;
            gap: 12px;
            color: #7d8590;
            font-size: 11px;
        }

        .progress-bar-terminal {
            flex: 1;
            height: 6px;
            background: #21262d;
            border-radius: 3px;
            overflow: hidden;
        }

        .progress-fill-terminal {
            height: 100%;
            background: #58a6ff;
            width: 0%;
            transition: width 0.1s ease;
        }

        .ascii-art {
            color: #30363d;
            font-size: 10px;
            line-height: 1;
            margin-bottom: 16px;
            white-space: pre;
        }

        .blinking-cursor::after {
            content: '█';
            animation: blink 1s infinite;
        }

        @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
        }
    </style>
</head>
<body>
    <div class="terminal-player">
        <div class="terminal-header">
            <div class="terminal-dots">
                <div class="dot red"></div>
                <div class="dot yellow"></div>
                <div class="dot green"></div>
            </div>
            <div class="terminal-title">xiaomei-player v1.0.0</div>
        </div>

        <div class="terminal-content">
            <div class="video-section">
                <div class="ascii-art">
╔══════════════════════════════════════════════════════════════╗
║                        XIAOMEI PLAYER                        ║
║                      Terminal Interface                      ║
╚══════════════════════════════════════════════════════════════╝
                </div>
                <canvas id="video-canvas" class="video-canvas"></canvas>
            </div>

            <div class="console-section" id="console">
                <div class="console-line">XiaoMei Player Terminal v1.0.0</div>
                <div class="console-line">Copyright (c) 2024</div>
                <div class="console-line">Type 'help' for commands</div>
                <div class="console-line">&nbsp;</div>
                <div class="console-line command">$ player init</div>
                <div class="console-line output">✓ Player initialized successfully</div>
                <div class="console-line output">✓ Canvas context acquired</div>
                <div class="console-line output">✓ WebCodecs API available</div>
                <div class="console-line">&nbsp;</div>

                <div class="console-input">
                    <span class="console-prompt">$</span>
                    <input type="text" id="terminal-input" placeholder="Enter command..." autocomplete="off">
                </div>
            </div>
        </div>

        <div class="controls-terminal">
            <div class="command-line">
                <button id="play-btn" class="btn-terminal">play</button>
                <button id="pause-btn" class="btn-terminal">pause</button>
                <button id="stop-btn" class="btn-terminal">stop</button>
                <button id="load-btn" class="btn-terminal">load</button>
                <span style="color: #7d8590;">|</span>
                <button id="info-btn" class="btn-terminal">info</button>
                <button id="stats-btn" class="btn-terminal">stats</button>
            </div>

            <div class="progress-terminal">
                <span id="time-current">00:00</span>
                <div class="progress-bar-terminal">
                    <div id="progress-fill" class="progress-fill-terminal"></div>
                </div>
                <span id="time-total">00:00</span>
                <span style="margin-left: 16px;">vol: <span id="volume-display">100</span>%</span>
            </div>
        </div>
    </div>

    <input type="file" id="file-input" accept="video/*" style="display: none;">

    <script type="module" src="./terminal-ui.js"></script>
</body>
</html>
```

## JavaScript for Glass UI

```javascript
// glass-ui.js
import { XiaoMei } from 'xiaomei';

class GlassUIPlayer {
    constructor() {
        this.player = null;
        this.isDragging = false;
        this.overlayVisible = false;

        this.initializeElements();
        this.setupEventListeners();
        this.initializePlayer();
    }

    initializeElements() {
        this.canvas = document.getElementById('video-canvas');
        this.videoOverlay = document.getElementById('video-overlay');
        this.loadingOverlay = document.getElementById('loading-overlay');
        this.centerPlay = document.getElementById('center-play');

        this.playPause = document.getElementById('play-pause');
        this.skipBack = document.getElementById('skip-back');
        this.skipForward = document.getElementById('skip-forward');
        this.timeDisplay = document.getElementById('time-display');
        this.volumeBtn = document.getElementById('volume-btn');
        this.volumeSlider = document.getElementById('volume-slider');
        this.fullscreenBtn = document.getElementById('fullscreen-btn');

        this.progressTrack = document.getElementById('progress-track');
        this.progressFill = document.getElementById('progress-fill');

        this.fileDropZone = document.getElementById('file-drop-zone');
        this.fileInput = document.getElementById('file-input');
    }

    async initializePlayer() {
        try {
            this.player = new XiaoMei({
                canvas: this.canvas
            });

            this.setupPlayerEvents();
            this.showOverlay();

            console.log('Glass UI Player initialized');
        } catch (error) {
            console.error('Failed to initialize player:', error);
        }
    }

    setupPlayerEvents() {
        this.player.on('play', () => {
            this.updatePlayButton(true);
            this.hideOverlay();
        });

        this.player.on('pause', () => {
            this.updatePlayButton(false);
            this.showOverlay();
        });

        this.player.on('timeupdate', (currentTime) => {
            this.updateProgress(currentTime);
            this.updateTimeDisplay(currentTime);
        });

        this.player.on('loadstart', () => {
            this.showLoading();
        });

        this.player.on('loadeddata', () => {
            this.hideLoading();
            this.hideFileDropZone();
        });

        this.player.on('ended', () => {
            this.showOverlay();
        });

        this.player.on('error', (error) => {
            this.hideLoading();
            console.error('Player error:', error);
        });
    }

    setupEventListeners() {
        // Play/pause controls
        this.centerPlay.addEventListener('click', () => this.togglePlayback());
        this.playPause.addEventListener('click', () => this.togglePlayback());
        this.videoOverlay.addEventListener('click', (e) => {
            if (e.target === this.videoOverlay) {
                this.togglePlayback();
            }
        });

        // Skip controls
        this.skipBack.addEventListener('click', () => this.skipBack10());
        this.skipForward.addEventListener('click', () => this.skipForward10());

        // Volume controls
        this.volumeBtn.addEventListener('click', () => this.toggleMute());
        this.volumeSlider.addEventListener('input', (e) => {
            this.setVolume(parseFloat(e.target.value));
        });

        // Progress bar
        this.progressTrack.addEventListener('click', (e) => this.handleProgressClick(e));

        // Fullscreen
        this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());

        // File handling
        this.fileDropZone.addEventListener('click', () => this.fileInput.click());
        this.fileDropZone.addEventListener('dragover', this.handleDragOver.bind(this));
        this.fileDropZone.addEventListener('drop', this.handleDrop.bind(this));
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));

        // Mouse movement for overlay
        this.canvas.addEventListener('mousemove', () => {
            if (this.player && this.player.playing) {
                this.showOverlayTemporarily();
            }
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
        }
    }

    async skipBack10() {
        if (!this.player) return;
        await this.player.seek(Math.max(0, this.player.currentTime - 10));
    }

    async skipForward10() {
        if (!this.player) return;
        await this.player.seek(Math.min(this.player.duration, this.player.currentTime + 10));
    }

    toggleMute() {
        if (!this.player) return;
        this.player.muted = !this.player.muted;
    }

    setVolume(volume) {
        if (!this.player) return;
        this.player.volume = volume;
    }

    async toggleFullscreen() {
        try {
            if (document.fullscreenElement) {
                await document.exitFullscreen();
            } else {
                await document.documentElement.requestFullscreen();
            }
        } catch (error) {
            console.error('Fullscreen error:', error);
        }
    }

    updatePlayButton(playing) {
        const icon = this.playPause.querySelector('svg path');
        const centerIcon = this.centerPlay.querySelector('svg path');

        if (playing) {
            // Pause icon
            icon.setAttribute('d', 'M6 19h4V5H6v14zm8-14v14h4V5h-4z');
            centerIcon.setAttribute('d', 'M6 19h4V5H6v14zm8-14v14h4V5h-4z');
        } else {
            // Play icon
            icon.setAttribute('d', 'M8 5v14l11-7z');
            centerIcon.setAttribute('d', 'M8 5v14l11-7z');
        }
    }

    updateProgress(currentTime) {
        if (!this.player || this.player.duration === 0) return;

        const percentage = (currentTime / this.player.duration) * 100;
        this.progressFill.style.width = `${percentage}%`;
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

    handleProgressClick(e) {
        if (!this.player) return;

        const rect = this.progressTrack.getBoundingClientRect();
        const percentage = (e.clientX - rect.left) / rect.width;
        const time = percentage * this.player.duration;

        this.player.seek(time);
    }

    showOverlay() {
        this.videoOverlay.classList.add('visible');
        this.overlayVisible = true;
    }

    hideOverlay() {
        this.videoOverlay.classList.remove('visible');
        this.overlayVisible = false;
    }

    showOverlayTemporarily() {
        if (!this.overlayVisible) {
            this.showOverlay();
            setTimeout(() => {
                if (this.player && this.player.playing) {
                    this.hideOverlay();
                }
            }, 3000);
        }
    }

    showLoading() {
        this.loadingOverlay.classList.remove('hidden');
    }

    hideLoading() {
        this.loadingOverlay.classList.add('hidden');
    }

    hideFileDropZone() {
        this.fileDropZone.style.display = 'none';
    }

    handleDragOver(e) {
        e.preventDefault();
        this.fileDropZone.classList.add('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        this.fileDropZone.classList.remove('dragover');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.loadFile(files[0]);
        }
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.loadFile(file);
        }
    }

    async loadFile(file) {
        if (!this.player) return;

        try {
            await this.player.load(file);
        } catch (error) {
            console.error('Error loading file:', error);
        }
    }

    handleKeyboard(e) {
        if (!this.player) return;

        switch (e.code) {
            case 'Space':
                e.preventDefault();
                this.togglePlayback();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                this.skipBack10();
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.skipForward10();
                break;
            case 'KeyM':
                e.preventDefault();
                this.toggleMute();
                break;
            case 'KeyF':
                e.preventDefault();
                this.toggleFullscreen();
                break;
        }
    }

    destroy() {
        if (this.player) {
            this.player.destroy();
        }
    }
}

// Initialize the glass UI player
const player = new GlassUIPlayer();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    player.destroy();
});

export default GlassUIPlayer;
```

## Key Custom UI Features

### Glass UI Player
- **Modern glassmorphism design** with backdrop blur effects
- **Elegant animations** and hover states
- **Drag and drop** file support
- **Smooth progress bar** with gradient styling
- **Auto-hiding overlay** during playback

### Minimal Touch UI
- **Touch-optimized controls** for mobile devices
- **Gesture-based interaction** (tap zones for play/seek)
- **Full-screen layout** optimized for mobile viewing
- **Visual feedback** for touch interactions
- **Simplified controls** that auto-hide

### Terminal UI
- **Retro terminal aesthetic** with monospace fonts
- **Command-line interface** for advanced users
- **ASCII art decorations** and terminal styling
- **Real-time console logging** of player events
- **Command-based control** system

## Design Patterns Demonstrated

1. **Component-based Architecture**: Modular UI components
2. **Responsive Design**: Adaptive layouts for different screen sizes
3. **Accessibility**: Keyboard navigation and screen reader support
4. **Progressive Enhancement**: Graceful degradation of features
5. **Performance Optimization**: Efficient DOM manipulation
6. **Custom Styling**: Complete visual customization
7. **Interaction Design**: Intuitive user experience patterns

These examples show how XiaoMei's headless architecture enables unlimited creativity in building custom video player interfaces while maintaining consistent functionality and performance.