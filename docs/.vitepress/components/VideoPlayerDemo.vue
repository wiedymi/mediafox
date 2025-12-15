<template>
    <div class="video-player-demo">
        <div
            class="player-container"
            ref="playerContainer"
            @mousemove="showControlsTemporarily"
            @mouseleave="hideControlsOnLeave"
        >
            <canvas
                ref="canvasRef"
                class="video-canvas"
                @click="togglePlay"
            ></canvas>
            <div ref="subtitleContainer" class="subtitle-layer"></div>

            <!-- Corner load button when media is loaded -->
            <div class="corner-controls" v-if="ready">
                <button
                    @click="openFileDialog"
                    class="corner-btn"
                    title="Open File"
                >
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                    >
                        <path
                            d="M6 2c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6H6zm7 7V3.5L18.5 9H13z"
                        />
                    </svg>
                </button>
                <input
                    type="file"
                    ref="hiddenFileInput"
                    @change="handleFileSelect"
                    style="display: none"
                    accept="*"
                />
            </div>

            <!-- Warning message -->
            <transition name="fade">
                <div v-if="warningMessage" class="warning-message">
                    {{ warningMessage }}
                </div>
            </transition>

            <!-- Empty state when no media -->
            <div class="empty-state" v-if="!ready && !loading">
                <div class="empty-content">
                    <div
                        style="
                            display: flex;
                            justify-content: center;
                            margin-bottom: 24px;
                        "
                    >
                        <svg
                            width="64"
                            height="64"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            opacity="0.3"
                        >
                            <path d="M8 5v14l11-7z" />
                        </svg>
                    </div>
                    <h3>No Media Loaded</h3>
                    <div class="empty-actions">
                        <button @click="loadSample" class="empty-btn primary">
                            <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                            >
                                <path d="M8 5v14l11-7z" />
                            </svg>
                            Load Sample Video
                        </button>
                        <button @click="loadSamplePlaylist" class="empty-btn primary">
                            <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                            >
                                <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" />
                            </svg>
                            Load Sample Playlist
                        </button>
                        <button @click="openFileDialog" class="empty-btn">
                            <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                            >
                                <path
                                    d="M6 2c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6H6zm7 7V3.5L18.5 9H13z"
                                />
                            </svg>
                            Open Local File
                        </button>
                        <input
                            type="file"
                            ref="hiddenFileInput"
                            @change="handleFileSelect"
                            style="display: none"
                            accept="*"
                        />
                    </div>
                </div>
            </div>

            <!-- Loading overlay -->
            <transition name="fade">
                <div v-if="loading" class="loading-overlay">
                    <div class="spinner"></div>
                    <span>Loading media...</span>
                </div>
            </transition>

            <!-- Buffering overlay -->
            <transition name="fade">
                <div v-if="buffering && ready" class="buffering-overlay">
                    <div class="spinner small"></div>
                </div>
            </transition>

            <!-- Large play button overlay -->
            <transition name="fade">
                <div
                    v-if="ready && !playing && !showingControls"
                    class="center-play"
                    @click="play"
                >
                    <svg
                        width="60"
                        height="60"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                    >
                        <path d="M8 5v14l11-7z" />
                    </svg>
                </div>
            </transition>

            <!-- Controls overlay -->
            <transition name="slide-up">
                <div
                    v-if="(showingControls || !playing) && ready"
                    class="controls-overlay"
                    @click.stop
                >
                    <!-- Progress bar -->
                    <div
                        class="progress-section"
                        @mousemove="updateTooltip"
                        @mouseleave="hideTooltip"
                    >
                        <div
                            class="progress-container"
                            @click="handleSeek"
                            ref="progressRef"
                        >
                            <!-- Buffered ranges -->
                            <div
                                v-for="(range, idx) in bufferedRanges"
                                :key="idx"
                                class="buffered-range"
                                :style="{
                                    left: (range.start / duration) * 100 + '%',
                                    width:
                                        ((range.end - range.start) / duration) *
                                            100 +
                                        '%',
                                }"
                            ></div>
                            <!-- Progress -->
                            <div
                                class="progress-bar"
                                :style="{ width: progressPercent + '%' }"
                            >
                                <div class="progress-handle"></div>
                            </div>
                            <!-- Tooltip -->
                            <div
                                v-if="tooltipVisible"
                                class="progress-tooltip"
                                :style="{ left: tooltipPosition + '%' }"
                            >
                                {{ formatTime(tooltipTime) }}
                            </div>
                        </div>
                        <div class="time-display">
                            <span>{{ formatTime(currentTime) }}</span>
                            <span class="time-separator">/</span>
                            <span>{{ formatTime(duration) }}</span>
                        </div>
                    </div>

                    <!-- Control buttons -->
                    <div class="controls-bar">
                        <div class="controls-left">
                            <!-- Previous (Playlist) -->
                            <button
                                v-if="hasPlaylist"
                                @click="playlistPrev"
                                class="control-btn"
                                :disabled="!canGoPrev"
                                :title="'Previous: ' + (prevItem?.title || 'None')"
                            >
                                <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                >
                                    <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                                </svg>
                            </button>

                            <!-- Play/Pause -->
                            <button
                                @click="togglePlay"
                                class="control-btn primary"
                                :title="playing ? 'Pause' : 'Play'"
                            >
                                <svg
                                    v-if="!playing"
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                >
                                    <path d="M8 5v14l11-7z" />
                                </svg>
                                <svg
                                    v-else
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                >
                                    <rect x="6" y="4" width="4" height="16" />
                                    <rect x="14" y="4" width="4" height="16" />
                                </svg>
                            </button>

                            <!-- Next (Playlist) -->
                            <button
                                v-if="hasPlaylist"
                                @click="playlistNext"
                                class="control-btn"
                                :disabled="!canGoNext"
                                :title="'Next: ' + (nextItem?.title || 'None')"
                            >
                                <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                >
                                    <path d="M6 18l8.5-6L6 6v12zm10-12v12h2V6h-2z" />
                                </svg>
                            </button>

                            <!-- Skip backward -->
                            <button
                                v-if="!hasPlaylist"
                                @click="skipBackward"
                                class="control-btn"
                                title="Skip -10s"
                            >
                                <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                >
                                    <path
                                        d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z"
                                    />
                                </svg>
                            </button>

                            <!-- Skip forward -->
                            <button
                                v-if="!hasPlaylist"
                                @click="skipForward"
                                class="control-btn"
                                title="Skip +10s"
                            >
                                <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                >
                                    <path
                                        d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"
                                    />
                                </svg>
                            </button>

                            <!-- Volume controls -->
                            <div class="volume-group">
                                <button
                                    @click="toggleMute"
                                    class="control-btn"
                                    :title="muted ? 'Unmute' : 'Mute'"
                                >
                                    <svg
                                        v-if="!muted && volume > 0.5"
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                    >
                                        <path
                                            d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"
                                        />
                                    </svg>
                                    <svg
                                        v-else-if="!muted && volume > 0"
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                    >
                                        <path
                                            d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"
                                        />
                                    </svg>
                                    <svg
                                        v-else
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                    >
                                        <path
                                            d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"
                                        />
                                    </svg>
                                </button>
                                <div class="volume-slider-container">
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.01"
                                        v-model.number="volume"
                                        @input="updateVolume"
                                        class="volume-slider"
                                        title="Volume"
                                    />
                                </div>
                            </div>
                        </div>

                        <div class="controls-right">
                            <!-- Track selectors -->
                            <div
                                class="track-controls"
                                v-if="
                                    videoTracks.length > 1 ||
                                    audioTracks.length > 1 ||
                                    subtitleTracks.length > 0
                                "
                            >
                                <!-- Video quality selector -->
                                <div
                                    v-if="videoTracks.length > 1"
                                    class="track-dropdown"
                                >
                                    <button
                                        class="track-btn"
                                        title="Video Quality"
                                    >
                                        <svg
                                            width="16"
                                            height="16"
                                            viewBox="0 0 24 24"
                                            fill="currentColor"
                                        >
                                            <path
                                                d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z"
                                            />
                                        </svg>
                                        {{
                                            selectedVideoTrack?.height ||
                                            "Auto"
                                        }}p
                                    </button>
                                    <select
                                        @change="selectVideoTrack($event)"
                                        class="track-select"
                                        :value="selectedVideoTrackId"
                                    >
                                        <option
                                            v-for="track in videoTracks"
                                            :key="track.id"
                                            :value="track.id"
                                        >
                                            {{ track.width }}x{{ track.height }}
                                        </option>
                                    </select>
                                </div>

                                <!-- Audio language selector -->
                                <div
                                    v-if="audioTracks.length > 1"
                                    class="track-dropdown"
                                >
                                    <button
                                        class="track-btn"
                                        title="Audio Track"
                                    >
                                        <svg
                                            width="16"
                                            height="16"
                                            viewBox="0 0 24 24"
                                            fill="currentColor"
                                        >
                                            <path
                                                d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"
                                            />
                                        </svg>
                                        {{
                                            selectedAudioTrack?.language?.toUpperCase() ||
                                            (selectedAudioTrack
                                                ? "Audio " +
                                                  (audioTracks.indexOf(
                                                      selectedAudioTrack,
                                                  ) +
                                                      1)
                                                : "Audio")
                                        }}
                                    </button>
                                    <select
                                        @change="selectAudioTrack($event)"
                                        class="track-select"
                                        :value="selectedAudioTrackId"
                                    >
                                        <option
                                            v-for="track in audioTracks"
                                            :key="track.id"
                                            :value="track.id"
                                        >
                                            {{
                                                track.language ||
                                                "Audio " +
                                                    (audioTracks.indexOf(
                                                        track,
                                                    ) +
                                                        1)
                                            }}
                                        </option>
                                    </select>
                                </div>

                                <!-- Subtitle selector -->
                                <div
                                    v-if="subtitleTracks.length > 0"
                                    class="track-dropdown"
                                >
                                    <button class="track-btn" title="Subtitles">
                                        <svg
                                            width="16"
                                            height="16"
                                            viewBox="0 0 24 24"
                                            fill="currentColor"
                                        >
                                            <path
                                                d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM4 12h4v2H4v-2zm10 6H4v-2h10v2zm6 0h-4v-2h4v2zm0-4H10v-2h10v2z"
                                            />
                                        </svg>
                                        {{
                                            selectedSubtitleTrack?.language?.toUpperCase() ||
                                            (selectedSubtitleTrack
                                                ? "CC"
                                                : "Off")
                                        }}
                                    </button>
                                    <select
                                        @change="selectSubtitleTrack($event)"
                                        class="track-select"
                                        :value="selectedSubtitleTrackId || ''"
                                    >
                                        <option value="">Subtitles Off</option>
                                        <option
                                            v-for="track in subtitleTracks"
                                            :key="track.id"
                                            :value="track.id"
                                        >
                                            {{
                                                track.name ||
                                                track.language?.toUpperCase() ||
                                                "Subtitle"
                                            }}
                                        </option>
                                    </select>
                                </div>
                            </div>

                            <!-- Renderer selector -->
                            <div
                                class="renderer-dropdown"
                                v-if="availableRenderers.length > 1"
                            >
                                <button
                                    class="track-btn"
                                    title="Video Renderer"
                                >
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                    >
                                        <path
                                            d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM8 15h3v-2H8v2zm0-4h8v-2H8v2z"
                                        />
                                    </svg>
                                    {{ rendererDisplayName }}
                                </button>
                                <select
                                    @change="switchRenderer($event)"
                                    class="track-select"
                                    :value="currentRenderer"
                                >
                                    <option
                                        v-for="renderer in availableRenderers"
                                        :key="renderer"
                                        :value="renderer"
                                    >
                                        {{
                                            RendererFactory.getRendererDisplayName(
                                                renderer,
                                            )
                                        }}
                                    </option>
                                </select>
                            </div>

                            <!-- Playback speed -->
                            <div class="speed-selector" title="Playback Speed">
                                <select
                                    v-model="playbackRate"
                                    @change="updatePlaybackRate"
                                    class="speed-select"
                                >
                                    <option :value="0.25">0.25x</option>
                                    <option :value="0.5">0.5x</option>
                                    <option :value="0.75">0.75x</option>
                                    <option :value="1">1x</option>
                                    <option :value="1.25">1.25x</option>
                                    <option :value="1.5">1.5x</option>
                                    <option :value="2">2x</option>
                                </select>
                            </div>

                            <!-- Watermark toggle -->
                            <button
                                @click="toggleWatermark"
                                class="control-btn"
                                :class="{ active: watermarkEnabled }"
                                :title="watermarkEnabled ? 'Hide Watermark' : 'Show Watermark'"
                            >
                                <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                >
                                    <path
                                        d="M10.08 10.86c.05-.33.16-.62.3-.87s.34-.46.59-.62c.24-.15.54-.22.91-.23.23.01.44.05.63.13.2.09.38.21.52.36s.25.33.34.53.13.42.14.64h1.79c-.02-.47-.11-.9-.28-1.29s-.4-.73-.7-1.01-.66-.5-1.08-.66-.88-.23-1.39-.23c-.65 0-1.22.11-1.7.34s-.88.53-1.2.92-.56.84-.71 1.36S8 11.29 8 11.87v.27c0 .58.08 1.12.23 1.64s.39.97.71 1.35.72.69 1.2.91 1.05.34 1.7.34c.47 0 .91-.08 1.32-.23s.77-.36 1.08-.63.56-.58.74-.94.29-.74.3-1.15h-1.79c-.01.21-.06.4-.15.58s-.21.33-.36.46-.32.23-.52.3c-.19.07-.39.09-.6.1-.36-.01-.66-.08-.89-.23-.25-.16-.45-.37-.59-.62s-.25-.55-.3-.88-.08-.67-.08-1v-.27c0-.35.03-.68.08-1.01zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
                                    />
                                </svg>
                            </button>

                            <!-- Bass Boost toggle -->
                            <button
                                @click="toggleBassBoost"
                                class="control-btn"
                                :class="{ active: bassBoostEnabled }"
                                :title="bassBoostEnabled ? 'Disable Bass Boost' : 'Enable Bass Boost'"
                            >
                                <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                >
                                    <path
                                        d="M12 3v9.28c-.47-.17-.97-.28-1.5-.28C8.01 12 6 14.01 6 16.5S8.01 21 10.5 21c2.31 0 4.2-1.75 4.45-4H15V6h4V3h-7z"
                                    />
                                </svg>
                            </button>

                            <!-- Visualizer toggle -->
                            <button
                                @click="toggleVisualizer"
                                class="control-btn"
                                :class="{ active: visualizerEnabled }"
                                :title="visualizerEnabled ? 'Hide Visualizer' : 'Show Visualizer'"
                            >
                                <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                >
                                    <path
                                        d="M3 10v4h4v-4H3zm6-4v12h4V6H9zm6 6v6h4v-6h-4z"
                                    />
                                </svg>
                            </button>

                            <!-- Screenshot -->
                            <button
                                @click="takeScreenshot"
                                class="control-btn"
                                title="Take Screenshot"
                            >
                                <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                >
                                    <circle cx="12" cy="12" r="3.2" />
                                    <path
                                        d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"
                                    />
                                </svg>
                            </button>

                            <!-- Fullscreen -->
                            <button
                                @click="toggleFullscreen"
                                class="control-btn"
                                title="Fullscreen"
                            >
                                <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                >
                                    <path
                                        d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"
                                    />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </transition>
        </div>

        <!-- Bottom info panels -->
        <div class="bottom-panels" v-if="ready">
            <!-- Playlist panel (if playlist active) -->
            <div class="playlist-panel" v-if="hasPlaylist">
                <h3>
                    Playlist
                    <span class="playlist-mode-badge">{{ playlistModeDisplay }}</span>
                </h3>
                <div class="playlist-items">
                    <div
                        v-for="(item, index) in playlist"
                        :key="item.id"
                        class="playlist-item"
                        :class="{ active: index === playlistIndex }"
                        @click="jumpToPlaylistItem(index)"
                    >
                        <div class="playlist-item-index">{{ index + 1 }}</div>
                        <div class="playlist-item-info">
                            <div class="playlist-item-title">
                                {{ item.title || `Item ${index + 1}` }}
                            </div>
                            <div class="playlist-item-time" v-if="item.duration">
                                {{ formatTime(item.duration) }}
                                <span v-if="item.savedPosition" class="saved-position">
                                    (at {{ formatTime(item.savedPosition) }})
                                </span>
                            </div>
                        </div>
                        <div class="playlist-item-playing" v-if="index === playlistIndex">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 5v14l11-7z" v-if="!playing" />
                                <template v-else>
                                    <rect x="6" y="4" width="4" height="16" />
                                    <rect x="14" y="4" width="4" height="16" />
                                </template>
                            </svg>
                        </div>
                        <button
                            class="playlist-item-remove"
                            @click.stop="removePlaylistItem(index)"
                            title="Remove from playlist"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="playlist-controls">
                    <button @click="cyclePlaylistMode" class="playlist-mode-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path v-if="playlistMode === 'sequential'" d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
                            <path v-else-if="playlistMode === 'repeat'" d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2z" />
                            <path v-else-if="playlistMode === 'repeat-one'" d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-3-2V9h-1l-2 1v1h1.5v4H14z" />
                            <path v-else d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" />
                        </svg>
                        {{ playlistModeDisplay }}
                    </button>
                    <button @click="clearPlaylistFn" class="playlist-clear-btn" title="Clear playlist">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                        </svg>
                    </button>
                </div>
            </div>

            <div class="info-panel">
                <h3>Media Info</h3>
                <div class="info-grid">
                    <div class="info-item">
                        <span class="info-label">Format</span>
                        <span class="info-value">{{
                            mediaInfo?.format || "Unknown"
                        }}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Duration</span>
                        <span class="info-value">{{
                            formatTime(duration)
                        }}</span>
                    </div>
                    <div class="info-item" v-if="videoTrackInfo">
                        <span class="info-label">Video</span>
                        <span class="info-value">{{ videoTrackInfo }}</span>
                    </div>
                    <div class="info-item" v-if="audioTrackInfo">
                        <span class="info-label">Audio</span>
                        <span class="info-value">{{ audioTrackInfo }}</span>
                    </div>
                </div>
            </div>

            <div class="shortcuts-panel">
                <h3>Keyboard Shortcuts</h3>
                <div class="shortcuts-grid">
                    <div class="shortcut">
                        <kbd>Space</kbd>
                        <span>Play/Pause</span>
                    </div>
                    <div class="shortcut">
                        <kbd>←/→</kbd>
                        <span>Seek ±5s</span>
                    </div>
                    <div class="shortcut">
                        <kbd>↑/↓</kbd>
                        <span>Volume</span>
                    </div>
                    <div class="shortcut">
                        <kbd>M</kbd>
                        <span>Mute</span>
                    </div>
                    <div class="shortcut">
                        <kbd>F</kbd>
                        <span>Fullscreen</span>
                    </div>
                    <div class="shortcut" v-if="hasPlaylist">
                        <kbd>N</kbd>
                        <span>Next</span>
                    </div>
                    <div class="shortcut" v-if="hasPlaylist">
                        <kbd>P</kbd>
                        <span>Previous</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from "vue";
