<template>
    <div class="editor" :class="{ fullscreen: isFullscreen }">
        <!-- Toolbar -->
        <div class="toolbar">
            <div class="toolbar-left">
                <button @click="loadSampleVideo" class="tool-btn" :disabled="loading">
                    {{ loading ? 'Loading...' : '+ Add Sample' }}
                </button>
                <button @click="openFileDialog" class="tool-btn" :disabled="loading">
                    Import
                </button>
                <input type="file" ref="fileInput" @change="handleFileSelect" hidden />
            </div>
            <div class="toolbar-center">
                <button @click="skipToStart" class="transport-btn" title="Go to start">|◀</button>
                <button @click="togglePlay" class="transport-btn play">
                    {{ playing ? '❚❚' : '▶' }}
                </button>
                <button @click="skipToEnd" class="transport-btn" title="Go to end">▶|</button>
                <span class="timecode">{{ formatTimecode(currentTime) }}</span>
            </div>
            <div class="toolbar-right">
                <button @click="toggleMute" class="transport-btn" :title="muted ? 'Unmute' : 'Mute'">
                    {{ muted ? '🔇' : '🔊' }}
                </button>
                <input
                    type="range"
                    v-model.number="masterVolume"
                    min="0"
                    max="1"
                    step="0.05"
                    @input="updateVolume"
                    class="volume-slider"
                    title="Master Volume"
                />
                <select v-model="currentFitMode" @change="changeFitMode" class="fit-select" title="Video Fit Mode">
                    <option value="fill">Fill (Stretch)</option>
                    <option value="contain">Contain (Fit)</option>
                    <option value="cover">Cover (Zoom)</option>
                </select>
                <select v-model="currentAspect" @change="changeAspect(currentAspect)" class="aspect-select">
                    <option v-for="a in ASPECT_RATIOS" :key="a.label" :value="a.label">{{ a.label }}</option>
                </select>
                <button @click="toggleFullscreen" class="tool-btn">
                    {{ isFullscreen ? 'Exit' : 'Fullscreen' }}
                </button>
            </div>
        </div>

        <!-- Main Area -->
        <div class="main">
            <div class="preview">
                <canvas ref="canvasRef"></canvas>
                <div v-if="clips.length === 0 && !loading" class="preview-empty">
                    Click "Add Sample" to load a video
                </div>
                <div v-if="loading" class="preview-empty">Loading video...</div>
            </div>

            <!-- Inspector -->
            <div class="inspector" v-if="selectedClip">
                <div class="inspector-header">Clip: {{ selectedClip.name }}</div>
                <div class="inspector-section">
                    <div class="inspector-row">
                        <label>Start</label>
                        <input type="number" v-model.number="selectedClip.startTime" min="0" step="0.1" @change="updatePreview" />
                    </div>
                    <div class="inspector-row">
                        <label>Duration</label>
                        <input type="number" v-model.number="selectedClip.duration" min="0.1" step="0.1" @change="updatePreview" />
                    </div>
                    <div class="inspector-row">
                        <label>Volume</label>
                        <input type="range" v-model.number="selectedClip.volume" min="0" max="1" step="0.05" @input="updatePreview" />
                        <span>{{ Math.round(selectedClip.volume * 100) }}%</span>
                    </div>
                    <div class="inspector-row" v-if="selectedClip.type !== 'audio'">
                        <label>Opacity</label>
                        <input type="range" v-model.number="selectedClip.opacity" min="0" max="1" step="0.05" @input="updatePreview" />
                        <span>{{ Math.round(selectedClip.opacity * 100) }}%</span>
                    </div>
                    <template v-if="selectedClip.type !== 'audio'">
                        <div class="inspector-row">
                            <label>Scale</label>
                            <input type="range" v-model.number="selectedClip.scale" min="0.1" max="2" step="0.05" @input="updatePreview" />
                            <span>{{ Math.round(selectedClip.scale * 100) }}%</span>
                        </div>
                        <div class="inspector-row">
                            <label>Rotation</label>
                            <input type="range" v-model.number="selectedClip.rotation" min="-180" max="180" step="1" @input="updatePreview" />
                            <span>{{ selectedClip.rotation }}°</span>
                        </div>
                        <div class="inspector-row">
                            <label>X</label>
                            <input type="number" v-model.number="selectedClip.x" step="10" @change="updatePreview" />
                        </div>
                        <div class="inspector-row">
                            <label>Y</label>
                            <input type="number" v-model.number="selectedClip.y" step="10" @change="updatePreview" />
                        </div>
                        <button @click="resetTransform" class="reset-btn">Reset Transform</button>
                    </template>
                    <button @click="deleteSelectedClip" class="delete-btn">Delete Clip</button>
                </div>
            </div>
        </div>

        <!-- Timeline -->
        <div class="timeline-wrapper">
            <div class="timeline-header">
                <div class="track-label-header"></div>
                <div class="ruler" @mousedown="onRulerMouseDown">
                    <div
                        v-for="t in Math.ceil(duration) + 5"
                        :key="t"
                        class="ruler-mark"
                        :style="{ left: (t - 1) * PX_PER_SEC + 'px' }"
                    >
                        {{ t - 1 }}s
                    </div>
                </div>
            </div>
            <div class="timeline" ref="timelineRef" @mousedown="onTimelineMouseDown">
                <!-- Video Tracks -->
                <div v-for="trackIdx in 3" :key="'v' + trackIdx" class="track video-track">
                    <div class="track-label">V{{ trackIdx }}</div>
                    <div class="track-content">
                        <div
                            v-for="clip in getClipsOnTrack(trackIdx - 1)"
                            :key="clip.id"
                            class="clip video-clip"
                            :class="{ selected: selectedClipId === clip.id }"
                            :style="{
                                left: clip.startTime * PX_PER_SEC + 'px',
                                width: clip.duration * PX_PER_SEC + 'px'
                            }"
                            @mousedown.stop="onClipMouseDown($event, clip)"
                            @contextmenu.prevent="onClipRightClick($event, clip)"
                        >
                            <div class="clip-trim-left" @mousedown.stop="onTrimMouseDown($event, clip, 'left')"></div>
                            <div class="clip-body">{{ clip.name }}</div>
                            <div class="clip-trim-right" @mousedown.stop="onTrimMouseDown($event, clip, 'right')"></div>
                        </div>
                    </div>
                </div>
                <!-- Audio Tracks -->
                <div v-for="trackIdx in 2" :key="'a' + trackIdx" class="track audio-track">
                    <div class="track-label audio-label">A{{ trackIdx }}</div>
                    <div class="track-content">
                        <div
                            v-for="clip in getClipsOnTrack(trackIdx + 2)"
                            :key="clip.id"
                            class="clip audio-clip"
                            :class="{ selected: selectedClipId === clip.id }"
                            :style="{
                                left: clip.startTime * PX_PER_SEC + 'px',
                                width: clip.duration * PX_PER_SEC + 'px'
                            }"
                            @mousedown.stop="onClipMouseDown($event, clip)"
                            @contextmenu.prevent="onClipRightClick($event, clip)"
                        >
                            <div class="clip-trim-left" @mousedown.stop="onTrimMouseDown($event, clip, 'left')"></div>
                            <div class="clip-body">🎵 {{ clip.name }}</div>
                            <div class="clip-trim-right" @mousedown.stop="onTrimMouseDown($event, clip, 'right')"></div>
                        </div>
                    </div>
                </div>
                <div class="playhead" :style="{ left: currentTime * PX_PER_SEC + 48 + 'px' }"></div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { Compositor, type CompositorSource } from '@mediafox/core';
