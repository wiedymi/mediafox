import type {
  LoadOptions,
  MediaFox,
  MediaSource,
  PlayerEventListener,
  PlayerEventMap,
  PlayerOptions,
  PlayerStateData,
  RendererType,
  ScreenshotOptions,
  SeekOptions,
} from '@mediafox/core';
import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';

export interface UseMediaFoxOptions extends PlayerOptions {
  onLoadStart?: PlayerEventListener<'loadstart'>;
  onLoadedMetadata?: PlayerEventListener<'loadedmetadata'>;
  onLoadedData?: PlayerEventListener<'loadeddata'>;
  onCanPlay?: PlayerEventListener<'canplay'>;
  onCanPlayThrough?: PlayerEventListener<'canplaythrough'>;
  onPlay?: PlayerEventListener<'play'>;
  onPause?: PlayerEventListener<'pause'>;
  onPlaying?: PlayerEventListener<'playing'>;
  onEnded?: PlayerEventListener<'ended'>;
  onTimeUpdate?: PlayerEventListener<'timeupdate'>;
  onDurationChange?: PlayerEventListener<'durationchange'>;
  onVolumeChange?: PlayerEventListener<'volumechange'>;
  onRateChange?: PlayerEventListener<'ratechange'>;
  onSeeking?: PlayerEventListener<'seeking'>;
  onSeeked?: PlayerEventListener<'seeked'>;
  onWaiting?: PlayerEventListener<'waiting'>;
  onProgress?: PlayerEventListener<'progress'>;
  onError?: PlayerEventListener<'error'>;
  onWarning?: PlayerEventListener<'warning'>;
  onTrackChange?: PlayerEventListener<'trackchange'>;
  onStateChange?: PlayerEventListener<'statechange'>;
  onRendererChange?: PlayerEventListener<'rendererchange'>;
  onRendererFallback?: PlayerEventListener<'rendererfallback'>;
}

export interface UseMediaFoxReturn {
  player: MediaFox | null;
  state: PlayerStateData | null;
  load: (source: MediaSource, options?: LoadOptions) => Promise<void>;
  play: () => Promise<void>;
  pause: () => void;
  seek: (time: number, options?: SeekOptions) => Promise<void>;
  stop: () => Promise<void>;
  screenshot: (options?: ScreenshotOptions) => Promise<Blob | null>;
  setRenderTarget: (canvas: HTMLCanvasElement | OffscreenCanvas) => Promise<void>;
  switchRenderer: (type: RendererType) => Promise<void>;
  rendererType: RendererType | null;
}

