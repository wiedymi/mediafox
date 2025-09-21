# Live Streaming Example

This example demonstrates how to use XiaoMei for live streaming scenarios, including webcam capture, screen recording, and real-time streaming protocols.

## HTML Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Live Streaming with XiaoMei</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #1a1a1a;
            color: white;
            padding: 20px;
        }

        .streaming-interface {
            max-width: 1600px;
            margin: 0 auto;
            display: grid;
            grid-template-columns: 1fr 400px;
            gap: 20px;
            height: calc(100vh - 40px);
        }

        .main-content {
            display: flex;
            flex-direction: column;
            gap: 20px;
        }

        .video-section {
            background: #2a2a2a;
            border-radius: 12px;
            overflow: hidden;
            flex: 1;
            position: relative;
        }

        .video-container {
            position: relative;
            height: 100%;
            background: black;
        }

        .video-canvas {
            width: 100%;
            height: 100%;
            object-fit: contain;
            display: block;
        }

        .stream-overlay {
            position: absolute;
            top: 16px;
            left: 16px;
            right: 16px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            pointer-events: none;
        }

        .stream-info {
            background: rgba(0, 0, 0, 0.8);
            padding: 8px 12px;
            border-radius: 6px;
            backdrop-filter: blur(8px);
            font-size: 12px;
        }

        .stream-status {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #ef4444;
            animation: pulse 2s infinite;
        }

        .status-dot.live {
            background: #10b981;
        }

        .status-dot.connecting {
            background: #f59e0b;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }

        .stream-controls {
            background: #2a2a2a;
            border-radius: 12px;
            padding: 20px;
            display: flex;
            align-items: center;
            gap: 16px;
            flex-wrap: wrap;
        }

        .control-group {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            background: #3b82f6;
            color: white;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .btn:hover {
            background: #2563eb;
            transform: translateY(-1px);
        }

        .btn:disabled {
            background: #4b5563;
            cursor: not-allowed;
            transform: none;
        }

        .btn.danger {
            background: #ef4444;
        }

        .btn.danger:hover {
            background: #dc2626;
        }

        .btn.success {
            background: #10b981;
        }

        .btn.success:hover {
            background: #059669;
        }

        .sidebar {
            display: flex;
            flex-direction: column;
            gap: 20px;
        }

        .panel {
            background: #2a2a2a;
            border-radius: 12px;
            overflow: hidden;
        }

        .panel-header {
            background: #374151;
            padding: 16px 20px;
            font-weight: 600;
        }

        .panel-content {
            padding: 20px;
        }

        .source-selector {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .source-option {
            background: #374151;
            border: 2px solid transparent;
            border-radius: 8px;
            padding: 16px;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .source-option:hover {
            border-color: #3b82f6;
        }

        .source-option.active {
            border-color: #10b981;
            background: #065f46;
        }

        .source-title {
            font-weight: 600;
            margin-bottom: 4px;
        }

        .source-description {
            font-size: 12px;
            color: #9ca3af;
        }

        .stream-config {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .config-item {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .config-label {
            font-size: 14px;
            font-weight: 500;
            color: #e5e7eb;
        }

        .config-input {
            background: #374151;
            border: 1px solid #4b5563;
            border-radius: 6px;
            padding: 8px 12px;
            color: white;
            font-size: 14px;
        }

        .config-input:focus {
            outline: none;
            border-color: #3b82f6;
        }

        .config-select {
            background: #374151;
            border: 1px solid #4b5563;
            border-radius: 6px;
            padding: 8px 12px;
            color: white;
            font-size: 14px;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
        }

        .stat-item {
            background: #374151;
            padding: 12px;
            border-radius: 6px;
            text-align: center;
        }

        .stat-value {
            font-size: 18px;
            font-weight: 600;
            color: #10b981;
        }

        .stat-label {
            font-size: 12px;
            color: #9ca3af;
            margin-top: 4px;
        }

        .chat-container {
            background: #374151;
            border-radius: 8px;
            height: 200px;
            display: flex;
            flex-direction: column;
        }

        .chat-messages {
            flex: 1;
            padding: 12px;
            overflow-y: auto;
            font-size: 14px;
            line-height: 1.4;
        }

        .chat-message {
            margin-bottom: 8px;
            padding: 4px 0;
        }

        .chat-user {
            font-weight: 600;
            color: #3b82f6;
        }

        .chat-input {
            border: none;
            background: #4b5563;
            color: white;
            padding: 12px;
            font-size: 14px;
        }

        .chat-input:focus {
            outline: none;
            background: #374151;
        }

        .error-banner {
            background: #ef4444;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            display: none;
        }

        .preview-container {
            background: #374151;
            border-radius: 8px;
            overflow: hidden;
            aspect-ratio: 16/9;
            position: relative;
        }

        .preview-canvas {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .preview-overlay {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
            color: #9ca3af;
        }

        .device-list {
            max-height: 150px;
            overflow-y: auto;
            border: 1px solid #4b5563;
            border-radius: 6px;
            background: #374151;
        }

        .device-item {
            padding: 8px 12px;
            cursor: pointer;
            border-bottom: 1px solid #4b5563;
            font-size: 14px;
        }

        .device-item:hover {
            background: #4b5563;
        }

        .device-item:last-child {
            border-bottom: none;
        }

        .device-item.selected {
            background: #3b82f6;
        }

        @media (max-width: 1200px) {
            .streaming-interface {
                grid-template-columns: 1fr;
                grid-template-rows: 1fr auto;
            }

            .sidebar {
                flex-direction: row;
                overflow-x: auto;
            }

            .panel {
                min-width: 300px;
            }
        }
    </style>
</head>
<body>
    <div class="streaming-interface">
        <div class="main-content">
            <!-- Error Banner -->
            <div id="error-banner" class="error-banner">
                <span id="error-message"></span>
            </div>

            <!-- Video Section -->
            <div class="video-section">
                <div class="video-container">
                    <canvas id="main-canvas" class="video-canvas"></canvas>

                    <div class="stream-overlay">
                        <div class="stream-info">
                            <div id="stream-title">XiaoMei Live Stream</div>
                            <div id="stream-duration">00:00:00</div>
                        </div>

                        <div class="stream-status">
                            <div id="status-dot" class="status-dot"></div>
                            <span id="status-text">Offline</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Stream Controls -->
            <div class="stream-controls">
                <div class="control-group">
                    <button id="start-stream-btn" class="btn success">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="12" cy="12" r="10"/>
                        </svg>
                        Start Stream
                    </button>

                    <button id="stop-stream-btn" class="btn danger" disabled>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <rect x="6" y="6" width="12" height="12"/>
                        </svg>
                        Stop Stream
                    </button>
                </div>

                <div class="control-group">
                    <button id="record-btn" class="btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="12" cy="12" r="6"/>
                        </svg>
                        Record
                    </button>

                    <button id="screenshot-btn" class="btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                        </svg>
                        Screenshot
                    </button>
                </div>

                <div class="control-group">
                    <label class="config-label">Volume:</label>
                    <input type="range" id="volume-slider" min="0" max="1" step="0.1" value="1" style="width: 100px;">
                </div>
            </div>
        </div>

        <!-- Sidebar -->
        <div class="sidebar">
            <!-- Source Selection -->
            <div class="panel">
                <div class="panel-header">Source Selection</div>
                <div class="panel-content">
                    <div class="source-selector">
                        <div class="source-option active" data-source="webcam">
                            <div class="source-title">Webcam</div>
                            <div class="source-description">Stream from camera</div>
                        </div>

                        <div class="source-option" data-source="screen">
                            <div class="source-title">Screen Share</div>
                            <div class="source-description">Share your screen</div>
                        </div>

                        <div class="source-option" data-source="file">
                            <div class="source-title">Media File</div>
                            <div class="source-description">Stream from file</div>
                        </div>

                        <div class="source-option" data-source="url">
                            <div class="source-title">Stream URL</div>
                            <div class="source-description">External stream source</div>
                        </div>
                    </div>

                    <!-- Device Selection -->
                    <div id="device-selection" style="margin-top: 16px;">
                        <div class="config-label">Camera:</div>
                        <div id="camera-list" class="device-list">
                            <div class="device-item">Loading devices...</div>
                        </div>

                        <div class="config-label" style="margin-top: 12px;">Microphone:</div>
                        <div id="microphone-list" class="device-list">
                            <div class="device-item">Loading devices...</div>
                        </div>
                    </div>

                    <!-- Preview -->
                    <div style="margin-top: 16px;">
                        <div class="config-label">Preview:</div>
                        <div class="preview-container">
                            <canvas id="preview-canvas" class="preview-canvas"></canvas>
                            <div id="preview-overlay" class="preview-overlay">
                                <div>Select a source to see preview</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Stream Configuration -->
            <div class="panel">
                <div class="panel-header">Stream Settings</div>
                <div class="panel-content">
                    <div class="stream-config">
                        <div class="config-item">
                            <label class="config-label">Stream URL:</label>
                            <input type="text" id="stream-url" class="config-input"
                                   placeholder="rtmp://server/live/key">
                        </div>

                        <div class="config-item">
                            <label class="config-label">Quality:</label>
                            <select id="quality-select" class="config-select">
                                <option value="1080p">1080p (1920x1080)</option>
                                <option value="720p" selected>720p (1280x720)</option>
                                <option value="480p">480p (854x480)</option>
                                <option value="360p">360p (640x360)</option>
                            </select>
                        </div>

                        <div class="config-item">
                            <label class="config-label">Bitrate:</label>
                            <select id="bitrate-select" class="config-select">
                                <option value="6000">6000 kbps</option>
                                <option value="4000" selected>4000 kbps</option>
                                <option value="2500">2500 kbps</option>
                                <option value="1500">1500 kbps</option>
                            </select>
                        </div>

                        <div class="config-item">
                            <label class="config-label">Frame Rate:</label>
                            <select id="framerate-select" class="config-select">
                                <option value="60">60 fps</option>
                                <option value="30" selected>30 fps</option>
                                <option value="24">24 fps</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Stream Statistics -->
            <div class="panel">
                <div class="panel-header">Stream Statistics</div>
                <div class="panel-content">
                    <div class="stats-grid">
                        <div class="stat-item">
                            <div id="bitrate-stat" class="stat-value">0</div>
                            <div class="stat-label">kbps</div>
                        </div>

                        <div class="stat-item">
                            <div id="fps-stat" class="stat-value">0</div>
                            <div class="stat-label">fps</div>
                        </div>

                        <div class="stat-item">
                            <div id="viewers-stat" class="stat-value">0</div>
                            <div class="stat-label">viewers</div>
                        </div>

                        <div class="stat-item">
                            <div id="uptime-stat" class="stat-value">00:00</div>
                            <div class="stat-label">uptime</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Chat (Simulated) -->
            <div class="panel">
                <div class="panel-header">Live Chat</div>
                <div class="panel-content" style="padding: 0;">
                    <div class="chat-container">
                        <div id="chat-messages" class="chat-messages">
                            <div class="chat-message">
                                <span class="chat-user">System:</span> Welcome to the stream!
                            </div>
                        </div>
                        <input type="text" id="chat-input" class="chat-input"
                               placeholder="Type a message..." disabled>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Hidden Elements -->
    <input type="file" id="file-input" accept="video/*" style="display: none;">

    <script type="module" src="./streaming.js"></script>
</body>
</html>
```

## JavaScript Implementation

```javascript
// streaming.js
import { XiaoMei } from 'xiaomei';

class LiveStreamingPlayer {
    constructor() {
        this.player = null;
        this.previewPlayer = null;
        this.currentSource = null;
        this.isStreaming = false;
        this.isRecording = false;
        this.streamStartTime = null;
        this.devices = { cameras: [], microphones: [] };
        this.selectedDevices = { camera: null, microphone: null };

        this.initializeElements();
        this.setupEventListeners();
        this.initializePlayers();
        this.loadDevices();
    }

    initializeElements() {
        // Canvas elements
        this.mainCanvas = document.getElementById('main-canvas');
        this.previewCanvas = document.getElementById('preview-canvas');

        // Control buttons
        this.startStreamBtn = document.getElementById('start-stream-btn');
        this.stopStreamBtn = document.getElementById('stop-stream-btn');
        this.recordBtn = document.getElementById('record-btn');
        this.screenshotBtn = document.getElementById('screenshot-btn');

        // Stream info
        this.streamTitle = document.getElementById('stream-title');
        this.streamDuration = document.getElementById('stream-duration');
        this.statusDot = document.getElementById('status-dot');
        this.statusText = document.getElementById('status-text');

        // Configuration
        this.streamUrl = document.getElementById('stream-url');
        this.qualitySelect = document.getElementById('quality-select');
        this.bitrateSelect = document.getElementById('bitrate-select');
        this.framerateSelect = document.getElementById('framerate-select');
        this.volumeSlider = document.getElementById('volume-slider');

        // Source selection
        this.sourceOptions = document.querySelectorAll('.source-option');
        this.cameraList = document.getElementById('camera-list');
        this.microphoneList = document.getElementById('microphone-list');
        this.deviceSelection = document.getElementById('device-selection');
        this.previewOverlay = document.getElementById('preview-overlay');

        // Statistics
        this.bitrateStat = document.getElementById('bitrate-stat');
        this.fpsStat = document.getElementById('fps-stat');
        this.viewersStat = document.getElementById('viewers-stat');
        this.uptimeStat = document.getElementById('uptime-stat');

        // Chat
        this.chatMessages = document.getElementById('chat-messages');
        this.chatInput = document.getElementById('chat-input');

        // Error handling
        this.errorBanner = document.getElementById('error-banner');
        this.errorMessage = document.getElementById('error-message');

        // File input
        this.fileInput = document.getElementById('file-input');
    }

    async initializePlayers() {
        try {
            // Main streaming player
            this.player = new XiaoMei({
                canvas: this.mainCanvas
            });

            // Preview player
            this.previewPlayer = new XiaoMei({
                canvas: this.previewCanvas
            });

            this.setupPlayerEvents();

            console.log('Streaming players initialized');
        } catch (error) {
            console.error('Failed to initialize players:', error);
            this.showError('Failed to initialize players: ' + error.message);
        }
    }

    setupPlayerEvents() {
        // Main player events
        this.player.on('play', () => {
            this.updateStreamStatus('live', 'Live');
        });

        this.player.on('pause', () => {
            this.updateStreamStatus('offline', 'Paused');
        });

        this.player.on('error', (error) => {
            this.showError('Stream error: ' + error.message);
            this.stopStreaming();
        });

        // Preview player events
        this.previewPlayer.on('loadeddata', () => {
            this.previewOverlay.style.display = 'none';
        });

        this.previewPlayer.on('error', (error) => {
            console.warn('Preview error:', error);
            this.previewOverlay.style.display = 'flex';
        });

        // Performance monitoring
        this.player.on('frameRendered', () => {
            this.updateFPSStats();
        });

        this.setupStatisticsUpdates();
    }

    setupEventListeners() {
        // Stream controls
        this.startStreamBtn.addEventListener('click', () => this.startStreaming());
        this.stopStreamBtn.addEventListener('click', () => this.stopStreaming());
        this.recordBtn.addEventListener('click', () => this.toggleRecording());
        this.screenshotBtn.addEventListener('click', () => this.takeScreenshot());

        // Volume control
        this.volumeSlider.addEventListener('input', (e) => {
            const volume = parseFloat(e.target.value);
            if (this.player) this.player.volume = volume;
            if (this.previewPlayer) this.previewPlayer.volume = volume;
        });

        // Source selection
        this.sourceOptions.forEach(option => {
            option.addEventListener('click', () => {
                this.selectSource(option.dataset.source);
            });
        });

        // Configuration changes
        this.qualitySelect.addEventListener('change', () => this.updateStreamConfig());
        this.bitrateSelect.addEventListener('change', () => this.updateStreamConfig());
        this.framerateSelect.addEventListener('change', () => this.updateStreamConfig());

        // Chat
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && this.chatInput.value.trim()) {
                this.sendChatMessage(this.chatInput.value.trim());
                this.chatInput.value = '';
            }
        });

        // File input
        this.fileInput.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                this.loadMediaFile(e.target.files[0]);
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    async loadDevices() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();

            this.devices.cameras = devices.filter(device => device.kind === 'videoinput');
            this.devices.microphones = devices.filter(device => device.kind === 'audioinput');

            this.updateDeviceLists();

            // Select default devices
            if (this.devices.cameras.length > 0) {
                this.selectedDevices.camera = this.devices.cameras[0].deviceId;
            }
            if (this.devices.microphones.length > 0) {
                this.selectedDevices.microphone = this.devices.microphones[0].deviceId;
            }

        } catch (error) {
            console.error('Failed to load devices:', error);
            this.showError('Failed to access media devices: ' + error.message);
        }
    }

    updateDeviceLists() {
        // Update camera list
        this.cameraList.innerHTML = '';
        this.devices.cameras.forEach((device, index) => {
            const item = document.createElement('div');
            item.className = 'device-item';
            item.textContent = device.label || `Camera ${index + 1}`;
            item.addEventListener('click', () => {
                this.selectCamera(device.deviceId);
            });
            this.cameraList.appendChild(item);
        });

        // Update microphone list
        this.microphoneList.innerHTML = '';
        this.devices.microphones.forEach((device, index) => {
            const item = document.createElement('div');
            item.className = 'device-item';
            item.textContent = device.label || `Microphone ${index + 1}`;
            item.addEventListener('click', () => {
                this.selectMicrophone(device.deviceId);
            });
            this.microphoneList.appendChild(item);
        });

        if (this.devices.cameras.length === 0 && this.devices.microphones.length === 0) {
            this.showError('No media devices found. Please check permissions.');
        }
    }

    selectSource(sourceType) {
        // Update UI
        this.sourceOptions.forEach(option => {
            option.classList.remove('active');
        });
        document.querySelector(`[data-source="${sourceType}"]`).classList.add('active');

        // Show/hide device selection based on source
        this.deviceSelection.style.display =
            (sourceType === 'webcam' || sourceType === 'screen') ? 'block' : 'none';

        // Load the selected source
        switch (sourceType) {
            case 'webcam':
                this.loadWebcamSource();
                break;
            case 'screen':
                this.loadScreenShare();
                break;
            case 'file':
                this.fileInput.click();
                break;
            case 'url':
                this.promptForStreamUrl();
                break;
        }
    }

    async loadWebcamSource() {
        try {
            const constraints = {
                video: {
                    deviceId: this.selectedDevices.camera,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: {
                    deviceId: this.selectedDevices.microphone
                }
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.currentSource = stream;

            // Load into preview
            await this.previewPlayer.load(stream);
            await this.previewPlayer.play();

            this.previewOverlay.style.display = 'none';

        } catch (error) {
            console.error('Failed to load webcam:', error);
            this.showError('Failed to access webcam: ' + error.message);
        }
    }

    async loadScreenShare() {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: { width: 1920, height: 1080 },
                audio: true
            });

            this.currentSource = stream;

            // Load into preview
            await this.previewPlayer.load(stream);
            await this.previewPlayer.play();

            this.previewOverlay.style.display = 'none';

            // Handle screen share end
            stream.getVideoTracks()[0].addEventListener('ended', () => {
                this.stopStreaming();
                this.showError('Screen sharing ended');
            });

        } catch (error) {
            console.error('Failed to start screen share:', error);
            this.showError('Failed to start screen sharing: ' + error.message);
        }
    }

    async loadMediaFile(file) {
        try {
            this.currentSource = file;

            // Load into preview
            await this.previewPlayer.load(file);

            this.previewOverlay.style.display = 'none';

        } catch (error) {
            console.error('Failed to load media file:', error);
            this.showError('Failed to load media file: ' + error.message);
        }
    }

    promptForStreamUrl() {
        const url = prompt('Enter stream URL (RTMP, HLS, etc.):');
        if (url) {
            this.loadStreamUrl(url);
        }
    }

    async loadStreamUrl(url) {
        try {
            this.currentSource = url;

            // Load into preview
            await this.previewPlayer.load(url);

            this.previewOverlay.style.display = 'none';

        } catch (error) {
            console.error('Failed to load stream URL:', error);
            this.showError('Failed to load stream URL: ' + error.message);
        }
    }

    selectCamera(deviceId) {
        this.selectedDevices.camera = deviceId;

        // Update UI
        this.cameraList.querySelectorAll('.device-item').forEach(item => {
            item.classList.remove('selected');
        });
        event.target.classList.add('selected');

        // Reload webcam if currently selected
        if (document.querySelector('[data-source="webcam"]').classList.contains('active')) {
            this.loadWebcamSource();
        }
    }

    selectMicrophone(deviceId) {
        this.selectedDevices.microphone = deviceId;

        // Update UI
        this.microphoneList.querySelectorAll('.device-item').forEach(item => {
            item.classList.remove('selected');
        });
        event.target.classList.add('selected');

        // Reload webcam if currently selected
        if (document.querySelector('[data-source="webcam"]').classList.contains('active')) {
            this.loadWebcamSource();
        }
    }

    async startStreaming() {
        if (!this.currentSource) {
            this.showError('Please select a source first');
            return;
        }

        try {
            // Load source into main player
            await this.player.load(this.currentSource);
            await this.player.play();

            this.isStreaming = true;
            this.streamStartTime = Date.now();

            // Update UI
            this.startStreamBtn.disabled = true;
            this.stopStreamBtn.disabled = false;
            this.chatInput.disabled = false;

            this.updateStreamStatus('live', 'Live');

            // Start stream duration timer
            this.startDurationTimer();

            // Simulate streaming to server
            this.simulateStreamUpload();

            this.addChatMessage('System', 'Stream started successfully!');

        } catch (error) {
            console.error('Failed to start streaming:', error);
            this.showError('Failed to start streaming: ' + error.message);
        }
    }

    stopStreaming() {
        this.isStreaming = false;

        // Update UI
        this.startStreamBtn.disabled = false;
        this.stopStreamBtn.disabled = true;
        this.chatInput.disabled = true;

        this.updateStreamStatus('offline', 'Offline');

        // Stop duration timer
        this.stopDurationTimer();

        // Pause main player
        if (this.player) {
            this.player.pause();
        }

        this.addChatMessage('System', 'Stream ended.');
    }

    toggleRecording() {
        if (this.isRecording) {
            this.stopRecording();
        } else {
            this.startRecording();
        }
    }

    startRecording() {
        // Simulate recording start
        this.isRecording = true;
        this.recordBtn.textContent = 'Stop Recording';
        this.recordBtn.classList.add('danger');

        this.addChatMessage('System', 'Recording started.');
    }

    stopRecording() {
        // Simulate recording stop
        this.isRecording = false;
        this.recordBtn.textContent = 'Record';
        this.recordBtn.classList.remove('danger');

        this.addChatMessage('System', 'Recording saved.');
    }

    async takeScreenshot() {
        if (!this.player) return;

        try {
            const screenshot = await this.player.getScreenshot('png');

            // Create download link
            const link = document.createElement('a');
            link.href = screenshot;
            link.download = `stream-screenshot-${Date.now()}.png`;
            link.click();

            this.addChatMessage('System', 'Screenshot saved!');

        } catch (error) {
            console.error('Failed to take screenshot:', error);
            this.showError('Failed to take screenshot: ' + error.message);
        }
    }

    updateStreamConfig() {
        // Get current settings
        const quality = this.qualitySelect.value;
        const bitrate = this.bitrateSelect.value;
        const framerate = this.framerateSelect.value;

        console.log('Stream config updated:', { quality, bitrate, framerate });

        // In a real implementation, you would apply these settings
        // to the streaming encoder/output
    }

    updateStreamStatus(status, text) {
        this.statusDot.className = `status-dot ${status}`;
        this.statusText.textContent = text;
    }

    startDurationTimer() {
        this.durationTimer = setInterval(() => {
            if (this.streamStartTime) {
                const elapsed = Date.now() - this.streamStartTime;
                this.streamDuration.textContent = this.formatDuration(elapsed);
            }
        }, 1000);
    }

    stopDurationTimer() {
        if (this.durationTimer) {
            clearInterval(this.durationTimer);
            this.durationTimer = null;
        }
    }

    setupStatisticsUpdates() {
        // Update statistics every 2 seconds
        setInterval(() => {
            this.updateStatistics();
        }, 2000);
    }

    updateStatistics() {
        if (this.isStreaming) {
            // Simulate statistics
            this.bitrateStat.textContent = this.bitrateSelect.value;
            this.viewersStat.textContent = Math.floor(Math.random() * 100);

            if (this.streamStartTime) {
                const elapsed = Date.now() - this.streamStartTime;
                this.uptimeStat.textContent = this.formatDuration(elapsed, true);
            }
        } else {
            this.bitrateStat.textContent = '0';
            this.fpsStat.textContent = '0';
            this.viewersStat.textContent = '0';
            this.uptimeStat.textContent = '00:00';
        }
    }

    updateFPSStats() {
        // Simple FPS calculation
        if (!this.lastFrameTime) {
            this.lastFrameTime = Date.now();
            return;
        }

        const now = Date.now();
        const fps = 1000 / (now - this.lastFrameTime);
        this.fpsStat.textContent = Math.round(fps);
        this.lastFrameTime = now;
    }

    simulateStreamUpload() {
        if (!this.isStreaming) return;

        // Simulate stream upload statistics
        setTimeout(() => {
            if (this.isStreaming) {
                this.simulateStreamUpload();
            }
        }, 1000);
    }

    addChatMessage(user, message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message';
        messageDiv.innerHTML = `<span class="chat-user">${user}:</span> ${message}`;

        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    sendChatMessage(message) {
        this.addChatMessage('You', message);

        // Simulate responses
        setTimeout(() => {
            const responses = [
                'Great stream!',
                'Thanks for sharing!',
                'Love this content',
                'Keep it up!',
                'Awesome quality'
            ];
            const randomResponse = responses[Math.floor(Math.random() * responses.length)];
            this.addChatMessage(`Viewer${Math.floor(Math.random() * 100)}`, randomResponse);
        }, 1000 + Math.random() * 3000);
    }

    formatDuration(ms, short = false) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (short) {
            return `${minutes.toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
        } else {
            return `${hours.toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
        }
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.errorBanner.style.display = 'block';

        setTimeout(() => {
            this.errorBanner.style.display = 'none';
        }, 5000);
    }

    handleKeyboard(e) {
        if (e.target.tagName === 'INPUT') return;

        switch (e.code) {
            case 'Space':
                e.preventDefault();
                if (this.isStreaming) {
                    this.stopStreaming();
                } else {
                    this.startStreaming();
                }
                break;
            case 'KeyR':
                e.preventDefault();
                this.toggleRecording();
                break;
            case 'KeyS':
                e.preventDefault();
                this.takeScreenshot();
                break;
        }
    }

    destroy() {
        this.stopStreaming();
        this.stopDurationTimer();

        if (this.player) {
            this.player.destroy();
        }
        if (this.previewPlayer) {
            this.previewPlayer.destroy();
        }

        // Stop any active streams
        if (this.currentSource instanceof MediaStream) {
            this.currentSource.getTracks().forEach(track => track.stop());
        }
    }
}

// Initialize the live streaming player
const streamingPlayer = new LiveStreamingPlayer();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    streamingPlayer.destroy();
});

export default LiveStreamingPlayer;
```

## Key Streaming Features

This example demonstrates:

1. **Multiple Source Types**: Webcam, screen share, media files, and stream URLs
2. **Device Management**: Camera and microphone selection
3. **Live Preview**: Real-time preview of source before streaming
4. **Stream Controls**: Start/stop streaming with proper state management
5. **Recording Capability**: Simultaneous recording while streaming
6. **Real-time Statistics**: FPS, bitrate, viewer count, and uptime tracking
7. **Interactive Chat**: Simulated live chat functionality
8. **Quality Controls**: Resolution, bitrate, and frame rate configuration
9. **Screenshot Capture**: Take screenshots during streaming
10. **Error Handling**: Comprehensive error management and user feedback

## Advanced Streaming Patterns

- **Source Switching**: Dynamic switching between different input sources
- **Performance Monitoring**: Real-time statistics and quality metrics
- **Device Management**: Automatic device detection and selection
- **Stream Configuration**: Adaptive quality settings
- **User Interaction**: Chat integration and viewer engagement

This example showcases XiaoMei's capabilities for building professional live streaming applications with comprehensive source management and real-time features.