import CompositorWorkerUrl from '@mediafox/core/compositor-worker?worker&url';
import { computed, onMounted, onUnmounted, ref } from 'vue';

interface ClipData {
  id: string;
  name: string;
  source: CompositorSource;
  type: 'video' | 'image' | 'audio';
  track: number;
  startTime: number;
  duration: number;
  sourceDuration: number;
  sourceOffset: number;
  volume: number;
  opacity: number;
  scale: number;
  rotation: number;
  x: number;
  y: number;
}

const PX_PER_SEC = 60;

const ASPECT_RATIOS = [
  { label: '16:9', w: 1920, h: 1080 },
  { label: '9:16', w: 1080, h: 1920 },
  { label: '4:3', w: 1280, h: 960 },
  { label: '1:1', w: 1080, h: 1080 },
  { label: '21:9', w: 1280, h: 548 },
];

const canvasRef = ref<HTMLCanvasElement>();
const canvasWidth = ref(1920);
const canvasHeight = ref(1080);
const currentAspect = ref('16:9');
const currentFitMode = ref<'contain' | 'cover' | 'fill'>('contain');
const timelineRef = ref<HTMLElement>();
const fileInput = ref<HTMLInputElement>();

const compositor = ref<Compositor>();
const isFullscreen = ref(false);
const loading = ref(false);
const playing = ref(false);
const currentTime = ref(0);
const masterVolume = ref(1);
const muted = ref(false);