import {
    MediaFox,
    RendererFactory,
    formatTime as formatTimeUtil,
    type MediaInfo,
    type VideoTrackInfo,
    type AudioTrackInfo,
    type SubtitleTrackInfo,
    type RendererType,
    type PlaylistItem,
    type PlaylistMode,
    type MediaFoxPlugin,
} from "@mediafox/core";
import { withBase } from "vitepress";

// Watermark Plugin - demonstrates the plugin system
const createWatermarkPlugin = (options: {
    text: string;
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    opacity?: number;
}): MediaFoxPlugin => ({
    name: 'demo-watermark',
    version: '1.0.0',

    hooks: {
        render: {
            onOverlay: {
                zIndex: 50,
                render(ctx, time, { width, height }) {
                    const { text, position = 'bottom-right', opacity = 0.6 } = options;

                    ctx.save();
                    ctx.font = 'bold 14px system-ui, sans-serif';
                    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
                    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                    ctx.shadowBlur = 4;
                    ctx.shadowOffsetX = 1;
                    ctx.shadowOffsetY = 1;

                    const padding = 16;
                    const textMetrics = ctx.measureText(text);

                    let x: number, y: number;
                    switch (position) {
                        case 'top-left':
                            x = padding;
                            y = padding + 14;
                            break;
                        case 'top-right':
                            x = width - textMetrics.width - padding;
                            y = padding + 14;
                            break;
                        case 'bottom-left':
                            x = padding;
                            y = height - padding;
                            break;
                        case 'bottom-right':
                        default:
                            x = width - textMetrics.width - padding;
                            y = height - padding;
                            break;
                    }

                    ctx.fillText(text, x, y);
                    ctx.restore();
                }
            }
        }
    },

    install(context) {
        context.log('Watermark plugin installed');
    },

    uninstall() {
        console.log('[MediaFox:demo-watermark] Watermark plugin uninstalled');
    }
});