/**
 * React hook for MediaFox media player.
 * Creates and manages a MediaFox instance with automatic cleanup.
 *
 * @example
 * ```tsx
 * function VideoPlayer() {
 *   const canvasRef = useRef<HTMLCanvasElement>(null);
 *   const { player, state, play, pause, load } = useMediaFox({
 *     renderTarget: canvasRef.current,
 *     onError: (error) => console.error(error)
 *   });
 *
 *   useEffect(() => {
 *     load('/video.mp4');
 *   }, [load]);
 *
 *   return (
 *     <div>
 *       <canvas ref={canvasRef} />
 *       <button onClick={play}>Play</button>
 *       <button onClick={pause}>Pause</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useMediaFox(options: UseMediaFoxOptions = {}): UseMediaFoxReturn {
  const playerRef = useRef<MediaFox | null>(null);
  const stateRef = useRef<PlayerStateData | null>(null);
  const subscribersRef = useRef(new Set<() => void>());

  // Memoize player options (exclude event handlers)
  const playerOptions = useMemo<PlayerOptions>(
    () => ({
      renderTarget: options.renderTarget,
      audioContext: options.audioContext,
      volume: options.volume,
      muted: options.muted,
      playbackRate: options.playbackRate,
      autoplay: options.autoplay,
      preload: options.preload,
      crossOrigin: options.crossOrigin,
      maxCacheSize: options.maxCacheSize,
      renderer: options.renderer,
    }),
    [
      options.renderTarget,
      options.audioContext,
      options.volume,
      options.muted,
      options.playbackRate,
      options.autoplay,
      options.preload,
      options.crossOrigin,
      options.maxCacheSize,
      options.renderer,
    ]
  );

  // Initialize player
  useEffect(() => {
    // Lazy load MediaFox to support SSR
    import('@mediafox/core').then(({ MediaFox }) => {
      const player = new MediaFox(playerOptions);
      playerRef.current = player;

      // Subscribe to state changes
      const unsubscribe = player.subscribe((newState) => {
        stateRef.current = newState;
        // Notify all React subscribers
        for (const notify of subscribersRef.current) {
          notify();
        }
      });

      // Set initial state
      stateRef.current = player.getState();
      for (const notify of subscribersRef.current) {
        notify();
      }

      return () => {
        unsubscribe.unsubscribe();
        player.destroy();
        playerRef.current = null;
        stateRef.current = null;
      };
    });
  }, [playerOptions]);

  // Setup event handlers
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    const handlers: Array<[keyof PlayerEventMap, PlayerEventListener<keyof PlayerEventMap>]> = [];

    const registerHandler = <K extends keyof PlayerEventMap>(event: K, handler: PlayerEventListener<K> | undefined) => {
      if (handler) {
        player.on(event, handler);
        handlers.push([event, handler as PlayerEventListener<keyof PlayerEventMap>]);
      }
    };

    registerHandler('loadstart', options.onLoadStart);
    registerHandler('loadedmetadata', options.onLoadedMetadata);
    registerHandler('loadeddata', options.onLoadedData);
    registerHandler('canplay', options.onCanPlay);
    registerHandler('canplaythrough', options.onCanPlayThrough);
    registerHandler('play', options.onPlay);
    registerHandler('pause', options.onPause);
    registerHandler('playing', options.onPlaying);
    registerHandler('ended', options.onEnded);
    registerHandler('timeupdate', options.onTimeUpdate);
    registerHandler('durationchange', options.onDurationChange);
    registerHandler('volumechange', options.onVolumeChange);
    registerHandler('ratechange', options.onRateChange);
    registerHandler('seeking', options.onSeeking);
    registerHandler('seeked', options.onSeeked);
    registerHandler('waiting', options.onWaiting);
    registerHandler('progress', options.onProgress);
    registerHandler('error', options.onError);
    registerHandler('warning', options.onWarning);
    registerHandler('trackchange', options.onTrackChange);
    registerHandler('statechange', options.onStateChange);
    registerHandler('rendererchange', options.onRendererChange);
    registerHandler('rendererfallback', options.onRendererFallback);

    return () => {
      for (const [event, handler] of handlers) {
        player.off(event, handler);
      }
    };
  }, [
    options.onLoadStart,
    options.onLoadedMetadata,
    options.onLoadedData,
    options.onCanPlay,
    options.onCanPlayThrough,
    options.onPlay,
    options.onPause,
    options.onPlaying,
    options.onEnded,
    options.onTimeUpdate,
    options.onDurationChange,
    options.onVolumeChange,
    options.onRateChange,
    options.onSeeking,
    options.onSeeked,
    options.onWaiting,
    options.onProgress,
    options.onError,
    options.onWarning,
    options.onTrackChange,
    options.onStateChange,
    options.onRendererChange,
    options.onRendererFallback,
  ]);

  // useSyncExternalStore for optimal React 18+ performance
  const subscribe = useCallback((onStoreChange: () => void) => {
    subscribersRef.current.add(onStoreChange);
    return () => {
      subscribersRef.current.delete(onStoreChange);
    };
  }, []);

  const getSnapshot = useCallback(() => stateRef.current, []);

  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // Memoized API methods
  const load = useCallback(async (source: MediaSource, loadOptions?: LoadOptions) => {
    if (!playerRef.current) throw new Error('Player not initialized');
    return playerRef.current.load(source, loadOptions);
  }, []);

  const play = useCallback(async () => {
    if (!playerRef.current) throw new Error('Player not initialized');
    return playerRef.current.play();
  }, []);

  const pause = useCallback(() => {
    if (!playerRef.current) throw new Error('Player not initialized');
    playerRef.current.pause();
  }, []);

  const seek = useCallback(async (time: number, seekOptions?: SeekOptions) => {
    if (!playerRef.current) throw new Error('Player not initialized');
    return playerRef.current.seek(time, seekOptions);
  }, []);

  const stop = useCallback(async () => {
    if (!playerRef.current) throw new Error('Player not initialized');
    return playerRef.current.stop();
  }, []);

  const screenshot = useCallback(async (screenshotOptions?: ScreenshotOptions) => {
    if (!playerRef.current) throw new Error('Player not initialized');
    return playerRef.current.screenshot(screenshotOptions);
  }, []);

  const setRenderTarget = useCallback(async (canvas: HTMLCanvasElement | OffscreenCanvas) => {
    if (!playerRef.current) throw new Error('Player not initialized');
    return playerRef.current.setRenderTarget(canvas);
  }, []);

  const switchRenderer = useCallback(async (type: RendererType) => {
    if (!playerRef.current) throw new Error('Player not initialized');
    return playerRef.current.switchRenderer(type);
  }, []);

  const rendererType = state?.rendererType ?? null;

  return {
    player: playerRef.current,
    state,
    load,
    play,
    pause,
    seek,
    stop,
    screenshot,
    setRenderTarget,
    switchRenderer,
    rendererType,
  };
}