const clips = ref<ClipData[]>([]);
const selectedClipId = ref<string | null>(null);

let clipIdCounter = 0;
let playheadRAF: number | null = null;

const duration = computed(() => {
  if (clips.value.length === 0) return 10;
  return Math.max(...clips.value.map((c) => c.startTime + c.duration), 10);
});

const selectedClip = computed(() => clips.value.find((c) => c.id === selectedClipId.value) || null);

const getClipsOnTrack = (track: number) => clips.value.filter((c) => c.track === track);

const formatTimecode = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.floor((s % 1) * 100);
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
};

// Composition callback for the compositor
const getComposition = (time: number) => {
  const activeClips = clips.value.filter((c) => time >= c.startTime && time < c.startTime + c.duration);

  // Video/image layers (tracks 0-2)
  const videoClips = activeClips.filter((c) => c.type !== 'audio').sort((a, b) => b.track - a.track);

  const layers = videoClips.map((clip, i) => {
    const localTime = time - clip.startTime + clip.sourceOffset;
    const srcTime = clip.sourceDuration > 0 ? localTime % clip.sourceDuration : 0;
    return {
      source: clip.source,
      sourceTime: Math.max(0, srcTime),
      transform: {
        x: clip.x,
        y: clip.y,
        scaleX: clip.scale,
        scaleY: clip.scale,
        opacity: clip.opacity,
        rotation: clip.rotation,
      },
      zIndex: i,
    };
  });

  // Audio layers - include audio from video clips and audio-only clips
  const audio = activeClips
    .filter((c) => c.volume > 0)
    .map((clip) => {
      const localTime = time - clip.startTime + clip.sourceOffset;
      const srcTime = clip.sourceDuration > 0 ? localTime % clip.sourceDuration : 0;
      return {
        source: clip.source,
        sourceTime: Math.max(0, srcTime),
        volume: clip.volume,
        muted: clip.volume === 0,
      };
    });

  return { time, layers, audio };
};

// Change aspect ratio
const changeAspect = (label: string) => {
  const aspect = ASPECT_RATIOS.find((a) => a.label === label);
  if (!aspect || !compositor.value) return;

  currentAspect.value = label;
  canvasWidth.value = aspect.w;
  canvasHeight.value = aspect.h;

  // Resize compositor without disposing sources
  const wasPlaying = compositor.value.playing;
  const time = compositor.value.currentTime;
  if (wasPlaying) compositor.value.pause();

  compositor.value.resize(aspect.w, aspect.h);

  // Restore state
  if (clips.value.length > 0) {
    updatePreview();
    compositor.value.seek(time);
    if (wasPlaying) compositor.value.play();
  }
};

// Change fit mode
const changeFitMode = () => {
  if (!compositor.value) return;
  compositor.value.setFitMode(currentFitMode.value);
  updatePreview();
};

// Update compositor preview config
const updatePreview = () => {
  if (!compositor.value) return;
  compositor.value.preview({
    duration: duration.value,
    loop: true,
    getComposition,
  });
  // Re-render current frame
  compositor.value.seek(currentTime.value);
};

// Loading
const loadSampleVideo = async () => {
  if (!compositor.value || loading.value) return;
  loading.value = true;
  try {
    const source = await compositor.value.loadSource(
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
    );
    const videoClipCount = clips.value.filter((c) => c.type !== 'audio').length;
    const track = videoClipCount % 3;
    const lastEnd = Math.max(0, ...getClipsOnTrack(track).map((c) => c.startTime + c.duration), 0);
    clips.value.push({
      id: `clip_${clipIdCounter++}`,
      name: 'Big Buck Bunny',
      source,
      type: 'video',
      track,
      startTime: lastEnd,
      duration: Math.min(source.duration, 10),
      sourceDuration: source.duration,
      sourceOffset: 0,
      volume: 1,
      opacity: 1,
      scale: 1,
      rotation: 0,
      x: 0,
      y: 0,
    });
    updatePreview();
  } catch (e) {
    console.error('Load failed:', e);
    alert('Failed to load video');
  } finally {
    loading.value = false;
  }
};