// Bass boost plugin factory
const createBassBoostPlugin = (options: {
    gain?: number;
}): MediaFoxPlugin => ({
    name: 'demo-bass-boost',
    version: '1.0.0',

    hooks: {
        audio: {
            onAudioNode(audioContext, gainNode) {
                const { gain = 15 } = options;

                // Create a low-shelf filter for bass boost
                const bassFilter = audioContext.createBiquadFilter();
                bassFilter.type = 'lowshelf';
                bassFilter.frequency.value = 250; // Boost frequencies below 250Hz
                bassFilter.gain.value = gain;

                // Connect: gainNode -> bassFilter -> (output)
                gainNode.connect(bassFilter);

                return bassFilter;
            }
        }
    },

    install(context) {
        context.log('Bass boost plugin installed');
    },

    uninstall() {
        console.log('[MediaFox:demo-bass-boost] Bass boost plugin uninstalled');
    }
});

// Audio visualizer plugin factory
const createVisualizerPlugin = (): MediaFoxPlugin => {
    let analyser: AnalyserNode | null = null;
    let dataArray: Uint8Array | null = null;

    return {
        name: 'demo-visualizer',
        version: '1.0.0',

        hooks: {
            audio: {
                onAudioNode(audioContext, gainNode) {
                    // Create analyser node
                    analyser = audioContext.createAnalyser();
                    analyser.fftSize = 256;
                    analyser.smoothingTimeConstant = 0.8;

                    const bufferLength = analyser.frequencyBinCount;
                    dataArray = new Uint8Array(bufferLength);

                    // Connect: gainNode -> analyser -> (output)
                    gainNode.connect(analyser);

                    return analyser;
                }
            },
            render: {
                onOverlay: {
                    zIndex: 5,
                    render(ctx, _time, { width, height }) {
                        if (!analyser || !dataArray) return;

                        // Get frequency data
                        analyser.getByteFrequencyData(dataArray);

                        const barCount = 32;
                        const barWidth = width / barCount;
                        const barGap = 2;
                        const maxBarHeight = height * 0.4;
                        const bottomMargin = 60;

                        ctx.save();

                        // Draw frequency bars from bottom
                        for (let i = 0; i < barCount; i++) {
                            // Sample from the frequency data
                            const dataIndex = Math.floor((i / barCount) * dataArray.length);
                            const value = dataArray[dataIndex];
                            const barHeight = (value / 255) * maxBarHeight;

                            // Color gradient based on frequency (bass = warm, treble = cool)
                            const hue = 200 + (i / barCount) * 60; // Blue to cyan
                            const saturation = 80;
                            const lightness = 50 + (value / 255) * 20;

                            ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, 0.7)`;

                            const x = i * barWidth + barGap / 2;
                            const y = height - bottomMargin - barHeight;

                            ctx.fillRect(x, y, barWidth - barGap, barHeight);

                            // Add glow effect for bass frequencies
                            if (i < 8 && value > 150) {
                                ctx.shadowColor = `hsla(${hue}, ${saturation}%, ${lightness}%, 0.5)`;
                                ctx.shadowBlur = 10;
                                ctx.fillRect(x, y, barWidth - barGap, barHeight);
                                ctx.shadowBlur = 0;
                            }
                        }

                        ctx.restore();
                    }
                }
            }
        },

        install(context) {
            context.log('Visualizer plugin installed');
        },

        uninstall() {
            analyser = null;
            dataArray = null;
            console.log('[MediaFox:demo-visualizer] Visualizer plugin uninstalled');
        }
    };
};

// Refs
const canvasRef = ref<HTMLCanvasElement>();
const playerContainer = ref<HTMLElement>();
const progressRef = ref<HTMLElement>();
const hiddenFileInput = ref<HTMLInputElement>();
const subtitleContainer = ref<HTMLElement>();

// Player instance
const player = ref<MediaFox>();
const lastLoadedFile = ref<File | null>(null);

// State
const loading = ref(false);
const ready = ref(false);
const playing = ref(false);
const buffering = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const volume = ref(1);
const muted = ref(false);
const playbackRate = ref(1);
const mediaInfo = ref<MediaInfo | null>(null);
const playerState = ref("idle");
const bufferedRanges = ref<Array<{ start: number; end: number }>>([]);
const videoTracks = ref<VideoTrackInfo[]>([]);
const audioTracks = ref<AudioTrackInfo[]>([]);
const subtitleTracks = ref<SubtitleTrackInfo[]>([]);
const warningMessage = ref("");
const selectedSubtitleTrackId = ref<string | null>(null);
const currentRenderer = ref<RendererType>("webgpu");
const availableRenderers = ref<RendererType[]>([]);

// Playlist state
const playlist = ref<PlaylistItem[]>([]);
const playlistIndex = ref<number | null>(null);
const playlistMode = ref<PlaylistMode>(null);

// Plugin state
const watermarkEnabled = ref(true);
const bassBoostEnabled = ref(false);
const visualizerEnabled = ref(false);

const SUBTITLE_DEFINITIONS = {
    vtt: {
        id: "docs-sub-vtt",
        label: "English (VTT)",
        language: "eng",
        url: withBase("/subtitles/demo-en.vtt"),
    },
    srt: {
        id: "docs-sub-srt",
        label: "Español (SRT)",
        language: "spa",
        url: withBase("/subtitles/demo-es.srt"),
    },
} as const;

// UI state
const showingControls = ref(true);
const controlsTimeout = ref<number>();
const tooltipVisible = ref(false);
const tooltipPosition = ref(0);
const tooltipTime = ref(0);

// Computed
const progressPercent = computed(() => {
    if (duration.value === 0) return 0;
    return (currentTime.value / duration.value) * 100;
});

const videoTrackInfo = computed(() => {
    if (!player.value) return "";
    const tracks = player.value.getVideoTracks();
    if (tracks.length === 0) return "None";
    const track = tracks.find((t) => t.selected) || tracks[0];
    return `${track.width}x${track.height} @ ${track.frameRate?.toFixed(0) || "?"}fps`;
});

const audioTrackInfo = computed(() => {
    if (!player.value) return "";
    const tracks = player.value.getAudioTracks();
    if (tracks.length === 0) return "None";
    const track = tracks.find((t) => t.selected) || tracks[0];
    return `${track.channels}ch ${track.sampleRate}Hz`;
});

const formatTime = (seconds: number): string => {
    return formatTimeUtil(seconds);
};

const rendererDisplayName = computed(() => {
    return RendererFactory.getRendererDisplayName(currentRenderer.value);
});

const selectedVideoTrackId = computed(() => {
    return videoTracks.value.find((t) => t.selected)?.id || "";
});

const selectedAudioTrackId = computed(() => {
    return audioTracks.value.find((t) => t.selected)?.id || "";
});

const selectedVideoTrack = computed(() => {
    return videoTracks.value.find((t) => t.id === selectedVideoTrackId.value);
});

const selectedAudioTrack = computed(() => {
    return audioTracks.value.find((t) => t.id === selectedAudioTrackId.value);
});

const selectedSubtitleTrack = computed(() => {
    if (!selectedSubtitleTrackId.value) return null;
    return subtitleTracks.value.find(
        (t) => t.id === selectedSubtitleTrackId.value,
    );
});

// Playlist computed
const hasPlaylist = computed(() => playlist.value.length > 0);

const playlistModeDisplay = computed(() => {
    switch (playlistMode.value) {
        case 'sequential': return 'Sequential';
        case 'repeat': return 'Repeat All';
        case 'repeat-one': return 'Repeat One';
        case 'manual': return 'Manual';
        default: return 'Off';
    }
});

const canGoPrev = computed(() => {
    return playlistIndex.value !== null && playlistIndex.value > 0;
});

const canGoNext = computed(() => {
    return playlistIndex.value !== null &&
           playlistIndex.value < playlist.value.length - 1;
});

const prevItem = computed(() => {
    if (playlistIndex.value === null || playlistIndex.value <= 0) return null;
    return playlist.value[playlistIndex.value - 1];
});

const nextItem = computed(() => {
    if (playlistIndex.value === null ||
        playlistIndex.value >= playlist.value.length - 1) return null;
    return playlist.value[playlistIndex.value + 1];
});

// Methods
const loadSample = async () => {
    if (!player.value) return;

    loading.value = true;
    try {
        const sampleUrl =
            "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

        await player.value.load(sampleUrl);
        ready.value = true;

        // Update track info
        videoTracks.value = player.value.getVideoTracks();
        audioTracks.value = player.value.getAudioTracks();
        subtitleTracks.value = player.value.getSubtitleTracks();
        selectedSubtitleTrackId.value =
            player.value.getState().selectedSubtitleTrack ?? null;
    } catch (error) {
        console.error("Failed to load sample video:", error);
        alert("Failed to load sample video. Please try a local file.");
    } finally {
        loading.value = false;
    }
};

const loadSamplePlaylist = async () => {
    if (!player.value) return;

    loading.value = true;
    try {
        // Sample playlist with different videos
        const samplePlaylist = [
            {
                mediaSource: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
                title: "Big Buck Bunny",
            },
            {
                mediaSource: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
                title: "Elephants Dream",
            },
            {
                mediaSource: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
                title: "For Bigger Blazes",
            },
        ];

        await player.value.loadPlaylist(samplePlaylist);
        player.value.playlistMode = 'sequential';
        ready.value = true;

        // Update track info
        videoTracks.value = player.value.getVideoTracks();
        audioTracks.value = player.value.getAudioTracks();
        subtitleTracks.value = player.value.getSubtitleTracks();
        selectedSubtitleTrackId.value =
            player.value.getState().selectedSubtitleTrack ?? null;
    } catch (error) {
        console.error("Failed to load sample playlist:", error);
        alert("Failed to load sample playlist. Please try a local file.");
    } finally {
        loading.value = false;
    }
};

const handleFileSelect = async (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file || !player.value) return;

    lastLoadedFile.value = file;
    loading.value = true;
    let fallbackUsed = false;
    let loadError: Error | null = null;

    try {
        await player.value.load(file);
        ready.value = true;

        // Update track info
        videoTracks.value = player.value.getVideoTracks();
        audioTracks.value = player.value.getAudioTracks();
        subtitleTracks.value = player.value.getSubtitleTracks();
        selectedSubtitleTrackId.value =
            player.value.getState().selectedSubtitleTrack ?? null;
    } catch (error) {
        console.error("Failed to load file:", error);
        loadError = error as Error;
    }

    loading.value = false;
};

const openFileDialog = () => {
    hiddenFileInput.value?.click();
};

const play = async () => {
    if (!player.value || !ready.value) return;
    await player.value.play();
};

const pause = () => {
    if (!player.value) return;
    player.value.pause();
};

const togglePlay = async () => {
    if (playing.value) {
        pause();
    } else {
        await play();
    }
};

const stop = () => {
    if (!player.value) return;
    player.value.stop();
    ready.value = false;
    mediaInfo.value = null;
    subtitleTracks.value = player.value.getSubtitleTracks();
    selectedSubtitleTrackId.value =
        player.value.getState().selectedSubtitleTrack ?? null;
};

const skipBackward = () => {
    if (!player.value) return;
    player.value.currentTime = Math.max(0, currentTime.value - 10);
};

const skipForward = () => {
    if (!player.value) return;
    player.value.currentTime = Math.min(duration.value, currentTime.value + 10);
};

const toggleMute = () => {
    if (!player.value) return;
    player.value.muted = !player.value.muted;
};

const updateVolume = () => {
    if (!player.value) return;
    player.value.volume = volume.value;
};

const updatePlaybackRate = () => {
    if (!player.value) return;
    player.value.playbackRate = playbackRate.value;
};

const handleSeek = (event: MouseEvent) => {
    if (!player.value || !ready.value) return;

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const percent = (event.clientX - rect.left) / rect.width;
    const time = percent * duration.value;
    player.value.currentTime = time;
};

const updateTooltip = (event: MouseEvent) => {
    if (!progressRef.value || duration.value === 0) return;

    const rect = progressRef.value.getBoundingClientRect();
    const percent = (event.clientX - rect.left) / rect.width;
    tooltipPosition.value = Math.max(0, Math.min(100, percent * 100));
    tooltipTime.value = percent * duration.value;
    tooltipVisible.value = true;
};

const hideTooltip = () => {
    tooltipVisible.value = false;
};

// Playlist methods
const playlistNext = async () => {
    if (!player.value) return;
    try {
        await player.value.next();
    } catch (error) {
        console.error('Failed to go to next item:', error);
    }
};

const playlistPrev = async () => {
    if (!player.value) return;
    try {
        await player.value.prev();
    } catch (error) {
        console.error('Failed to go to previous item:', error);
    }
};

const jumpToPlaylistItem = async (index: number) => {
    if (!player.value) return;
    try {
        await player.value.jumpTo(index);
    } catch (error) {
        console.error('Failed to jump to playlist item:', error);
    }
};

const cyclePlaylistMode = () => {
    if (!player.value) return;
    const modes: PlaylistMode[] = ['sequential', 'repeat', 'repeat-one', 'manual', null];
    const currentIndex = modes.indexOf(playlistMode.value);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    player.value.playlistMode = nextMode;
};

const removePlaylistItem = async (index: number) => {
    if (!player.value) return;
    try {
        await player.value.removeFromPlaylist(index);
        // If playlist is now empty, reset ready state
        if (player.value.playlist.length === 0) {
            ready.value = false;
        }
    } catch (error) {
        console.error('Failed to remove playlist item:', error);
    }
};

const clearPlaylistFn = () => {
    if (!player.value) return;
    player.value.clearPlaylist();
    ready.value = false;
};

// Plugin methods
const toggleWatermark = async () => {
    if (!player.value) return;

    if (watermarkEnabled.value) {
        // Uninstall watermark plugin
        try {
            await player.value.unuse('demo-watermark');
            watermarkEnabled.value = false;
        } catch (e) {
            console.warn('Watermark plugin not installed');
        }
    } else {
        // Install watermark plugin
        const watermarkPlugin = createWatermarkPlugin({
            text: '© MediaFox Demo',
            position: 'bottom-right',
            opacity: 0.6
        });
        await player.value.use(watermarkPlugin);
        watermarkEnabled.value = true;
    }
};

const toggleBassBoost = async () => {
    if (!player.value) return;

    if (bassBoostEnabled.value) {
        // Uninstall bass boost plugin
        try {
            await player.value.unuse('demo-bass-boost');
            bassBoostEnabled.value = false;
        } catch (e) {
            console.warn('Bass boost plugin not installed');
        }
    } else {
        // Install bass boost plugin
        const bassBoostPlugin = createBassBoostPlugin({
            gain: 15
        });
        await player.value.use(bassBoostPlugin);
        bassBoostEnabled.value = true;
    }
};

const toggleVisualizer = async () => {
    if (!player.value) return;

    if (visualizerEnabled.value) {
        // Uninstall visualizer plugin
        try {
            await player.value.unuse('demo-visualizer');
            visualizerEnabled.value = false;
        } catch (e) {
            console.warn('Visualizer plugin not installed');
        }
    } else {
        // Install visualizer plugin
        const visualizerPlugin = createVisualizerPlugin();
        await player.value.use(visualizerPlugin);
        visualizerEnabled.value = true;
    }
};

const takeScreenshot = async () => {
    if (!player.value) return;

    const blob = await player.value.screenshot({ format: "png" });
    if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `screenshot-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
    }
};

const toggleFullscreen = async () => {
    if (!playerContainer.value) return;

    if (document.fullscreenElement) {
        await document.exitFullscreen();
    } else {
        await playerContainer.value.requestFullscreen();
    }
};

const selectVideoTrack = async (event: Event) => {
    const trackId = (event.target as HTMLSelectElement).value;
    await player.value?.selectVideoTrack(trackId);
    videoTracks.value = player.value?.getVideoTracks() || [];
};

const selectAudioTrack = async (event: Event) => {
    const trackId = (event.target as HTMLSelectElement).value;
    try {
        await player.value?.selectAudioTrack(trackId);
        audioTracks.value = player.value?.getAudioTracks() || [];
    } catch (error) {
        console.error("Failed to switch audio track:", error);
    }
};

const selectSubtitleTrack = async (event: Event) => {
    const trackId = (event.target as HTMLSelectElement).value;
    await player.value?.selectSubtitleTrack(trackId || null);
    subtitleTracks.value = player.value?.getSubtitleTracks() || [];
    selectedSubtitleTrackId.value = trackId || null;
};

const switchRenderer = async (event: Event) => {
    const type = (event.target as HTMLSelectElement).value as RendererType;
    if (!player.value) return;
    try {
        await player.value.switchRenderer(type);

        // Update canvas reference after recreation
        const newCanvas = document.querySelector("canvas");
        if (newCanvas instanceof HTMLCanvasElement) {
            canvasRef.value = newCanvas;
        }
    } catch (error) {
        console.error("Failed to switch renderer:", error);
        // Show user-friendly error message
        warningMessage.value = `Failed to switch to ${RendererFactory.getRendererDisplayName(type)} renderer`;
        setTimeout(() => {
            warningMessage.value = "";
        }, 5000);
    }
};

const showControlsTemporarily = () => {
    showingControls.value = true;
    clearTimeout(controlsTimeout.value);

    if (playing.value) {
        controlsTimeout.value = window.setTimeout(() => {
            showingControls.value = false;
        }, 3000);
    }
};

const hideControlsOnLeave = () => {
    if (playing.value) {
        controlsTimeout.value = window.setTimeout(() => {
            showingControls.value = false;
        }, 1000);
    }
};

// Lifecycle
onMounted(async () => {
    if (!canvasRef.value) return;

    // Create player
    const p = new MediaFox({
        renderTarget: canvasRef.value,
        volume: volume.value,
        autoplay: false,
        // Will default to webgpu with fallbacks
    });

    player.value = p;

    // Install watermark plugin by default
    const watermarkPlugin = createWatermarkPlugin({
        text: '© MediaFox Demo',
        position: 'bottom-right',
        opacity: 0.6
    });
    await p.use(watermarkPlugin);

    subtitleTracks.value = p.getSubtitleTracks();
    selectedSubtitleTrackId.value = p.getState().selectedSubtitleTrack ?? null;

    // Get available renderers
    availableRenderers.value = MediaFox.getSupportedRenderers();
    // Initialize with the current state
    currentRenderer.value = p.getState().rendererType || "webgpu";

    // Subscribe to state changes
    const { unsubscribe } = p.subscribe((state) => {
        playing.value = state.playing;
        currentTime.value = state.currentTime;
        duration.value = state.duration;
        volume.value = state.volume;
        muted.value = state.muted;
        playerState.value = state.state;
        buffering.value = state.waiting || state.seeking;
        bufferedRanges.value = state.buffered;
        subtitleTracks.value = state.subtitleTracks;
        selectedSubtitleTrackId.value = state.selectedSubtitleTrack;
        currentRenderer.value = state.rendererType || "webgpu";
        
        // Playlist state
        playlist.value = state.playlist;
        playlistIndex.value = state.currentPlaylistIndex;
        playlistMode.value = state.playlistMode;
    });

    // Event listeners
    p.on("loadedmetadata", (info) => {
        mediaInfo.value = info;
    });

    p.on("error", (error) => {
        console.error("Player error:", error);
        alert(`Player error: ${error.message}`);
    });

    p.on("warning", (warning) => {
        warningMessage.value = warning.message;

        // Clear warning after 5 seconds
        setTimeout(() => {
            warningMessage.value = "";
        }, 5000);
    });

    p.on("rendererchange", (type) => {
        currentRenderer.value = type;
    });

    p.on("rendererfallback", ({ from, to }) => {
        warningMessage.value = `Renderer fallback: ${RendererFactory.getRendererDisplayName(from)} → ${RendererFactory.getRendererDisplayName(to)}`;
        setTimeout(() => {
            warningMessage.value = "";
        }, 5000);
    });

    // Keyboard shortcuts
    const handleKeydown = (e: KeyboardEvent) => {
        if (!player.value || !ready.value) return;

        switch (e.key) {
            case " ":
                e.preventDefault();
                togglePlay();
                break;
            case "ArrowLeft":
                player.value.currentTime = Math.max(0, currentTime.value - 5);
                break;
            case "ArrowRight":
                player.value.currentTime = Math.min(
                    duration.value,
                    currentTime.value + 5,
                );
                break;
            case "ArrowUp":
                e.preventDefault();
                player.value.volume = Math.min(1, volume.value + 0.1);
                break;
            case "ArrowDown":
                e.preventDefault();
                player.value.volume = Math.max(0, volume.value - 0.1);
                break;
            case "m":
            case "M":
                toggleMute();
                break;
            case "f":
            case "F":
                toggleFullscreen();
                break;
            case "n":
            case "N":
                if (hasPlaylist.value) {
                    playlistNext();
                }
                break;
            case "p":
            case "P":
                if (hasPlaylist.value) {
                    playlistPrev();
                }
                break;
        }
    };

    document.addEventListener("keydown", handleKeydown);

    // Store cleanup
    (window as Window & { __playerCleanup?: () => void }).__playerCleanup =
        () => {
            unsubscribe();
            document.removeEventListener("keydown", handleKeydown);
        };
});

onUnmounted(() => {
    const globalWindow = window as Window & { __playerCleanup?: () => void };
    if (globalWindow.__playerCleanup) {
        globalWindow.__playerCleanup();
        delete globalWindow.__playerCleanup;
    }

    clearTimeout(controlsTimeout.value);
    player.value?.dispose();
});
</script>

<style scoped>
.video-player-demo {
    margin: 2rem 0;
}

.player-container {
    position: relative;
    background: #000;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
}

.video-canvas {
    width: 100%;
    height: 100%;
    display: block;
    cursor: pointer;
}

.subtitle-layer {
    position: absolute;
    inset: 0;
    pointer-events: none;
}

/* Corner controls */
.corner-controls {
    position: absolute;
    top: 1rem;
    left: 1rem;
    z-index: 10;
}

.corner-btn {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: white;
    cursor: pointer;
    border-radius: 6px;
    transition: all 0.2s;
}

.corner-btn:hover {
    background: rgba(0, 0, 0, 0.8);
    border-color: rgba(255, 255, 255, 0.4);
}

/* Warning message */
.warning-message {
    position: absolute;
    top: 1rem;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(255, 152, 0, 0.9);
    color: white;
    padding: 0.75rem 1.5rem;
    border-radius: 6px;
    font-size: 14px;
    z-index: 20;
    max-width: 80%;
    text-align: center;
}

/* Empty state */
.empty-state {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #1a1a1a, #2d2d2d);
}

.empty-content {
    text-align: center;
    color: white;
}

.empty-content h3 {
    margin: 1rem 0 2rem;
    font-size: 1.2rem;
    opacity: 0.8;
}

.empty-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
}

.empty-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: white;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
}

.empty-btn.primary {
    background: var(--vp-c-brand);
    border-color: var(--vp-c-brand);
}

.empty-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.4);
}

