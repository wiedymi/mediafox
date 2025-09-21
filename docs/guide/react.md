# React Integration

XiaoMei works seamlessly with React. This guide shows you how to create a custom video player component.

## Basic React Hook

Create a reusable hook for XiaoMei:

```typescript
// useXiaoMei.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import { XiaoMei, PlayerStateData, PlayerOptions } from 'xiaomei';

export function useXiaoMei(options?: PlayerOptions) {
  const playerRef = useRef<XiaoMei>();
  const [state, setState] = useState<PlayerStateData | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Create player instance
    const player = new XiaoMei(options);
    playerRef.current = player;

    // Subscribe to state changes
    const unsubscribe = player.subscribe(setState);

    // Handle errors
    player.on('error', setError);

    return () => {
      unsubscribe();
      player.dispose();
    };
  }, []);

  const load = useCallback(async (source: any) => {
    try {
      setError(null);
      await playerRef.current?.load(source);
    } catch (err) {
      setError(err as Error);
    }
  }, []);

  const play = useCallback(async () => {
    await playerRef.current?.play();
  }, []);

  const pause = useCallback(() => {
    playerRef.current?.pause();
  }, []);

  const seek = useCallback(async (time: number) => {
    await playerRef.current?.seek(time);
  }, []);

  return {
    player: playerRef.current,
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

```tsx
// VideoPlayer.tsx
import React, { useRef, useEffect } from 'react';
import { useXiaoMei } from './useXiaoMei';
import { formatTime } from 'xiaomei';

interface VideoPlayerProps {
  src: string | File | Blob;
  autoplay?: boolean;
}

export function VideoPlayer({ src, autoplay }: VideoPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const {
    player,
    state,
    error,
    load,
    play,
    pause
  } = useXiaoMei({
    renderTarget: canvasRef.current!,
    autoplay
  });

  // Load source when it changes
  useEffect(() => {
    if (src) {
      load(src);
    }
  }, [src, load]);

  // Handle seeking
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!state) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const time = percent * state.duration;

    player?.seek(time);
  };

  if (error) {
    return <div className="error">Error: {error.message}</div>;
  }

  return (
    <div className="video-player">
      <canvas
        ref={canvasRef}
        className="video-canvas"
      />

      {state && (
        <div className="controls">
          <button onClick={state.playing ? pause : play}>
            {state.playing ? '⏸' : '▶️'}
          </button>

          <div className="progress" onClick={handleSeek}>
            <div
              className="progress-bar"
              style={{ width: `${(state.currentTime / state.duration) * 100}%` }}
            />
          </div>

          <span className="time">
            {formatTime(state.currentTime)} / {formatTime(state.duration)}
          </span>
        </div>
      )}
    </div>
  );
}
```

## Advanced Player with Full Controls

```tsx
// AdvancedPlayer.tsx
import React, { useRef, useEffect, useState } from 'react';
import { XiaoMei, formatTime, VideoTrackInfo, AudioTrackInfo } from 'xiaomei';

interface AdvancedPlayerProps {
  src: string | File | Blob;
}

