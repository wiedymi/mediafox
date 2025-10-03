import { PlayerCore } from './core/player-core';
import { StateFacade } from './core/state-facade';
import { TrackSwitcher } from './core/track-switcher';
import { EventEmitter } from './events/emitter';
import type { UnsubscribeFn } from './events/types';
import { PlaybackController } from './playback/controller';
import { RendererFactory } from './playback/renderers';
import { SourceManager } from './sources/manager';
import { Store } from './state/store';
import { TrackManager } from './tracks/manager';
import type { SubtitleTrackRegistration, SubtitleTrackResource } from './tracks/types';
import type {
  AudioTrackInfo,
  LoadOptions,
  MediaSource,
  PlayerEventListener,
  PlayerEventMap,
  PlayerOptions,
  PlayerStateData,
  RendererType,
  ScreenshotOptions,
  SeekOptions,
  Subscription,
  SubtitleTrackInfo,
  VideoTrackInfo,
} from './types';
//

export class MediaFox {
  private emitter: EventEmitter<PlayerEventMap>;
  private store: Store;
  private state: StateFacade;
  private sourceManager: SourceManager;
  private playbackController: PlaybackController;
  private trackManager: TrackManager;
  private options: PlayerOptions;
  private disposed = false;
  private getCurrentInput = () => this.sourceManager.getCurrentSource()?.input ?? null;
  private trackSwitcher: TrackSwitcher;
  private core: PlayerCore;

  constructor(options: PlayerOptions = {}) {
    this.options = {
      volume: 1,
      muted: false,
      playbackRate: 1,
      autoplay: false,
      preload: 'metadata',
      ...options,
    };

    // Initialize components
    this.emitter = new EventEmitter({ maxListeners: 100 });
    this.store = new Store();
    this.state = new StateFacade(this.store);
    this.sourceManager = new SourceManager({
      maxCacheSize: options.maxCacheSize,
      crossOrigin: options.crossOrigin,
    });
    this.playbackController = new PlaybackController({
      canvas: options.renderTarget,
      audioContext: options.audioContext,
      volume: this.options.volume,
      muted: this.options.muted,
      playbackRate: this.options.playbackRate,
      rendererType: this.options.renderer,
    });
    this.trackManager = new TrackManager();

    this.trackSwitcher = new TrackSwitcher({
      sourceManager: this.sourceManager,
      trackManager: this.trackManager,
      playbackController: this.playbackController,
      emit: this.emit.bind(this),
      store: this.store,
      getCurrentInput: this.getCurrentInput,
    });

    this.core = new PlayerCore({
      state: this.state,
      sourceManager: this.sourceManager,
      trackManager: this.trackManager,
      playbackController: this.playbackController,
      trackSwitcher: this.trackSwitcher,
      emit: this.emit.bind(this),
    });

    // Setup internal listeners
    this.setupInternalListeners();

    // Apply initial state
    this.state.applyInitial(this.options.volume ?? 1, this.options.muted ?? false, this.options.playbackRate ?? 1);

    // Initialize renderer type in state to requested type (default to webgpu)
    // The actual renderer type will be updated when initialization completes
    this.state.updateRendererType(this.options.renderer || 'webgpu');
  }

  private setupInternalListeners(): void {
    // Playback controller listeners
    this.playbackController.setTimeUpdateCallback((time) => {
      this.state.updateTime(time);
      this.emit('timeupdate', { currentTime: time });
    });

    this.playbackController.setEndedCallback(() => {
      this.state.updateEndedState(true);
      this.emit('ended', undefined);
    });

    // Track manager listeners
    this.trackManager.setTrackChangeListener((event) => {
      this.state.updateSelectedTracks(event.type, event.newTrackId);
      this.emit('trackchange', {
        type: event.type,
        trackId: event.newTrackId,
      });
    });

    // Renderer callbacks
    this.playbackController.setRendererChangeCallback((type) => {
      this.state.updateRendererType(type);
      this.emit('rendererchange', type);
    });

    this.playbackController.setRendererFallbackCallback((from, to) => {
      this.emit('rendererfallback', { from, to });
    });

    // State change listener
    this.state.subscribe((state) => {
      this.emit('statechange', state);
    });
  }

  // Main API Methods

  /**
   * Load a media source and prepare playback.
   * Emits: loadstart, loadedmetadata, loadeddata, canplay, canplaythrough (or error)
   */
  async load(source: MediaSource, options: LoadOptions = {}): Promise<void> {
    this.checkDisposed();
    return this.core.load(source, {
      autoplay: options.autoplay ?? this.options.autoplay,
      startTime: options.startTime,
    });
  }

  /** Start playback. */
  async play(): Promise<void> {
    this.checkDisposed();
    return this.core.play();
  }

  pause(): void {
    this.checkDisposed();
    this.core.pause();
  }

  /** Seek to a new time (seconds). */
  async seek(time: number, _options: SeekOptions = {}): Promise<void> {
    this.checkDisposed();
    return this.core.seek(time);
  }

  /** Pause and reset to time 0. */
  async stop(): Promise<void> {
    this.checkDisposed();
    return this.core.stop();
  }

  // Property getters/setters

  get currentTime(): number {
    return this.playbackController.getCurrentTime();
  }

  /**
   * Sets the current playback time. Note: This is a fire-and-forget operation.
   * Use seek() directly if you need to await the operation.
   */
  set currentTime(time: number) {
    this.seek(time);
  }

  get duration(): number {
    return this.state.getState().duration;
  }

  get volume(): number {
    return this.playbackController.getVolume();
  }