.empty-btn.primary:hover {
    background: var(--vp-c-brand-darker);
    border-color: var(--vp-c-brand-darker);
}

/* Overlays */
.loading-overlay,
.buffering-overlay {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    color: white;
    pointer-events: none;
}

.spinner {
    width: 48px;
    height: 48px;
    border: 3px solid rgba(255, 255, 255, 0.2);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

.spinner.small {
    width: 32px;
    height: 32px;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

.center-play {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 80px;
    height: 80px;
    background: rgba(0, 0, 0, 0.7);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.2s;
    color: white;
}

.center-play:hover {
    background: rgba(0, 0, 0, 0.9);
}

/* Controls */
.controls-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.9));
    padding: 2rem 1rem 1rem;
    transition: opacity 0.3s;
}

.progress-section {
    margin-bottom: 0.75rem;
}

.progress-container {
    position: relative;
    height: 4px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 2px;
    cursor: pointer;
    margin-bottom: 0.5rem;
    transition: height 0.1s;
}

.progress-container:hover {
    height: 6px;
}

.buffered-range {
    position: absolute;
    top: 0;
    height: 100%;
    background: rgba(255, 255, 255, 0.4);
    border-radius: 2px;
}

.progress-bar {
    position: relative;
    height: 100%;
    background: var(--vp-c-brand);
    border-radius: 2px;
    transition: width 0.1s;
}

