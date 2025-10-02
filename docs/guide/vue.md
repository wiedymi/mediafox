# Vue Integration

AVPlay integrates beautifully with Vue 3's Composition API. This guide shows you how to build video players with Vue.

## Vue Composable

Create a reusable composable for AVPlay:

```typescript
// useAVPlay.ts
import { ref, onMounted, onUnmounted, Ref } from 'vue';
import { AVPlay, PlayerStateData, PlayerOptions } from '@avplay/core';

export function useAVPlay(options?: PlayerOptions) {
  const player = ref<AVPlay>();
  const state = ref<PlayerStateData | null>(null);
  const error = ref<Error | null>(null);

  onMounted(() => {
    player.value = new AVPlay(options);

    // Subscribe to state changes
    const unsubscribe = player.value.subscribe((newState) => {
      state.value = newState;
    });

    // Handle errors
    player.value.on('error', (err) => {
      error.value = err;
    });

    // Store unsubscribe for cleanup
    (window as any).__playerUnsubscribe = unsubscribe;
  });

  onUnmounted(() => {
    if ((window as any).__playerUnsubscribe) {
      (window as any).__playerUnsubscribe();
      delete (window as any).__playerUnsubscribe;
    }
    player.value?.dispose();
  });

  const load = async (source: any) => {
    try {
      error.value = null;
      await player.value?.load(source);
    } catch (err) {
      error.value = err as Error;
    }
  };

  const play = async () => {
    await player.value?.play();
  };

  const pause = () => {
    player.value?.pause();
  };

  const seek = async (time: number) => {
    await player.value?.seek(time);
  };

  return {
    player,
    state,
    error,
    load,
    play,
    pause,
    seek
  };
}
```

## Simple Video Player Component

```vue
<!-- VideoPlayer.vue -->
<template>
  <div class="video-player">
    <canvas ref="canvasRef" class="video-canvas" />

    <div v-if="state" class="controls">
      <button @click="state.playing ? pause() : play()">
        {{ state.playing ? '⏸' : '▶️' }}
      </button>

      <div class="progress" @click="handleSeek">
        <div
          class="progress-bar"
          :style="{ width: progressPercent + '%' }"
        />
      </div>

      <span class="time">
        {{ formatTime(state.currentTime) }} / {{ formatTime(state.duration) }}
      </span>
    </div>

    <div v-if="error" class="error">
      Error: {{ error.message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { AVPlay, formatTime } from '@avplay/core';

const props = defineProps<{
  src: string | File | Blob;
  autoplay?: boolean;
}>();

const canvasRef = ref<HTMLCanvasElement>();
const player = ref<AVPlay>();
const state = ref<any>(null);
const error = ref<Error | null>(null);

const progressPercent = computed(() => {
  if (!state.value || state.value.duration === 0) return 0;
  return (state.value.currentTime / state.value.duration) * 100;
});

onMounted(() => {
  if (!canvasRef.value) return;

  player.value = new AVPlay({
    renderTarget: canvasRef.value,
    autoplay: props.autoplay
  });

  // Subscribe to state changes
  const unsubscribe = player.value.subscribe((newState) => {
    state.value = newState;
  });

  // Handle errors
  player.value.on('error', (err) => {
    error.value = err;
  });

  // Load initial source
  if (props.src) {
    loadMedia(props.src);
  }

  // Store for cleanup
  (window as any).__playerUnsub = unsubscribe;
});

// Watch for source changes
watch(() => props.src, (newSrc) => {
  if (newSrc) {
    loadMedia(newSrc);
  }
});

const loadMedia = async (source: any) => {
  try {
    error.value = null;
    await player.value?.load(source);
  } catch (err) {
    error.value = err as Error;
  }
};

const play = async () => {
  await player.value?.play();
};

const pause = () => {
  player.value?.pause();
};

const handleSeek = (event: MouseEvent) => {
  if (!state.value || !player.value) return;

  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const percent = (event.clientX - rect.left) / rect.width;
  const time = percent * state.value.duration;

  player.value.seek(time);
};

onUnmounted(() => {
  if ((window as any).__playerUnsub) {
    (window as any).__playerUnsub();
    delete (window as any).__playerUnsub;
  }
  player.value?.dispose();
});
</script>

<style scoped>
.video-player {
  position: relative;
  background: #000;
}

.video-canvas {
  width: 100%;
  height: auto;
  display: block;
}

.controls {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: #333;
}

.progress {
  flex: 1;
  height: 4px;
  background: #555;
  cursor: pointer;
  position: relative;
}

.progress-bar {
  height: 100%;
  background: #0066cc;
  transition: width 0.1s;
}

.time {
  color: white;
  font-size: 14px;
}

.error {
  padding: 10px;
  background: #f44336;
  color: white;
}
</style>
```

