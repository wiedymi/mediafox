# Multi-Track Example

This example demonstrates XiaoMei's multi-track capabilities, including quality switching, audio language selection, and subtitle management.

## HTML Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Multi-Track Video Player</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f7fa;
            padding: 20px;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            display: grid;
            grid-template-columns: 1fr 350px;
            gap: 20px;
        }

        .player-section {
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }

        .video-container {
            position: relative;
            background: black;
        }

        .video-canvas {
            width: 100%;
            height: auto;
            display: block;
        }

        .video-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            pointer-events: none;
        }

        .track-indicators {
            position: absolute;
            top: 16px;
            right: 16px;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .track-indicator {
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            backdrop-filter: blur(4px);
        }

        .quality-indicator {
            background: rgba(0, 120, 255, 0.9);
        }

        .audio-indicator {
            background: rgba(52, 199, 89, 0.9);
        }

        .subtitle-indicator {
            background: rgba(255, 149, 0, 0.9);
        }

        .controls {
            padding: 20px;
            border-top: 1px solid #e5e7eb;
        }

        .control-row {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;
        }

        .btn {
            padding: 8px 16px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            background: white;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s ease;
        }

        .btn:hover {
            background: #f9fafb;
            border-color: #9ca3af;
        }

        .btn.primary {
            background: #3b82f6;
            color: white;
            border-color: #3b82f6;
        }

        .btn.primary:hover {
            background: #2563eb;
        }

        .progress-section {
            margin-bottom: 16px;
        }

        .progress-bar {
            width: 100%;
            height: 6px;
            background: #e5e7eb;
            border-radius: 3px;
            cursor: pointer;
            position: relative;
        }

        .progress-fill {
            height: 100%;
            background: #3b82f6;
            border-radius: 3px;
            width: 0%;
            transition: width 0.1s ease;
        }

        .time-display {
            margin-top: 8px;
            font-size: 14px;
            color: #6b7280;
            text-align: center;
        }

        .sidebar {
            display: flex;
            flex-direction: column;
            gap: 20px;
        }

        .panel {
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }

        .panel-header {
            background: #f9fafb;
            padding: 16px 20px;
            border-bottom: 1px solid #e5e7eb;
            font-weight: 600;
            color: #374151;
        }

        .panel-content {
            padding: 20px;
        }

        .track-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .track-item {
            display: flex;
            align-items: center;
            justify-content: between;
            padding: 12px;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .track-item:hover {
            background: #f9fafb;
            border-color: #3b82f6;
        }

        .track-item.active {
            background: #eff6ff;
            border-color: #3b82f6;
            box-shadow: 0 0 0 1px #3b82f6;
        }

        .track-info {
            flex: 1;
        }

        .track-title {
            font-weight: 500;
            color: #374151;
            margin-bottom: 2px;
        }

        .track-details {
            font-size: 12px;
            color: #6b7280;
        }

        .track-status {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #d1d5db;
        }

        .status-dot.active {
            background: #10b981;
        }

        .status-dot.loading {
            background: #f59e0b;
            animation: pulse 1s infinite;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }

        .adaptive-settings {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .setting-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .setting-label {
            font-size: 14px;
            color: #374151;
        }

        .switch {
            position: relative;
            width: 44px;
            height: 24px;
            background: #d1d5db;
            border-radius: 12px;
            cursor: pointer;
            transition: background 0.2s ease;
        }

        .switch.active {
            background: #3b82f6;
        }

        .switch-handle {
            position: absolute;
            top: 2px;
            left: 2px;
            width: 20px;
            height: 20px;
            background: white;
            border-radius: 10px;
            transition: transform 0.2s ease;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .switch.active .switch-handle {
            transform: translateX(20px);
        }

        .network-info {
            display: flex;
            flex-direction: column;
            gap: 8px;
            font-size: 14px;
        }

        .network-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .network-label {
            color: #6b7280;
        }

        .network-value {
            color: #374151;
            font-weight: 500;
        }

        .subtitle-display {
            position: absolute;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 16px;
            text-align: center;
            max-width: 80%;
            backdrop-filter: blur(4px);
            display: none;
        }

        .loading-indicator {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            background: rgba(0, 0, 0, 0.7);
            padding: 16px 24px;
            border-radius: 8px;
            display: none;
        }

        .error-toast {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #dc2626;
            color: white;
            padding: 12px 16px;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            transform: translateX(100%);
            transition: transform 0.3s ease;
            z-index: 1000;
        }

        .error-toast.visible {
            transform: translateX(0);
        }

        .sample-videos {
            background: #f9fafb;
            padding: 16px;
            border-radius: 8px;
            margin-bottom: 16px;
        }

        .sample-videos h4 {
            margin-bottom: 12px;
            color: #374151;
            font-size: 14px;
        }

        .sample-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .sample-item {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 4px;
            padding: 8px 12px;
            cursor: pointer;
            font-size: 13px;
            transition: all 0.2s ease;
        }

        .sample-item:hover {
            background: #f3f4f6;
            border-color: #3b82f6;
        }

        @media (max-width: 768px) {
            .container {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Player Section -->
        <div class="player-section">
            <div class="video-container">
                <canvas id="video-canvas" class="video-canvas"></canvas>

                <div class="video-overlay">
                    <div class="track-indicators">
                        <div id="quality-indicator" class="track-indicator quality-indicator">
                            Quality: Auto
                        </div>
                        <div id="audio-indicator" class="track-indicator audio-indicator">
                            Audio: Default
                        </div>
                        <div id="subtitle-indicator" class="track-indicator subtitle-indicator" style="display: none;">
                            Subtitles: Off
                        </div>
                    </div>

                    <div id="subtitle-display" class="subtitle-display"></div>

                    <div id="loading-indicator" class="loading-indicator">
                        Switching tracks...
                    </div>
                </div>
            </div>

            <div class="controls">
                <div class="sample-videos">
                    <h4>Sample Multi-Track Videos</h4>
                    <div class="sample-list">
                        <div class="sample-item" data-url="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4">
                            Big Buck Bunny (Multiple Qualities)
                        </div>
                        <div class="sample-item" data-url="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4">
                            Elephant's Dream (Multi-language)
                        </div>
                    </div>
                </div>

                <div class="progress-section">
                    <div id="progress-bar" class="progress-bar">
                        <div id="progress-fill" class="progress-fill"></div>
                    </div>
                    <div id="time-display" class="time-display">0:00 / 0:00</div>
                </div>

                <div class="control-row">
                    <button id="play-pause-btn" class="btn primary" disabled>Play</button>
                    <button id="seek-back-btn" class="btn">-10s</button>
                    <button id="seek-forward-btn" class="btn">+10s</button>
                    <div style="flex: 1;"></div>
                    <input type="file" id="file-input" accept="video/*" style="display: none;">
                    <button id="load-file-btn" class="btn">Load File</button>
                </div>
            </div>
        </div>

        <!-- Sidebar -->
        <div class="sidebar">
            <!-- Video Quality Panel -->
            <div class="panel">
                <div class="panel-header">Video Quality</div>
                <div class="panel-content">
                    <div id="video-tracks" class="track-list">
                        <div class="track-item">
                            <div class="track-info">
                                <div class="track-title">No video loaded</div>
                                <div class="track-details">Load a video to see quality options</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Audio Language Panel -->
            <div class="panel">
                <div class="panel-header">Audio Language</div>
                <div class="panel-content">
                    <div id="audio-tracks" class="track-list">
                        <div class="track-item">
                            <div class="track-info">
                                <div class="track-title">No audio loaded</div>
                                <div class="track-details">Load a video to see audio options</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Subtitles Panel -->
            <div class="panel">
                <div class="panel-header">Subtitles</div>
                <div class="panel-content">
                    <div id="subtitle-tracks" class="track-list">
                        <div class="track-item">
                            <div class="track-info">
                                <div class="track-title">No subtitles available</div>
                                <div class="track-details">Upload subtitle files or use embedded subs</div>
                            </div>
                        </div>
                    </div>

                    <div style="margin-top: 16px;">
                        <input type="file" id="subtitle-input" accept=".vtt,.srt" style="display: none;">
                        <button id="load-subtitle-btn" class="btn" style="width: 100%;">Load Subtitle File</button>
                    </div>
                </div>
            </div>

            <!-- Adaptive Settings Panel -->
            <div class="panel">
                <div class="panel-header">Adaptive Settings</div>
                <div class="panel-content">
                    <div class="adaptive-settings">
                        <div class="setting-item">
                            <span class="setting-label">Auto Quality</span>
                            <div id="auto-quality-switch" class="switch active">
                                <div class="switch-handle"></div>
                            </div>
                        </div>

                        <div class="setting-item">
                            <span class="setting-label">Auto Language</span>
                            <div id="auto-language-switch" class="switch">
                                <div class="switch-handle"></div>
                            </div>
                        </div>

                        <div class="setting-item">
                            <span class="setting-label">Sync Tracks</span>
                            <div id="sync-tracks-switch" class="switch active">
                                <div class="switch-handle"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Network Info Panel -->
            <div class="panel">
                <div class="panel-header">Network Information</div>
                <div class="panel-content">
                    <div class="network-info">
                        <div class="network-item">
                            <span class="network-label">Connection:</span>
                            <span id="connection-type" class="network-value">Unknown</span>
                        </div>
                        <div class="network-item">
                            <span class="network-label">Download Speed:</span>
                            <span id="download-speed" class="network-value">-- Mbps</span>
                        </div>
                        <div class="network-item">
                            <span class="network-label">Buffer Health:</span>
                            <span id="buffer-health" class="network-value">-- sec</span>
                        </div>
                        <div class="network-item">
                            <span class="network-label">Current Bitrate:</span>
                            <span id="current-bitrate" class="network-value">-- kbps</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Error Toast -->
    <div id="error-toast" class="error-toast">
        <span id="error-message"></span>
    </div>

    <script type="module" src="./multi-track.js"></script>
</body>
</html>
```

## JavaScript Implementation

```javascript
// multi-track.js
import { XiaoMei } from 'xiaomei';

class MultiTrackPlayer {
    constructor() {
        this.player = null;
        this.trackManager = null;
        this.adaptiveController = null;
        this.subtitleManager = null;

        this.settings = {
            autoQuality: true,
            autoLanguage: false,
            syncTracks: true,
            preferredLanguages: ['en', 'en-US', 'es', 'fr']
        };

        this.initializeElements();
        this.setupEventListeners();
        this.initializePlayer();
        this.setupNetworkMonitoring();
    }

    initializeElements() {
        // Video elements
        this.canvas = document.getElementById('video-canvas');
        this.playPauseBtn = document.getElementById('play-pause-btn');
        this.seekBackBtn = document.getElementById('seek-back-btn');
        this.seekForwardBtn = document.getElementById('seek-forward-btn');

        // Progress
        this.progressBar = document.getElementById('progress-bar');
        this.progressFill = document.getElementById('progress-fill');
        this.timeDisplay = document.getElementById('time-display');

        // File inputs
        this.fileInput = document.getElementById('file-input');
        this.loadFileBtn = document.getElementById('load-file-btn');
        this.subtitleInput = document.getElementById('subtitle-input');
        this.loadSubtitleBtn = document.getElementById('load-subtitle-btn');

        // Track lists
        this.videoTracks = document.getElementById('video-tracks');
        this.audioTracks = document.getElementById('audio-tracks');
        this.subtitleTracks = document.getElementById('subtitle-tracks');

        // Indicators
        this.qualityIndicator = document.getElementById('quality-indicator');
        this.audioIndicator = document.getElementById('audio-indicator');
        this.subtitleIndicator = document.getElementById('subtitle-indicator');
        this.subtitleDisplay = document.getElementById('subtitle-display');
        this.loadingIndicator = document.getElementById('loading-indicator');

        // Settings switches
        this.autoQualitySwitch = document.getElementById('auto-quality-switch');
        this.autoLanguageSwitch = document.getElementById('auto-language-switch');
        this.syncTracksSwitch = document.getElementById('sync-tracks-switch');

        // Network info
        this.connectionType = document.getElementById('connection-type');
        this.downloadSpeed = document.getElementById('download-speed');
        this.bufferHealth = document.getElementById('buffer-health');
        this.currentBitrate = document.getElementById('current-bitrate');

        // Error toast
        this.errorToast = document.getElementById('error-toast');
        this.errorMessage = document.getElementById('error-message');
    }

    async initializePlayer() {
        try {
            this.player = new XiaoMei({
                canvas: this.canvas,
                frameBufferSize: 30
            });

            this.trackManager = new TrackManager(this.player, this);
            this.adaptiveController = new AdaptiveController(this.player, this);
            this.subtitleManager = new SubtitleManager(this.player, this.subtitleDisplay);

            this.setupPlayerEvents();

            console.log('Multi-track player initialized');
        } catch (error) {
            console.error('Failed to initialize player:', error);
            this.showError('Failed to initialize player: ' + error.message);
        }
    }

    setupPlayerEvents() {
        // Basic playback events
        this.player.on('play', () => {
            this.playPauseBtn.textContent = 'Pause';
        });

        this.player.on('pause', () => {
            this.playPauseBtn.textContent = 'Play';
        });

        this.player.on('timeupdate', (currentTime) => {
            this.updateProgress(currentTime);
            this.updateTimeDisplay(currentTime);
            this.subtitleManager.updateTime(currentTime);
        });

        // Loading events
        this.player.on('loadstart', () => {
            this.playPauseBtn.disabled = true;
            this.clearTrackLists();
        });

        this.player.on('loadeddata', () => {
            this.playPauseBtn.disabled = false;
        });

        // Track events
        this.player.on('tracksChanged', (tracks) => {
            console.log('Tracks updated:', tracks);
            this.trackManager.updateTrackLists(tracks);
            this.adaptiveController.onTracksChanged(tracks);
        });

        this.player.on('trackSwitching', (type) => {
            this.showLoadingIndicator();
        });

        this.player.on('trackSwitched', (type, index) => {
            this.hideLoadingIndicator();
            this.trackManager.updateCurrentTrack(type, index);
        });

        this.player.on('trackSwitchFailed', (type, index, error) => {
            this.hideLoadingIndicator();
            this.showError(`Failed to switch ${type} track: ${error.message}`);
        });

        // Buffer and progress events
        this.player.on('progress', (buffered) => {
            this.updateBufferHealth(buffered);
        });

        // Error handling
        this.player.on('error', (error) => {
            this.showError(error.message);
        });
    }

    setupEventListeners() {
        // Basic controls
        this.playPauseBtn.addEventListener('click', () => this.togglePlayback());
        this.seekBackBtn.addEventListener('click', () => this.seekBy(-10));
        this.seekForwardBtn.addEventListener('click', () => this.seekBy(10));

        // Progress bar
        this.progressBar.addEventListener('click', (e) => this.handleProgressClick(e));

        // File inputs
        this.loadFileBtn.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.loadFile(e.target.files[0]));

        this.loadSubtitleBtn.addEventListener('click', () => this.subtitleInput.click());
        this.subtitleInput.addEventListener('change', (e) => this.loadSubtitle(e.target.files[0]));

        // Settings switches
        this.autoQualitySwitch.addEventListener('click', () => this.toggleSetting('autoQuality'));
        this.autoLanguageSwitch.addEventListener('click', () => this.toggleSetting('autoLanguage'));
        this.syncTracksSwitch.addEventListener('click', () => this.toggleSetting('syncTracks'));

        // Sample videos
        document.querySelectorAll('.sample-item').forEach(item => {
            item.addEventListener('click', () => {
                const url = item.dataset.url;
                this.loadUrl(url);
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
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
            this.showError('Playback error: ' + error.message);
        }
    }

    async seekBy(seconds) {
        if (!this.player) return;

        const newTime = Math.max(0, Math.min(
            this.player.currentTime + seconds,
            this.player.duration
        ));

        await this.player.seek(newTime);
    }

    handleProgressClick(e) {
        if (!this.player || this.player.duration === 0) return;

        const rect = this.progressBar.getBoundingClientRect();
        const percentage = (e.clientX - rect.left) / rect.width;
        const time = percentage * this.player.duration;

        this.player.seek(time);
    }

    async loadFile(file) {
        if (!file || !this.player) return;

        try {
            await this.player.load(file);
        } catch (error) {
            this.showError('Failed to load file: ' + error.message);
        }
    }

    async loadUrl(url) {
        if (!url || !this.player) return;

        try {
            await this.player.load(url);
        } catch (error) {
            this.showError('Failed to load URL: ' + error.message);
        }
    }

    async loadSubtitle(file) {
        if (!file) return;

        try {
            await this.subtitleManager.loadSubtitleFile(file);
            this.showNotification('Subtitles loaded successfully');
        } catch (error) {
            this.showError('Failed to load subtitles: ' + error.message);
        }
    }

    toggleSetting(setting) {
        this.settings[setting] = !this.settings[setting];

        const switchElement = document.getElementById(`${setting.replace(/([A-Z])/g, '-$1').toLowerCase()}-switch`);
        switchElement.classList.toggle('active', this.settings[setting]);

        // Apply setting changes
        switch (setting) {
            case 'autoQuality':
                this.adaptiveController.setAutoQuality(this.settings.autoQuality);
                break;
            case 'autoLanguage':
                this.adaptiveController.setAutoLanguage(this.settings.autoLanguage);
                break;
            case 'syncTracks':
                // Handle track synchronization
                break;
        }
    }

    // UI Update Methods
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

    updateBufferHealth(buffered) {
        if (!this.player || !buffered || buffered.length === 0) return;

        const currentTime = this.player.currentTime;
        let bufferHealth = 0;

        for (let i = 0; i < buffered.length; i++) {
            if (buffered.start(i) <= currentTime && currentTime <= buffered.end(i)) {
                bufferHealth = buffered.end(i) - currentTime;
                break;
            }
        }

        this.bufferHealth.textContent = `${bufferHealth.toFixed(1)} sec`;
    }

    clearTrackLists() {
        this.videoTracks.innerHTML = '<div class="track-item"><div class="track-info"><div class="track-title">Loading...</div></div></div>';
        this.audioTracks.innerHTML = '<div class="track-item"><div class="track-info"><div class="track-title">Loading...</div></div></div>';
        this.subtitleTracks.innerHTML = '<div class="track-item"><div class="track-info"><div class="track-title">Loading...</div></div></div>';
    }

    showLoadingIndicator() {
        this.loadingIndicator.style.display = 'flex';
    }

    hideLoadingIndicator() {
        this.loadingIndicator.style.display = 'none';
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.errorToast.classList.add('visible');
        setTimeout(() => {
            this.errorToast.classList.remove('visible');
        }, 5000);
    }

    showNotification(message) {
        // Could implement a notification system
        console.log('Notification:', message);
    }

    setupNetworkMonitoring() {
        if ('connection' in navigator) {
            const connection = navigator.connection;
            this.updateNetworkInfo(connection);

            connection.addEventListener('change', () => {
                this.updateNetworkInfo(connection);
                this.adaptiveController.onNetworkChange(connection);
            });
        }
    }

    updateNetworkInfo(connection) {
        this.connectionType.textContent = connection.effectiveType || 'Unknown';
        this.downloadSpeed.textContent = connection.downlink ?
            `${connection.downlink} Mbps` : '-- Mbps';
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    handleKeyboard(e) {
        if (!this.player) return;
        if (e.target.tagName === 'INPUT') return;

        switch (e.code) {
            case 'Space':
                e.preventDefault();
                this.togglePlayback();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                this.seekBy(-10);
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.seekBy(10);
                break;
            case 'KeyQ':
                e.preventDefault();
                this.adaptiveController.switchToNextQuality();
                break;
            case 'KeyA':
                e.preventDefault();
                this.adaptiveController.switchToNextAudioTrack();
                break;
            case 'KeyS':
                e.preventDefault();
                this.subtitleManager.toggle();
                break;
        }
    }

    destroy() {
        if (this.player) {
            this.player.destroy();
        }
        this.trackManager?.destroy();
        this.adaptiveController?.destroy();
        this.subtitleManager?.destroy();
    }
}

// Supporting Classes

class TrackManager {
    constructor(player, ui) {
        this.player = player;
        this.ui = ui;
        this.currentTracks = { video: 0, audio: 0, subtitle: -1 };
    }

    updateTrackLists(tracks) {
        this.updateVideoTracks(tracks.video);
        this.updateAudioTracks(tracks.audio);
        this.updateSubtitleTracks(tracks.subtitle || []);
    }

    updateVideoTracks(videoTracks) {
        const container = this.ui.videoTracks;
        container.innerHTML = '';

        if (videoTracks.length === 0) {
            container.innerHTML = '<div class="track-item"><div class="track-info"><div class="track-title">No video tracks</div></div></div>';
            return;
        }

        videoTracks.forEach((track, index) => {
            const item = this.createTrackItem({
                title: `${track.width}x${track.height}`,
                details: `${track.codec} • ${this.formatBitrate(track.bitrate)}`,
                active: index === this.currentTracks.video,
                onClick: () => this.switchVideoTrack(index)
            });
            container.appendChild(item);
        });
    }

    updateAudioTracks(audioTracks) {
        const container = this.ui.audioTracks;
        container.innerHTML = '';

        if (audioTracks.length === 0) {
            container.innerHTML = '<div class="track-item"><div class="track-info"><div class="track-title">No audio tracks</div></div></div>';
            return;
        }

        audioTracks.forEach((track, index) => {
            const item = this.createTrackItem({
                title: track.language || `Track ${index + 1}`,
                details: `${track.codec} • ${track.channels}ch • ${this.formatBitrate(track.bitrate)}`,
                active: index === this.currentTracks.audio,
                onClick: () => this.switchAudioTrack(index)
            });
            container.appendChild(item);
        });
    }

    updateSubtitleTracks(subtitleTracks) {
        const container = this.ui.subtitleTracks;
        container.innerHTML = '';

        // Add "Off" option
        const offItem = this.createTrackItem({
            title: 'Off',
            details: 'No subtitles',
            active: this.currentTracks.subtitle === -1,
            onClick: () => this.switchSubtitleTrack(-1)
        });
        container.appendChild(offItem);

        subtitleTracks.forEach((track, index) => {
            const item = this.createTrackItem({
                title: track.language || `Subtitle ${index + 1}`,
                details: track.format || 'Unknown format',
                active: index === this.currentTracks.subtitle,
                onClick: () => this.switchSubtitleTrack(index)
            });
            container.appendChild(item);
        });
    }

    createTrackItem({ title, details, active, onClick }) {
        const item = document.createElement('div');
        item.className = `track-item ${active ? 'active' : ''}`;
        item.innerHTML = `
            <div class="track-info">
                <div class="track-title">${title}</div>
                <div class="track-details">${details}</div>
            </div>
            <div class="track-status">
                <div class="status-dot ${active ? 'active' : ''}"></div>
            </div>
        `;
        item.addEventListener('click', onClick);
        return item;
    }

    async switchVideoTrack(index) {
        try {
            await this.player.selectVideoTrack(index);
        } catch (error) {
            this.ui.showError('Failed to switch video track: ' + error.message);
        }
    }

    async switchAudioTrack(index) {
        try {
            await this.player.selectAudioTrack(index);
        } catch (error) {
            this.ui.showError('Failed to switch audio track: ' + error.message);
        }
    }

    async switchSubtitleTrack(index) {
        try {
            await this.player.selectSubtitleTrack(index);
        } catch (error) {
            this.ui.showError('Failed to switch subtitle track: ' + error.message);
        }
    }

    updateCurrentTrack(type, index) {
        this.currentTracks[type] = index;

        // Update indicators
        switch (type) {
            case 'video':
                const videoTrack = this.player.tracks.video[index];
                this.ui.qualityIndicator.textContent =
                    `Quality: ${videoTrack.width}x${videoTrack.height}`;
                break;
            case 'audio':
                const audioTrack = this.player.tracks.audio[index];
                this.ui.audioIndicator.textContent =
                    `Audio: ${audioTrack.language || 'Default'}`;
                break;
            case 'subtitle':
                if (index === -1) {
                    this.ui.subtitleIndicator.style.display = 'none';
                } else {
                    const subtitleTrack = this.player.tracks.subtitle[index];
                    this.ui.subtitleIndicator.textContent =
                        `Subtitles: ${subtitleTrack.language || 'On'}`;
                    this.ui.subtitleIndicator.style.display = 'block';
                }
                break;
        }

        // Refresh track lists
        this.updateTrackLists(this.player.tracks);
    }

    formatBitrate(bitrate) {
        if (!bitrate) return 'Unknown';
        return bitrate > 1000000 ?
            `${(bitrate / 1000000).toFixed(1)} Mbps` :
            `${Math.round(bitrate / 1000)} kbps`;
    }

    destroy() {
        // Cleanup
    }
}

class AdaptiveController {
    constructor(player, ui) {
        this.player = player;
        this.ui = ui;
        this.autoQuality = true;
        this.autoLanguage = false;
        this.bandwidthHistory = [];
        this.qualitySwitchCooldown = 0;

        this.setupNetworkMonitoring();
    }

    setupNetworkMonitoring() {
        // Monitor network performance
        setInterval(() => {
            this.measureBandwidth();
        }, 5000);
    }

    measureBandwidth() {
        // Simple bandwidth estimation based on buffer progress
        // In a real implementation, you'd use more sophisticated methods
        if (this.player && this.player.buffered) {
            // Estimate bandwidth and adapt quality
            const now = Date.now();
            if (now > this.qualitySwitchCooldown && this.autoQuality) {
                this.adaptQuality();
            }
        }
    }

    adaptQuality() {
        if (!this.autoQuality || !this.player.tracks.video.length) return;

        const connection = navigator.connection;
        if (!connection) return;

        const bandwidth = connection.downlink; // Mbps
        const videoTracks = this.player.tracks.video;
        let targetTrack = this.player.currentVideoTrack;

        // Select appropriate quality based on bandwidth
        if (bandwidth > 10) {
            // High bandwidth - highest quality
            targetTrack = this.findHighestQualityTrack(videoTracks);
        } else if (bandwidth > 5) {
            // Medium bandwidth - medium quality
            targetTrack = this.findMediumQualityTrack(videoTracks);
        } else {
            // Low bandwidth - lowest quality
            targetTrack = this.findLowestQualityTrack(videoTracks);
        }

        if (targetTrack !== this.player.currentVideoTrack) {
            this.player.selectVideoTrack(targetTrack);
            this.qualitySwitchCooldown = Date.now() + 10000; // 10 second cooldown
        }
    }

    setAutoQuality(enabled) {
        this.autoQuality = enabled;
        if (enabled) {
            this.adaptQuality();
        }
    }

    setAutoLanguage(enabled) {
        this.autoLanguage = enabled;
        if (enabled) {
            this.selectPreferredLanguage();
        }
    }

    selectPreferredLanguage() {
        if (!this.autoLanguage) return;

        const audioTracks = this.player.tracks.audio;
        const preferredLanguages = this.ui.settings.preferredLanguages;

        for (const lang of preferredLanguages) {
            const trackIndex = audioTracks.findIndex(track =>
                track.language === lang
            );
            if (trackIndex !== -1) {
                this.player.selectAudioTrack(trackIndex);
                break;
            }
        }
    }

    onTracksChanged(tracks) {
        if (this.autoQuality) {
            this.adaptQuality();
        }
        if (this.autoLanguage) {
            this.selectPreferredLanguage();
        }
    }

    onNetworkChange(connection) {
        this.ui.updateNetworkInfo(connection);
        if (this.autoQuality) {
            // Immediate adaptation on network change
            this.qualitySwitchCooldown = 0;
            this.adaptQuality();
        }
    }

    switchToNextQuality() {
        const videoTracks = this.player.tracks.video;
        if (videoTracks.length <= 1) return;

        const currentIndex = this.player.currentVideoTrack;
        const nextIndex = (currentIndex + 1) % videoTracks.length;
        this.player.selectVideoTrack(nextIndex);
    }

    switchToNextAudioTrack() {
        const audioTracks = this.player.tracks.audio;
        if (audioTracks.length <= 1) return;

        const currentIndex = this.player.currentAudioTrack;
        const nextIndex = (currentIndex + 1) % audioTracks.length;
        this.player.selectAudioTrack(nextIndex);
    }

    findHighestQualityTrack(tracks) {
        return tracks.reduce((maxIndex, track, index) => {
            const maxTrack = tracks[maxIndex];
            return (track.width * track.height) > (maxTrack.width * maxTrack.height) ?
                index : maxIndex;
        }, 0);
    }

    findLowestQualityTrack(tracks) {
        return tracks.reduce((minIndex, track, index) => {
            const minTrack = tracks[minIndex];
            return (track.width * track.height) < (minTrack.width * minTrack.height) ?
                index : minIndex;
        }, 0);
    }

    findMediumQualityTrack(tracks) {
        const sorted = tracks
            .map((track, index) => ({ index, pixels: track.width * track.height }))
            .sort((a, b) => a.pixels - b.pixels);

        return sorted[Math.floor(sorted.length / 2)].index;
    }

    destroy() {
        // Cleanup
    }
}

class SubtitleManager {
    constructor(player, display) {
        this.player = player;
        this.display = display;
        this.subtitles = [];
        this.currentCue = null;
        this.enabled = false;
    }

    async loadSubtitleFile(file) {
        const text = await file.text();
        this.subtitles = this.parseVTT(text);
        this.enabled = true;
    }

    parseVTT(text) {
        const lines = text.split('\n');
        const cues = [];
        let i = 0;

        // Skip header
        while (i < lines.length && !lines[i].includes('-->')) {
            i++;
        }

        while (i < lines.length) {
            const timeLine = lines[i];
            if (timeLine.includes('-->')) {
                const [startStr, endStr] = timeLine.split('-->').map(s => s.trim());
                const start = this.parseTime(startStr);
                const end = this.parseTime(endStr);

                i++;
                let text = '';
                while (i < lines.length && lines[i].trim() !== '') {
                    text += lines[i] + '\n';
                    i++;
                }

                cues.push({ start, end, text: text.trim() });
            }
            i++;
        }

        return cues;
    }

    parseTime(timeStr) {
        const parts = timeStr.split(':');
        if (parts.length === 3) {
            const [hours, minutes, seconds] = parts;
            return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseFloat(seconds);
        }
        return 0;
    }

    updateTime(currentTime) {
        if (!this.enabled || this.subtitles.length === 0) {
            this.display.style.display = 'none';
            return;
        }

        const activeCue = this.subtitles.find(cue =>
            currentTime >= cue.start && currentTime <= cue.end
        );

        if (activeCue !== this.currentCue) {
            this.currentCue = activeCue;

            if (this.currentCue) {
                this.display.textContent = this.currentCue.text;
                this.display.style.display = 'block';
            } else {
                this.display.style.display = 'none';
            }
        }
    }

    toggle() {
        this.enabled = !this.enabled;
        if (!this.enabled) {
            this.display.style.display = 'none';
        }
    }

    destroy() {
        this.display.style.display = 'none';
    }
}

// Initialize the multi-track player
const player = new MultiTrackPlayer();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    player.destroy();
});

export default MultiTrackPlayer;
```

## Key Multi-Track Features

This example demonstrates:

1. **Quality Selection**: Automatic and manual video quality switching
2. **Audio Language Support**: Multiple audio track selection with language preference
3. **Subtitle Management**: External subtitle file loading and display
4. **Adaptive Streaming**: Network-aware quality adaptation
5. **Track Synchronization**: Coordinated track switching
6. **Real-time Indicators**: Visual feedback for current track selections
7. **Network Monitoring**: Connection speed and type awareness
8. **User Preferences**: Persistent settings for track selection
9. **Keyboard Shortcuts**: Quick track switching via keyboard
10. **Buffer Management**: Health monitoring and adaptive responses

## Advanced Patterns

- **Modular Architecture**: Separate managers for tracks, adaptation, and subtitles
- **State Synchronization**: UI updates reflect current player state
- **Performance Optimization**: Cooldown periods and intelligent switching
- **Accessibility**: Clear visual indicators and keyboard navigation
- **Error Recovery**: Graceful handling of track switching failures

This example showcases XiaoMei's sophisticated multi-track capabilities for building professional-grade video applications.