const openFileDialog = () => fileInput.value?.click();

const handleFileSelect = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file || !compositor.value) return;
  loading.value = true;
  try {
    const isImage = file.type.startsWith('image/');
    const isAudio = file.type.startsWith('audio/');

    let source: CompositorSource;
    let clipType: 'video' | 'image' | 'audio';
    let track: number;

    if (isAudio) {
      source = await compositor.value.loadAudio(file);
      clipType = 'audio';
      const audioClipCount = clips.value.filter((c) => c.type === 'audio').length;
      track = 3 + (audioClipCount % 2); // Audio tracks are 3 and 4
    } else if (isImage) {
      source = await compositor.value.loadImage(file);
      clipType = 'image';
      const videoClipCount = clips.value.filter((c) => c.type !== 'audio').length;
      track = videoClipCount % 3;
    } else {
      source = await compositor.value.loadSource(file);
      clipType = 'video';
      const videoClipCount = clips.value.filter((c) => c.type !== 'audio').length;
      track = videoClipCount % 3;
    }

    const dur = isImage ? 5 : source.duration;
    const lastEnd = Math.max(0, ...getClipsOnTrack(track).map((c) => c.startTime + c.duration), 0);
    clips.value.push({
      id: `clip_${clipIdCounter++}`,
      name: file.name.slice(0, 20),
      source,
      type: clipType,
      track,
      startTime: lastEnd,
      duration: Math.min(dur, 10),
      sourceDuration: dur,
      sourceOffset: 0,
      volume: 1,
      opacity: 1,
      scale: 1,
      rotation: 0,
      x: 0,
      y: 0,
    });
    updatePreview();
  } catch (e) {
    console.error('Load failed:', e);
    alert('Failed to load file');
  } finally {
    loading.value = false;
  }
};

const resetTransform = () => {
  const clip = selectedClip.value;
  if (!clip) return;
  clip.scale = 1;
  clip.opacity = 1;
  clip.rotation = 0;
  clip.x = 0;
  clip.y = 0;
  updatePreview();
};

const deleteSelectedClip = () => {
  if (!selectedClipId.value) return;
  const idx = clips.value.findIndex((c) => c.id === selectedClipId.value);
  if (idx !== -1) {
    clips.value.splice(idx, 1);
    selectedClipId.value = null;
    updatePreview();
  }
};

const deleteClip = (clip: ClipData) => {
  const idx = clips.value.findIndex((c) => c.id === clip.id);
  if (idx !== -1) {
    clips.value.splice(idx, 1);
    if (selectedClipId.value === clip.id) selectedClipId.value = null;
    updatePreview();
  }
};

const onClipRightClick = (e: MouseEvent, clip: ClipData) => {
  if (confirm(`Delete "${clip.name}"?`)) {
    deleteClip(clip);
  }
};

// Timeline interaction
let dragMode: 'move' | 'trim-left' | 'trim-right' | 'scrub' | null = null;
let dragClip: ClipData | null = null;
let dragStartX = 0;
let dragStartValue = 0;
let dragStartDuration = 0;
let dragStartOffset = 0;
let scrubRAF: number | null = null;
let scrubPendingTime: number | null = null;
let resumeAfterScrub = false;

const scheduleScrub = (time: number) => {
  currentTime.value = time;
  if (!compositor.value) return;
  scrubPendingTime = time;
  if (scrubRAF === null) {
    scrubRAF = requestAnimationFrame(() => {
      scrubRAF = null;
      const next = scrubPendingTime;
      scrubPendingTime = null;
      if (next !== null) void compositor.value?.seek(next);
    });
  }
};

const startScrub = (time: number) => {
  resumeAfterScrub = playing.value;
  if (resumeAfterScrub) compositor.value?.pause();
  dragMode = 'scrub';
  scheduleScrub(time);
};

const endScrub = () => {
  if (resumeAfterScrub) {
    compositor.value?.play();
    resumeAfterScrub = false;
  }
};

const onRulerMouseDown = (e: MouseEvent) => {
  const target = e.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const time = Math.max(0, x / PX_PER_SEC);
  selectedClipId.value = null;
  startScrub(time);

  const onMove = (ev: MouseEvent) => {
    const rx = ev.clientX - rect.left;
    const t = Math.max(0, Math.min(rx / PX_PER_SEC, duration.value));
    scheduleScrub(t);
  };
  const onUp = () => {
    endScrub();
    dragMode = null;
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  };
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
};