.progress-handle {
    position: absolute;
    right: -6px;
    top: 50%;
    transform: translateY(-50%);
    width: 12px;
    height: 12px;
    background: white;
    border-radius: 50%;
    opacity: 0;
    transition: opacity 0.1s;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.progress-container:hover .progress-handle {
    opacity: 1;
}

.progress-tooltip {
    position: absolute;
    top: -30px;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    pointer-events: none;
    white-space: nowrap;
}

.time-display {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: white;
    font-size: 13px;
    font-variant-numeric: tabular-nums;
}

.time-separator {
    opacity: 0.5;
}

.controls-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.controls-left,
.controls-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.control-btn {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: white;
    cursor: pointer;
    border-radius: 6px;
    transition: background 0.2s;
}

.control-btn:hover {
    background: rgba(255, 255, 255, 0.1);
}

.control-btn.primary {
    width: 40px;
    height: 40px;
    background: rgba(255, 255, 255, 0.1);
}

.control-btn.primary:hover {
    background: rgba(255, 255, 255, 0.2);
}

.control-btn.active {
    color: var(--vp-c-brand);
}

/* Volume */
.volume-group {
    display: flex;
    align-items: center;
    gap: 0.25rem;
}

.volume-slider-container {
    width: 0;
    overflow: hidden;
    transition: width 0.3s;
}

.volume-group:hover .volume-slider-container {
    width: 80px;
}

.volume-slider {
    width: 80px;
    height: 4px;
    -webkit-appearance: none;
    appearance: none;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 2px;
    outline: none;
}

.volume-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 12px;
    height: 12px;
    background: white;
    border-radius: 50%;
    cursor: pointer;
}