## Advanced Player with Composition API

```vue
<!-- AdvancedPlayer.vue -->
<template>
  <div class="advanced-player">
    <canvas
      ref="canvasRef"
      class="video-canvas"
      @click="togglePlay"
    />

    <div class="overlay" v-show="showControls">
      <!-- Play button overlay -->
      <button
        v-if="!playing"
        class="play-overlay"
        @click="play"
      >
        ▶️
      </button>
    </div>

    <div class="controls" v-if="state">
      <!-- Main controls -->
      <div class="control-row">
        <button @click="togglePlay">
          {{ playing ? '⏸' : '▶️' }}
        </button>
        <button @click="stop">⏹</button>
        <button @click="toggleMute">
          {{ muted ? 'Mute' : 'Unmute' }}
        </button>

        <!-- Volume slider -->
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          :value="volume"
          @input="updateVolume"
          class="volume-slider"
        />

        <span class="time">
          {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
        </span>

        <!-- Playback speed -->
        <select v-model="playbackRate" @change="updatePlaybackRate">
          <option :value="0.25">0.25x</option>
          <option :value="0.5">0.5x</option>
          <option :value="0.75">0.75x</option>
          <option :value="1">1x</option>
          <option :value="1.25">1.25x</option>
          <option :value="1.5">1.5x</option>
          <option :value="2">2x</option>
        </select>

        <button @click="takeScreenshot">Screenshot</button>
        <button @click="toggleFullscreen">Fullscreen</button>
      </div>

      <!-- Progress bar -->
      <div class="control-row">
        <div class="progress-container" @click="seek">
          <!-- Buffered ranges -->
          <div
            v-for="(range, index) in bufferedRanges"
            :key="index"
            class="buffered"
            :style="{
              left: (range.start / duration) * 100 + '%',
              width: ((range.end - range.start) / duration) * 100 + '%'
            }"
          />
          <!-- Current progress -->
          <div
            class="progress"
            :style="{ width: (currentTime / duration) * 100 + '%' }"
          />
        </div>
      </div>

      <!-- Track selection -->
      <div class="control-row" v-if="videoTracks.length > 1 || audioTracks.length > 1">
        <label v-if="videoTracks.length > 1">
          Video:
          <select @change="selectVideoTrack">
            <option
              v-for="track in videoTracks"
              :key="track.id"
              :value="track.id"
              :selected="track.selected"
            >
              {{ track.codec }} {{ track.width }}x{{ track.height }}
            </option>
          </select>
        </label>

        <label v-if="audioTracks.length > 1">
          Audio:
          <select @change="selectAudioTrack">
            <option
              v-for="track in audioTracks"
              :key="track.id"
              :value="track.id"
              :selected="track.selected"
            >
              {{ track.language || track.codec }}
            </option>
          </select>
        </label>
      </div>
    </div>

    <!-- Loading indicator -->
    <div v-if="loading" class="loading">
      Loading...
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { AVPlay, formatTime, VideoTrackInfo, AudioTrackInfo } from '@avplay/core';

const props = defineProps<{
  src: string | File | Blob;
}>();

// Refs
const canvasRef = ref<HTMLCanvasElement>();
const player = ref<AVPlay>();

// State
const state = ref<any>(null);
const loading = ref(false);
const showControls = ref(true);
const videoTracks = ref<VideoTrackInfo[]>([]);
const audioTracks = ref<AudioTrackInfo[]>([]);
const playbackRate = ref(1);

// Computed properties
const playing = computed(() => state.value?.playing || false);
const currentTime = computed(() => state.value?.currentTime || 0);
const duration = computed(() => state.value?.duration || 0);
const volume = computed(() => state.value?.volume || 1);
const muted = computed(() => state.value?.muted || false);
const bufferedRanges = computed(() => state.value?.buffered || []);

// Initialize player
onMounted(async () => {
  if (!canvasRef.value) return;

  // Create player
  player.value = new AVPlay({
    renderTarget: canvasRef.value
  });

  // Subscribe to state
  const unsubscribe = player.value.subscribe((newState) => {
    state.value = newState;
  });

  // Load media
  loading.value = true;
  try {
    await player.value.load(props.src);

    // Get tracks
    videoTracks.value = player.value.getVideoTracks();
    audioTracks.value = player.value.getAudioTracks();
  } catch (error) {
    console.error('Failed to load media:', error);
  } finally {
    loading.value = false;
  }

  // Event listeners
  player.value.on('loadedmetadata', (info) => {
    console.log('Media loaded:', info);
  });

  // Keyboard shortcuts
  const handleKeyboard = (e: KeyboardEvent) => {
    if (!player.value) return;

    switch (e.key) {
      case ' ':
        e.preventDefault();
        togglePlay();
        break;
      case 'ArrowLeft':
        player.value.currentTime = Math.max(0, currentTime.value - 5);
        break;
      case 'ArrowRight':
        player.value.currentTime = Math.min(duration.value, currentTime.value + 5);
        break;
      case 'ArrowUp':
        player.value.volume = Math.min(1, volume.value + 0.1);
        break;
      case 'ArrowDown':
        player.value.volume = Math.max(0, volume.value - 0.1);
        break;
      case 'm':
        toggleMute();
        break;
      case 'f':
        toggleFullscreen();
        break;
    }
  };

  window.addEventListener('keydown', handleKeyboard);

  // Auto-hide controls
  let controlsTimeout: number;
  const handleMouseMove = () => {
    showControls.value = true;
    clearTimeout(controlsTimeout);
    controlsTimeout = setTimeout(() => {
      if (playing.value) {
        showControls.value = false;
      }
    }, 3000);
  };

  canvasRef.value.addEventListener('mousemove', handleMouseMove);

  // Store for cleanup
  (window as any).__playerCleanup = () => {
    unsubscribe();
    window.removeEventListener('keydown', handleKeyboard);
    canvasRef.value?.removeEventListener('mousemove', handleMouseMove);
  };
});

// Cleanup
onUnmounted(() => {
  if ((window as any).__playerCleanup) {
    (window as any).__playerCleanup();
    delete (window as any).__playerCleanup;
  }
  player.value?.dispose();
});

// Methods
const play = async () => {
  await player.value?.play();
};

const pause = () => {
  player.value?.pause();
};

const stop = () => {
  player.value?.stop();
};

const togglePlay = () => {
  if (playing.value) {
    pause();
  } else {
    play();
  }
};

const toggleMute = () => {
  if (player.value) {
    player.value.muted = !muted.value;
  }
};

const updateVolume = (event: Event) => {
  const value = parseFloat((event.target as HTMLInputElement).value);
  if (player.value) {
    player.value.volume = value;
  }
};

const updatePlaybackRate = () => {
  if (player.value) {
    player.value.playbackRate = playbackRate.value;
  }
};

const seek = (event: MouseEvent) => {
  if (!player.value) return;

  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const percent = (event.clientX - rect.left) / rect.width;
  player.value.currentTime = percent * duration.value;
};

const selectVideoTrack = async (event: Event) => {
  const trackId = (event.target as HTMLSelectElement).value;
  await player.value?.selectVideoTrack(trackId);
  videoTracks.value = player.value?.getVideoTracks() || [];
};

const selectAudioTrack = async (event: Event) => {
  const trackId = (event.target as HTMLSelectElement).value;
  await player.value?.selectAudioTrack(trackId);
  audioTracks.value = player.value?.getAudioTracks() || [];
};

const takeScreenshot = async () => {
  const blob = await player.value?.screenshot({ format: 'png' });
  if (blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'screenshot.png';
    a.click();
    URL.revokeObjectURL(url);
  }
};

const toggleFullscreen = () => {
  if (canvasRef.value?.requestFullscreen) {
    canvasRef.value.requestFullscreen();
  }
};
</script>

<style scoped>
.advanced-player {
  position: relative;
  background: #000;
  user-select: none;
}

.video-canvas {
  width: 100%;
  height: auto;
  display: block;
  cursor: pointer;
}

.overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.play-overlay {
  font-size: 64px;
  background: rgba(0, 0, 0, 0.5);
  border: none;
  color: white;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  cursor: pointer;
  pointer-events: all;
}

.controls {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
  padding: 20px 10px 10px;
  transition: opacity 0.3s;
}

.control-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.control-row:last-child {
  margin-bottom: 0;
}

.progress-container {
  flex: 1;
  height: 6px;
  background: rgba(255, 255, 255, 0.3);
  cursor: pointer;
  position: relative;
}

.buffered {
  position: absolute;
  height: 100%;
  background: rgba(255, 255, 255, 0.5);
}

.progress {
  height: 100%;
  background: #0066cc;
  position: relative;
}

.volume-slider {
  width: 100px;
}

.time {
  color: white;
  font-size: 14px;
  min-width: 100px;
}

.loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 18px;
}

button {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 5px 10px;
  cursor: pointer;
  border-radius: 4px;
}

button:hover {
  background: rgba(255, 255, 255, 0.2);
}

select {
  background: rgba(0, 0, 0, 0.5);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 5px;
  border-radius: 4px;
}

label {
  color: white;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 5px;
}
</style>
```