const onTimelineMouseDown = (e: MouseEvent) => {
  if (!timelineRef.value) return;
  const rect = timelineRef.value.getBoundingClientRect();
  const x = e.clientX - rect.left - 48;
  const time = Math.max(0, x / PX_PER_SEC);
  selectedClipId.value = null;
  startScrub(time);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
};

const onClipMouseDown = (e: MouseEvent, clip: ClipData) => {
  selectedClipId.value = clip.id;
  dragMode = 'move';
  dragClip = clip;
  dragStartX = e.clientX;
  dragStartValue = clip.startTime;
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
};

const onTrimMouseDown = (e: MouseEvent, clip: ClipData, side: 'left' | 'right') => {
  selectedClipId.value = clip.id;
  dragMode = side === 'left' ? 'trim-left' : 'trim-right';
  dragClip = clip;
  dragStartX = e.clientX;
  dragStartValue = clip.startTime;
  dragStartDuration = clip.duration;
  dragStartOffset = clip.sourceOffset;
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
};

const onMouseMove = (e: MouseEvent) => {
  const dx = e.clientX - dragStartX;
  const dt = dx / PX_PER_SEC;

  if (dragMode === 'scrub' && timelineRef.value) {
    const rect = timelineRef.value.getBoundingClientRect();
    const x = e.clientX - rect.left - 48;
    const time = Math.max(0, Math.min(x / PX_PER_SEC, duration.value));
    scheduleScrub(time);
  } else if (dragMode === 'move' && dragClip) {
    dragClip.startTime = Math.max(0, dragStartValue + dt);
    updatePreview();
  } else if (dragMode === 'trim-left' && dragClip) {
    const newStart = Math.max(0, dragStartValue + dt);
    const delta = newStart - dragStartValue;
    const newDuration = dragStartDuration - delta;
    if (newDuration >= 0.1) {
      dragClip.startTime = newStart;
      dragClip.duration = newDuration;
      dragClip.sourceOffset = Math.max(0, dragStartOffset + delta);
    }
    updatePreview();
  } else if (dragMode === 'trim-right' && dragClip) {
    const newDuration = Math.max(0.1, dragStartDuration + dt);
    dragClip.duration = Math.min(newDuration, dragClip.sourceDuration - dragClip.sourceOffset);
    updatePreview();
  }
};

const onMouseUp = () => {
  if (dragMode === 'scrub') endScrub();
  dragMode = null;
  dragClip = null;
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup', onMouseUp);
};

// Smooth playhead animation using rAF (independent of throttled timeupdate)
const startPlayheadAnimation = () => {
  if (playheadRAF !== null) return;
  const tick = () => {
    if (compositor.value && playing.value) {
      currentTime.value = compositor.value.currentTime;
      playheadRAF = requestAnimationFrame(tick);
    } else {
      playheadRAF = null;
    }
  };
  playheadRAF = requestAnimationFrame(tick);
};

const stopPlayheadAnimation = () => {
  if (playheadRAF !== null) {
    cancelAnimationFrame(playheadRAF);
    playheadRAF = null;
  }
};

// Playback - use compositor's built-in methods
const togglePlay = () => {
  if (!compositor.value || clips.value.length === 0) return;
  if (playing.value) {
    compositor.value.pause();
  } else {
    compositor.value.play();
  }
};

const skipToStart = () => {
  compositor.value?.seek(0);
};

const skipToEnd = () => {
  compositor.value?.seek(duration.value);
};

const toggleFullscreen = async () => {
  const el = document.querySelector('.editor');
  if (!el) return;
  if (!document.fullscreenElement) {
    await el.requestFullscreen();
  } else {
    await document.exitFullscreen();
  }
};

const toggleMute = () => {
  muted.value = !muted.value;
  compositor.value?.setMuted(muted.value);
};

const updateVolume = () => {
  compositor.value?.setVolume(masterVolume.value);
  // Unmute if adjusting volume while muted
  if (muted.value && masterVolume.value > 0) {
    muted.value = false;
    compositor.value?.setMuted(false);
  }
};