export function AdvancedPlayer({ src }: AdvancedPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<XiaoMei>();
  const [state, setState] = useState<any>(null);
  const [videoTracks, setVideoTracks] = useState<VideoTrackInfo[]>([]);
  const [audioTracks, setAudioTracks] = useState<AudioTrackInfo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<string>('');
  const [selectedAudio, setSelectedAudio] = useState<string>('');
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);

  useEffect(() => {
    if (!canvasRef.current) return;

    const player = new XiaoMei({
      renderTarget: canvasRef.current,
      volume
    });

    playerRef.current = player;

    // Subscribe to state
    const unsubscribe = player.subscribe(setState);

    // Load media
    player.load(src).then(() => {
      // Get tracks
      setVideoTracks(player.getVideoTracks());
      setAudioTracks(player.getAudioTracks());
    });

    // Handle metadata
    player.on('loadedmetadata', (info) => {
      console.log('Media info:', info);
    });

    return () => {
      unsubscribe();
      player.dispose();
    };
  }, [src]);

  // Volume control
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setVolume(value);
    if (playerRef.current) {
      playerRef.current.volume = value;
    }
  };

  // Playback rate
  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (playerRef.current) {
      playerRef.current.playbackRate = rate;
    }
  };

  // Track selection
  const handleVideoTrackChange = async (trackId: string) => {
    setSelectedVideo(trackId);
    await playerRef.current?.selectVideoTrack(trackId);
  };

  const handleAudioTrackChange = async (trackId: string) => {
    setSelectedAudio(trackId);
    await playerRef.current?.selectAudioTrack(trackId);
  };

  // Screenshot
  const takeScreenshot = async () => {
    const blob = await playerRef.current?.screenshot({
      format: 'png'
    });

    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'screenshot.png';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const player = playerRef.current;
      if (!player) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          if (player.paused) {
            player.play();
          } else {
            player.pause();
          }
          break;
        case 'ArrowLeft':
          player.currentTime = Math.max(0, player.currentTime - 5);
          break;
        case 'ArrowRight':
          player.currentTime = Math.min(player.duration, player.currentTime + 5);
          break;
        case 'ArrowUp':
          player.volume = Math.min(1, player.volume + 0.1);
          break;
        case 'ArrowDown':
          player.volume = Math.max(0, player.volume - 0.1);
          break;
        case 'm':
          player.muted = !player.muted;
          break;
        case 'f':
          // Toggle fullscreen
          if (canvasRef.current?.requestFullscreen) {
            canvasRef.current.requestFullscreen();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  if (!state) {
    return <div>Loading...</div>;
  }

  return (
    <div className="advanced-player">
      <canvas
        ref={canvasRef}
        className="video-canvas"
        style={{ width: '100%', height: 'auto' }}
      />

      <div className="controls">
        {/* Playback controls */}
        <div className="control-row">
          <button onClick={() => playerRef.current?.play()}>
            ▶️
          </button>
          <button onClick={() => playerRef.current?.pause()}>
            ⏸
          </button>
          <button onClick={() => playerRef.current?.stop()}>
            ⏹
          </button>

          <span className="time">
            {formatTime(state.currentTime)} / {formatTime(state.duration)}
          </span>

          <button onClick={takeScreenshot}>Screenshot</button>
        </div>

        {/* Progress bar */}
        <div className="control-row">
          <input
            type="range"
            min="0"
            max={state.duration}
            value={state.currentTime}
            onChange={(e) => {
              playerRef.current!.currentTime = parseFloat(e.target.value);
            }}
            style={{ width: '100%' }}
          />
        </div>

        {/* Volume and rate controls */}
        <div className="control-row">
          <label>
            Volume:
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={handleVolumeChange}
            />
            {Math.round(volume * 100)}%
          </label>

          <label>
            Speed:
            <select
              value={playbackRate}
              onChange={(e) => handleRateChange(parseFloat(e.target.value))}
            >
              <option value="0.25">0.25x</option>
              <option value="0.5">0.5x</option>
              <option value="0.75">0.75x</option>
              <option value="1">1x</option>
              <option value="1.25">1.25x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2x</option>
            </select>
          </label>
        </div>

        {/* Track selection */}
        {videoTracks.length > 1 && (
          <div className="control-row">
            <label>
              Video Track:
              <select
                value={selectedVideo}
                onChange={(e) => handleVideoTrackChange(e.target.value)}
              >
                {videoTracks.map(track => (
                  <option key={track.id} value={track.id}>
                    {track.codec} {track.width}x{track.height}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        {audioTracks.length > 1 && (
          <div className="control-row">
            <label>
              Audio Track:
              <select
                value={selectedAudio}
                onChange={(e) => handleAudioTrackChange(e.target.value)}
              >
                {audioTracks.map(track => (
                  <option key={track.id} value={track.id}>
                    {track.language || track.codec} {track.channels}ch
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
```

## Custom UI Components

### Volume Slider

```tsx
interface VolumeSliderProps {
  player: XiaoMei;
  volume: number;
  muted: boolean;
}

function VolumeSlider({ player, volume, muted }: VolumeSliderProps) {
  return (
    <div className="volume-control">
      <button onClick={() => player.muted = !player.muted}>
        {muted ? 'Mute' : 'Unmute'}
      </button>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={muted ? 0 : volume}
        onChange={(e) => {
          player.volume = parseFloat(e.target.value);
        }}
      />
    </div>
  );
}
```

### Progress Bar with Buffering

```tsx
interface ProgressBarProps {
  currentTime: number;
  duration: number;
  buffered: Array<{ start: number; end: number }>;
  onSeek: (time: number) => void;
}

function ProgressBar({ currentTime, duration, buffered, onSeek }: ProgressBarProps) {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    onSeek(percent * duration);
  };

  return (
    <div className="progress-bar" onClick={handleClick}>
      {/* Buffered segments */}
      {buffered.map((range, i) => (
        <div
          key={i}
          className="buffered"
          style={{
            left: `${(range.start / duration) * 100}%`,
            width: `${((range.end - range.start) / duration) * 100}%`
          }}
        />
      ))}

      {/* Current progress */}
      <div
        className="progress"
        style={{ width: `${(currentTime / duration) * 100}%` }}
      />
    </div>
  );
}
```

## State Management Integration

### With Redux

```typescript
// playerSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { XiaoMei } from 'xiaomei';

let playerInstance: XiaoMei | null = null;

export const loadMedia = createAsyncThunk(
  'player/load',
  async (source: any) => {
    if (!playerInstance) {
      playerInstance = new XiaoMei();
    }
    await playerInstance.load(source);
    return playerInstance.getState();
  }
);

export const playerSlice = createSlice({
  name: 'player',
  initialState: {
    playing: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    loading: false,
    error: null
  },
  reducers: {
    updateState: (state, action) => {
      Object.assign(state, action.payload);
    },
    setVolume: (state, action) => {
      state.volume = action.payload;
      if (playerInstance) {
        playerInstance.volume = action.payload;
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadMedia.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadMedia.fulfilled, (state, action) => {
        state.loading = false;
        Object.assign(state, action.payload);
      })
      .addCase(loadMedia.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  }
});
```

### With Zustand

```typescript
// usePlayerStore.ts
import { create } from 'zustand';
import { XiaoMei, PlayerStateData } from 'xiaomei';

interface PlayerStore extends PlayerStateData {
  player: XiaoMei | null;
  initPlayer: (options?: any) => void;
  loadMedia: (source: any) => Promise<void>;
  play: () => Promise<void>;
  pause: () => void;
  seek: (time: number) => Promise<void>;
  setVolume: (volume: number) => void;
  dispose: () => void;
}

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  // Initial state
  state: 'idle',
  playing: false,
  paused: true,
  currentTime: 0,
  duration: 0,
  volume: 1,
  muted: false,
  player: null,

  initPlayer: (options) => {
    const player = new XiaoMei(options);

    // Subscribe to state changes
    player.subscribe((state) => {
      set(state);
    });

    set({ player });
  },

  loadMedia: async (source) => {
    const { player } = get();
    if (!player) throw new Error('Player not initialized');
    await player.load(source);
  },

  play: async () => {
    const { player } = get();
    await player?.play();
  },

  pause: () => {
    const { player } = get();
    player?.pause();
  },

  seek: async (time) => {
    const { player } = get();
    await player?.seek(time);
  },

  setVolume: (volume) => {
    const { player } = get();
    if (player) {
      player.volume = volume;
    }
  },

  dispose: () => {
    const { player } = get();
    player?.dispose();
    set({ player: null });
  }
}));
```

## Best Practices

### 1. Clean Up Resources

Always dispose of the player when unmounting:

```tsx
useEffect(() => {
  const player = new XiaoMei(options);

  return () => {
    player.dispose();
  };
}, []);
```

### 2. Handle Loading States

Show loading indicators during media loading:

```tsx
const [loading, setLoading] = useState(false);

const loadVideo = async (source: any) => {
  setLoading(true);
  try {
    await player.load(source);
  } finally {
    setLoading(false);
  }
};
```

### 3. Error Boundaries

Wrap your player in an error boundary:

```tsx
class PlayerErrorBoundary extends React.Component {
  componentDidCatch(error: Error) {
    console.error('Player error:', error);
    // Report to error tracking service
  }

  render() {
    return this.props.children;
  }
}
```

### 4. Optimize Re-renders

Use React.memo and useCallback to prevent unnecessary re-renders:

```tsx
const PlayerControls = React.memo(({ player, state }) => {
  // Component implementation
});

const handlePlay = useCallback(async () => {
  await player?.play();
}, [player]);
```

## Next Steps

- [Vue Integration](/guide/vue) - Using XiaoMei with Vue
- [API Reference](/api/player) - Complete API documentation
- [Live Demo](/) - Interactive demo on the home page