## Pinia Store Integration

```typescript
// stores/player.ts
import { defineStore } from 'pinia';
import { AVPlay, PlayerStateData } from '@avplay/core';

export const usePlayerStore = defineStore('player', {
  state: () => ({
    player: null as AVPlay | null,
    state: null as PlayerStateData | null,
    error: null as Error | null,
    loading: false
  }),

  getters: {
    playing: (state) => state.state?.playing || false,
    currentTime: (state) => state.state?.currentTime || 0,
    duration: (state) => state.state?.duration || 0,
    progress: (state) => {
      if (!state.state || state.state.duration === 0) return 0;
      return (state.state.currentTime / state.state.duration) * 100;
    }
  },

  actions: {
    initPlayer(options?: any) {
      this.player = new AVPlay(options);

      // Subscribe to state changes
      this.player.subscribe((state) => {
        this.state = state;
      });

      // Handle errors
      this.player.on('error', (error) => {
        this.error = error;
      });
    },

    async loadMedia(source: any) {
      if (!this.player) {
        throw new Error('Player not initialized');
      }

      this.loading = true;
      this.error = null;

      try {
        await this.player.load(source);
      } catch (error) {
        this.error = error as Error;
      } finally {
        this.loading = false;
      }
    },

    async play() {
      await this.player?.play();
    },

    pause() {
      this.player?.pause();
    },

    async seek(time: number) {
      await this.player?.seek(time);
    },

    setVolume(volume: number) {
      if (this.player) {
        this.player.volume = volume;
      }
    },

    dispose() {
      this.player?.dispose();
      this.player = null;
      this.state = null;
    }
  }
});
```