// Dynamic page styles (added/removed on mount/unmount)
const PLAYGROUND_STYLES = `
.VPDoc { padding: 0 !important; }
.VPDoc .container { max-width: 100% !important; }
.VPDoc .content { padding: 0 !important; }
.VPDoc .content-container { max-width: 100% !important; padding: 0 !important; }
.VPFooter, .VPDocFooter, footer, .footer, .prev-next, .edit-link { display: none !important; }
main { padding-bottom: 0 !important; }
.VPContent { padding-bottom: 0 !important; }
`;

let styleEl: HTMLStyleElement | null = null;

onMounted(() => {
  // Add page styles
  styleEl = document.createElement('style');
  styleEl.textContent = PLAYGROUND_STYLES;
  document.head.appendChild(styleEl);

  if (!canvasRef.value) return;
  const comp = new Compositor({
    canvas: canvasRef.value,
    width: canvasWidth.value,
    height: canvasHeight.value,
    backgroundColor: '#000000',
    worker: {
      enabled: true,
      url: CompositorWorkerUrl,
      type: 'module',
    },
  });
  compositor.value = comp;

  comp.on('error', (e) => {
    console.error('[Compositor Error]', e);
  });

  // Listen to compositor events
  comp.on('timeupdate', ({ currentTime: t }) => {
    currentTime.value = t;
  });

  comp.on('play', () => {
    playing.value = true;
    startPlayheadAnimation();
  });

  comp.on('pause', () => {
    playing.value = false;
    stopPlayheadAnimation();
  });

  comp.on('ended', () => {
    playing.value = false;
    stopPlayheadAnimation();
  });

  comp.on('seeked', ({ time }) => {
    currentTime.value = time;
  });

  document.addEventListener('fullscreenchange', () => {
    isFullscreen.value = !!document.fullscreenElement;
  });

  document.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement) return;
    if (e.key === ' ') {
      e.preventDefault();
      togglePlay();
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedClipId.value) {
      deleteSelectedClip();
    }
  });
});

onUnmounted(() => {
  stopPlayheadAnimation();
  if (scrubRAF !== null) cancelAnimationFrame(scrubRAF);
  compositor.value?.dispose();
  // Remove page styles
  if (styleEl) {
    styleEl.remove();
    styleEl = null;
  }
});
</script>

<style scoped>
.editor {
    display: flex;
    flex-direction: column;
    height: calc(100vh - 64px);
    min-height: 500px;
    background: #111;
    color: #888;
    font-size: 12px;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    user-select: none;
}

.editor.fullscreen {
    position: fixed;
    inset: 0;
    height: 100vh;
    z-index: 9999;
}

.toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 40px;
    padding: 0 12px;
    background: #1a1a1a;
    border-bottom: 1px solid #333;
}

.toolbar-left, .toolbar-right, .toolbar-center {
    display: flex;
    gap: 8px;
    align-items: center;
}

.tool-btn {
    height: 28px;
    padding: 0 12px;
    background: #2a2a2a;
    border: 1px solid #444;
    color: #ccc;
    font-size: 12px;
    cursor: pointer;
}

.tool-btn:hover:not(:disabled) {
    background: #3a3a3a;
    color: #fff;
}

.tool-btn:disabled {
    opacity: 0.5;
    cursor: default;
}

.aspect-select {
    height: 28px;
    padding: 0 8px;
    background: #2a2a2a;
    border: 1px solid #444;
    color: #ccc;
    font-size: 12px;
    cursor: pointer;
}

.aspect-select:hover {
    background: #3a3a3a;
}

.fit-select {
    height: 28px;
    padding: 0 8px;
    background: #2a2a2a;
    border: 1px solid #444;
    color: #ccc;
    font-size: 12px;
    cursor: pointer;
}

.fit-select:hover {
    background: #3a3a3a;
}

.volume-slider {
    width: 80px;
    height: 4px;
    -webkit-appearance: none;
    background: #444;
    border-radius: 2px;
    cursor: pointer;
}

.volume-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 12px;
    height: 12px;
    background: #888;
    border-radius: 50%;
}

.volume-slider::-webkit-slider-thumb:hover {
    background: #aaa;
}

.transport-btn {
    width: 32px;
    height: 28px;
    background: #2a2a2a;
    border: 1px solid #444;
    color: #ccc;
    font-size: 10px;
    cursor: pointer;
}

.transport-btn:hover {
    background: #3a3a3a;
    color: #fff;
}

.transport-btn.play {
    width: 40px;
    background: #444;
}