/* Track controls */
.track-controls {
    display: flex;
    gap: 0.5rem;
}

.track-dropdown,
.renderer-dropdown {
    position: relative;
    display: inline-block;
}

.track-btn {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    background: rgba(0, 0, 0, 0.6);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.2);
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 12px;
    cursor: pointer;
    outline: none;
    transition: all 0.2s;
    pointer-events: none;
}

.track-dropdown:hover .track-btn,
.renderer-dropdown:hover .track-btn {
    background: rgba(0, 0, 0, 0.8);
    border-color: rgba(255, 255, 255, 0.4);
}

.track-select {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
    font-size: 12px;
}

.track-select:hover + .track-btn {
    background: rgba(0, 0, 0, 0.8);
}

/* Speed selector */
.speed-select {
    background: transparent;
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.2);
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 13px;
    cursor: pointer;
    outline: none;
}

.speed-select:hover {
    background: rgba(255, 255, 255, 0.1);
}

/* Bottom panels */
.bottom-panels {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    margin-top: 1.5rem;
}

.info-panel,
.shortcuts-panel {
    background: var(--vp-c-bg-soft);
    border-radius: 8px;
    padding: 1.5rem;
}

.info-panel h3,
.shortcuts-panel h3 {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 1rem;
    color: var(--vp-c-text-1);
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.info-grid {
    display: grid;
    gap: 0.75rem;
}

.info-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
}