  set volume(value: number) {
    this.checkDisposed();
    const volume = Math.max(0, Math.min(1, value));
    this.playbackController.setVolume(volume);
    this.state.updateVolume(volume, this.muted);
    this.emit('volumechange', { volume, muted: this.muted });
  }

  get muted(): boolean {
    return this.playbackController.isMuted();
  }

  set muted(value: boolean) {
    this.checkDisposed();
    this.playbackController.setMuted(value);
    this.state.updateVolume(this.volume, value);
    this.emit('volumechange', { volume: this.volume, muted: value });
  }

  get playbackRate(): number {
    return this.playbackController.getPlaybackRate();
  }

  set playbackRate(value: number) {
    this.checkDisposed();
    const rate = Math.max(0.25, Math.min(4, value));
    this.playbackController.setPlaybackRate(rate);
    this.state.updatePlaybackRate(rate);
    this.emit('ratechange', { playbackRate: rate });
  }

  get paused(): boolean {
    return !this.playbackController.isPlaying();
  }

  get ended(): boolean {
    return this.state.getState().ended;
  }

  get seeking(): boolean {
    return this.state.getState().seeking;
  }

  // Track management

  getVideoTracks(): VideoTrackInfo[] {
    return this.trackManager.getVideoTracks();
  }

  getAudioTracks(): AudioTrackInfo[] {
    return this.trackManager.getAudioTracks();
  }

  getSubtitleTracks(): SubtitleTrackInfo[] {
    return this.trackManager.getSubtitleTracks();
  }

  async selectVideoTrack(trackId: string | null): Promise<void> {
    this.checkDisposed();
    await this.trackSwitcher.selectVideoTrack(this.trackManager, trackId);
  }

  async selectAudioTrack(trackId: string | null): Promise<void> {
    this.checkDisposed();
    await this.trackSwitcher.selectAudioTrack(this.trackManager, trackId);
  }

  selectSubtitleTrack(trackId: string | null): void {
    this.checkDisposed();

    if (!this.trackManager.selectSubtitleTrack(trackId)) {
      throw new Error(`Invalid subtitle track ID: ${trackId}`);
    }
  }

  registerSubtitleTracks(sourceId: string, registrations: SubtitleTrackRegistration[]): void {
    this.trackManager.registerSubtitleTracks(sourceId, registrations);
    this.state.updateTracks(undefined, undefined, this.trackManager.getSubtitleTracks());

    const currentInfo = this.state.getState().mediaInfo;
    if (currentInfo) {
      this.state.updateMediaInfo({
        ...currentInfo,
        hasSubtitles: this.trackManager.hasSubtitles(),
      });
    }
  }

  unregisterSubtitleTracks(sourceId: string): void {
    this.trackManager.unregisterSubtitleTracks(sourceId);
    this.state.updateTracks(undefined, undefined, this.trackManager.getSubtitleTracks());

    const currentInfo = this.state.getState().mediaInfo;
    if (currentInfo) {
      this.state.updateMediaInfo({
        ...currentInfo,
        hasSubtitles: this.trackManager.hasSubtitles(),
      });
    }
  }

  async getSubtitleTrackResource(trackId: string | null): Promise<SubtitleTrackResource | null> {
    return this.trackManager.getSubtitleTrackResource(trackId);
  }

  // Utility methods

  /** Capture a screenshot of the current frame. */
  async screenshot(options: ScreenshotOptions = {}): Promise<Blob | null> {
    this.checkDisposed();
    return this.playbackController.screenshot(options);
  }

  async setRenderTarget(canvas: HTMLCanvasElement | OffscreenCanvas): Promise<void> {
    this.checkDisposed();
    await this.playbackController.setCanvas(canvas);
  }

  getRendererType(): RendererType {
    return this.playbackController.getRendererType();
  }

  async switchRenderer(type: RendererType): Promise<void> {
    this.checkDisposed();
    await this.playbackController.switchRenderer(type);
  }

  /**
   * Updates canvas backing buffer to match its CSS display size.
   * Call this after changing CSS dimensions to prevent stretching.
   */
  updateCanvasDimensions(): void {
    this.checkDisposed();
    this.playbackController.updateCanvasDimensions();
  }

  static getSupportedRenderers(): RendererType[] {
    return RendererFactory.getSupportedRenderers();
  }

  getState(): Readonly<PlayerStateData> {
    return this.state.getState();
  }

  /** Subscribe to state changes; returns an unsubscribe handle. */
  subscribe(listener: (state: PlayerStateData) => void): Subscription {
    const unsubscribe = this.state.subscribe(listener);
    return { unsubscribe };
  }

  // Event handling

  on<K extends keyof PlayerEventMap>(event: K, listener: PlayerEventListener<K>): UnsubscribeFn {
    return this.emitter.on(event, listener);
  }

  once<K extends keyof PlayerEventMap>(event: K, listener: PlayerEventListener<K>): UnsubscribeFn {
    return this.emitter.once(event, listener);
  }

  off<K extends keyof PlayerEventMap>(event: K, listener?: PlayerEventListener<K>): void {
    this.emitter.off(event, listener);
  }

  private emit<K extends keyof PlayerEventMap>(event: K, data: PlayerEventMap[K]): void {
    this.emitter.emit(event, data);
  }

  private checkDisposed(): void {
    if (this.disposed) {
      throw new Error('Player has been disposed');
    }
  }

  // Cleanup

  dispose(): void {
    if (this.disposed) return;

    this.disposed = true;

    // Dispose components
    this.playbackController.dispose();
    this.trackManager.dispose();
    this.sourceManager.dispose();
    this.state.reset();
    this.emitter.removeAllListeners();
  }

  destroy(): void {
    this.dispose();
    this.playbackController.destroy();
  }
}