.timecode {
    margin-left: 12px;
    font-family: monospace;
    font-size: 13px;
    color: #666;
}

.main {
    flex: 1;
    display: flex;
    background: #0a0a0a;
    overflow: hidden;
}

.preview {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
}

.preview canvas {
    max-width: 100%;
    max-height: 100%;
    background: #000;
}

.preview-empty {
    position: absolute;
    color: #444;
    font-size: 14px;
}

.inspector {
    width: 220px;
    background: #1a1a1a;
    border-left: 1px solid #333;
}

.inspector-header {
    padding: 12px;
    font-weight: 600;
    color: #aaa;
    border-bottom: 1px solid #333;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.inspector-section {
    padding: 12px;
}

.inspector-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
}

.inspector-row label {
    width: 60px;
    color: #666;
    font-size: 11px;
}

.inspector-row input[type="number"] {
    width: 70px;
    height: 24px;
    background: #222;
    border: 1px solid #444;
    color: #ccc;
    padding: 0 6px;
    font-size: 12px;
}

.inspector-row input[type="range"] {
    flex: 1;
    height: 4px;
    -webkit-appearance: none;
    background: #444;
}

.inspector-row input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 12px;
    height: 12px;
    background: #888;
}

.inspector-row span {
    width: 40px;
    text-align: right;
    font-size: 11px;
    color: #666;
}

.reset-btn {
    width: 100%;
    height: 28px;
    margin-top: 12px;
    background: #2a2a2a;
    border: 1px solid #444;
    color: #aaa;
    cursor: pointer;
}

.reset-btn:hover {
    background: #3a3a3a;
}

.delete-btn {
    width: 100%;
    height: 28px;
    margin-top: 8px;
    background: #3a2020;
    border: 1px solid #633;
    color: #c88;
    cursor: pointer;
}

.delete-btn:hover {
    background: #4a2525;
}

.timeline-wrapper {
    height: 290px;
    background: #181818;
    border-top: 1px solid #333;
    display: flex;
    flex-direction: column;
}

.timeline-header {
    display: flex;
    height: 24px;
    background: #1a1a1a;
    border-bottom: 1px solid #333;
}

.track-label-header {
    width: 48px;
    border-right: 1px solid #333;
}

.ruler {
    flex: 1;
    position: relative;
    overflow: hidden;
    cursor: pointer;
}

.ruler-mark {
    position: absolute;
    top: 4px;
    font-size: 10px;
    color: #555;
    pointer-events: none;
}

.timeline {
    flex: 1;
    position: relative;
    overflow-x: auto;
    overflow-y: hidden;
}

.track {
    display: flex;
    height: 52px;
    border-bottom: 1px solid #222;
}

.track-label {
    width: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #1a1a1a;
    color: #555;
    font-size: 11px;
    border-right: 1px solid #333;
}

.track-content {
    flex: 1;
    position: relative;
    background: #141414;
}

.clip {
    position: absolute;
    top: 6px;
    height: 40px;
    background: #2a3a4a;
    border: 1px solid #3a5a7a;
    display: flex;
    cursor: pointer;
}

.clip:hover {
    background: #3a4a5a;
}

.clip.selected {
    border-color: #5a8aba;
    background: #3a5a7a;
}

/* Audio track styling */
.audio-track .track-label {
    background: #1a1a20;
}

.audio-label {
    color: #7a7aaa !important;
}

.audio-clip {
    background: #3a2a4a !important;
    border-color: #5a3a7a !important;
}

.audio-clip:hover {
    background: #4a3a5a !important;
}

.audio-clip.selected {
    border-color: #8a5aba !important;
    background: #5a3a7a !important;
}

.clip-trim-left,
.clip-trim-right {
    width: 8px;
    background: rgba(255,255,255,0.1);
    cursor: ew-resize;
}

.clip-trim-left:hover,
.clip-trim-right:hover {
    background: rgba(255,255,255,0.3);
}

.clip-body {
    flex: 1;
    padding: 4px 8px;
    font-size: 11px;
    color: #aaa;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: flex;
    align-items: center;
}

.playhead {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    background: #e44;
    pointer-events: none;
    z-index: 10;
}

.playhead::before {
    content: '';
    position: absolute;
    top: -24px;
    left: -6px;
    border-left: 7px solid transparent;
    border-right: 7px solid transparent;
    border-top: 10px solid #e44;
}
</style>