.info-label {
    font-size: 13px;
    color: var(--vp-c-text-2);
}

.info-value {
    font-size: 13px;
    color: var(--vp-c-text-1);
    font-weight: 500;
}

.shortcuts-grid {
    display: grid;
    gap: 0.5rem;
}

.shortcut {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 13px;
}

.shortcut kbd {
    padding: 2px 6px;
    background: var(--vp-c-bg);
    border: 1px solid var(--vp-c-divider);
    border-radius: 4px;
    font-size: 11px;
    font-family: monospace;
    min-width: 36px;
    text-align: center;
}

.shortcut span {
    color: var(--vp-c-text-2);
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
    transition:
        transform 0.3s,
        opacity 0.3s;
}

.slide-up-enter-from,
.slide-up-leave-to {
    transform: translateY(20px);
    opacity: 0;
}

/* Playlist panel */
.playlist-panel {
    background: var(--vp-c-bg-soft);
    border-radius: 8px;
    padding: 1.5rem;
    grid-column: 1 / -1;
}

.playlist-panel h3 {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 1rem;
    color: var(--vp-c-text-1);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.playlist-mode-badge {
    font-size: 11px;
    background: var(--vp-c-brand);
    color: white;
    padding: 2px 8px;
    border-radius: 12px;
    text-transform: none;
    font-weight: 500;
}

.playlist-items {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1rem;
    max-height: 200px;
    overflow-y: auto;
}

.playlist-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    background: var(--vp-c-bg);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    border: 1px solid transparent;
}