## Custom Player Directives

```typescript
// directives/player.ts
import { Directive } from 'vue';
import { AVPlay } from '@avplay/core';

export const vPlayer: Directive = {
  mounted(el, binding) {
    if (el.tagName !== 'CANVAS') {
      console.error('v-player directive must be used on a canvas element');
      return;
    }

    const player = new AVPlay({
      renderTarget: el,
      ...binding.value.options
    });

    // Load media if provided
    if (binding.value.src) {
      player.load(binding.value.src);
    }

    // Store player instance
    el._player = player;
  },

  updated(el, binding) {
    const player = el._player;
    if (!player) return;

    // Update source if changed
    if (binding.value.src !== binding.oldValue?.src) {
      player.load(binding.value.src);
    }
  },

  unmounted(el) {
    const player = el._player;
    if (player) {
      player.dispose();
      delete el._player;
    }
  }
};

// Usage in component:
// <canvas v-player="{ src: videoUrl, options: { autoplay: true } }" />
```

## Nuxt 3 Integration

```typescript
// plugins/avplay.client.ts
import { AVPlay } from '@avplay/core';

export default defineNuxtPlugin(() => {
  return {
    provide: {
      AVPlay
    }
  };
});

// composables/usePlayer.ts
export const usePlayer = () => {
  const { $AVPlay } = useNuxtApp();

  const player = ref<InstanceType<typeof $AVPlay>>();
  const state = ref<any>(null);

  const initPlayer = (options: any) => {
    player.value = new $AVPlay(options);

    player.value.subscribe((newState) => {
      state.value = newState;
    });

    return player.value;
  };

  return {
    player: readonly(player),
    state: readonly(state),
    initPlayer
  };
};
```

## Best Practices

### 1. Reactive Canvas Reference

Always wait for the canvas to be mounted:

```vue
<script setup>
onMounted(() => {
  if (canvasRef.value) {
    player.value = new AVPlay({
      renderTarget: canvasRef.value
    });
  }
});
</script>
```

### 2. Proper Cleanup

Clean up resources in `onUnmounted`:

```vue
<script setup>
onUnmounted(() => {
  player.value?.dispose();
});
</script>
```

### 3. Handle Async Operations

Use proper error handling for async operations:

```vue
<script setup>
const loadVideo = async (source: any) => {
  loading.value = true;
  error.value = null;

  try {
    await player.value?.load(source);
  } catch (err) {
    error.value = err as Error;
  } finally {
    loading.value = false;
  }
};
</script>
```

### 4. Optimize Reactivity

Use `shallowRef` for the player instance:

```vue
<script setup>
import { shallowRef } from 'vue';

const player = shallowRef<AVPlay>();
</script>
```

## Next Steps

- [React Integration](/guide/react) - Using AVPlay with React
- [API Reference](/api/player) - Complete API documentation
- [Live Demo](/) - Interactive demo on the home page