.playlist-item:hover {
    background: var(--vp-c-bg-alt);
    border-color: var(--vp-c-divider);
}

.playlist-item.active {
    background: var(--vp-c-brand-soft);
    border-color: var(--vp-c-brand);
}

.playlist-item-index {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: var(--vp-c-bg-soft);
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
    color: var(--vp-c-text-2);
    flex-shrink: 0;
}

.playlist-item.active .playlist-item-index {
    background: var(--vp-c-brand);
    color: white;
}

.playlist-item-info {
    flex: 1;
    min-width: 0;
}

.playlist-item-title {
    font-size: 13px;
    font-weight: 500;
    color: var(--vp-c-text-1);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.playlist-item-time {
    font-size: 11px;
    color: var(--vp-c-text-2);
    margin-top: 2px;
}

.saved-position {
    color: var(--vp-c-brand);
}

.playlist-item-playing {
    display: flex;
    align-items: center;
    color: var(--vp-c-brand);
    flex-shrink: 0;
}

.playlist-item-remove {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    background: transparent;
    border: none;
    color: var(--vp-c-text-3);
    cursor: pointer;
    border-radius: 4px;
    opacity: 0;
    transition: all 0.2s;
    flex-shrink: 0;
}

.playlist-item:hover .playlist-item-remove {
    opacity: 1;
}

.playlist-item-remove:hover {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
}

.playlist-controls {
    display: flex;
    gap: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid var(--vp-c-divider);
}

.playlist-mode-btn,
.playlist-clear-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 6px 12px;
    background: var(--vp-c-bg);
    border: 1px solid var(--vp-c-divider);
    color: var(--vp-c-text-1);
    border-radius: 6px;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
}

.playlist-mode-btn:hover,
.playlist-clear-btn:hover {
    background: var(--vp-c-bg-alt);
    border-color: var(--vp-c-brand);
}

.playlist-clear-btn {
    margin-left: auto;
}

.control-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

.control-btn:disabled:hover {
    background: transparent;
}

/* Responsive */
@media (max-width: 768px) {
    .bottom-panels {
        grid-template-columns: 1fr;
    }

    .controls-overlay {
        padding: 1rem 0.75rem 0.75rem;
    }

    .control-btn {
        width: 32px;
        height: 32px;
    }

    .control-btn.primary {
        width: 36px;
        height: 36px;
    }

    .track-controls {
        flex-direction: column;
        gap: 0.25rem;
    }

    .track-btn {
        font-size: 11px;
        padding: 4px 8px;
    }
}
</style>
