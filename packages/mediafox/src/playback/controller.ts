import type { InputAudioTrack, InputVideoTrack } from 'mediabunny';
import type { PluginManager } from '../plugins/manager';
import { AudioManager } from './audio';
import { VideoRenderer } from './renderer';
import type { RendererType, Rotation } from './renderers';

// Constants for timing intervals
const RENDER_INTERVAL_MS = 100; // Interval for background tab rendering
const SYNC_INTERVAL_MS = 250; // Interval for time update sync

export interface PlaybackControllerOptions {
  canvas?: HTMLCanvasElement | OffscreenCanvas;
  audioContext?: AudioContext;
  volume?: number;
  muted?: boolean;
  playbackRate?: number;
  rendererType?: RendererType;
}

export class PlaybackController {
  private videoRenderer: VideoRenderer;
  private audioManager: AudioManager;
  private playing = false;
  private currentTime = 0;
  private duration = 0;
  private playbackRate = 1;
  private animationFrameId: number | null = null;
  private lastFrameTime = 0;
  private syncIntervalId: number | null = null;
  private renderIntervalId: number | null = null;
  private isWaiting = false;
  private onTimeUpdate?: (time: number) => void;
  private onEnded?: () => void;
  private onWaiting?: () => void;
  private onPlaying?: () => void;
  private pendingSeekTime: number | null = null;
  private isSeeking = false;
  private seekRequestId = 0;

  constructor(options: PlaybackControllerOptions = {}) {
    this.videoRenderer = new VideoRenderer({
      canvas: options.canvas,
      rendererType: options.rendererType,
    });

    this.audioManager = new AudioManager({
      audioContext: options.audioContext,
      volume: options.volume,
      muted: options.muted,
    });

    this.playbackRate = options.playbackRate ?? 1;
  }

  async setVideoTrack(track: InputVideoTrack | null): Promise<void> {
    if (!track) {
      this.videoRenderer.dispose();
      return;
    }

    await this.videoRenderer.setVideoTrack(track);
    const duration = await track.computeDuration();
    this.duration = Math.max(this.duration, duration);
  }

  /**
   * Attempt to set video track without throwing. Returns true on success.
   */
  async trySetVideoTrack(track: InputVideoTrack | null): Promise<boolean> {
    try {
      await this.setVideoTrack(track);
      return true;
    } catch {
      return false;
    }
  }

  async setAudioTrack(track: InputAudioTrack | null): Promise<void> {
    const resumePlayback = this.playing;
    const resumeTime = this.getCurrentTime();

    if (!track) {
      this.audioManager.dispose();
      return;
    }

    const trackDuration = await track.computeDuration();
    const clampedResumeTime = Math.max(0, Math.min(resumeTime, trackDuration));

    await this.audioManager.setAudioTrack(track);
    await this.audioManager.seek(clampedResumeTime);

    if (resumePlayback) {
      await this.audioManager.play(clampedResumeTime);
    }

    this.currentTime = clampedResumeTime;
    this.duration = Math.max(this.duration, trackDuration);
  }

  /**
   * Attempt to set audio track without throwing. Returns true on success.
   */
  async trySetAudioTrack(track: InputAudioTrack | null): Promise<boolean> {
    try {
      await this.setAudioTrack(track);
      return true;
    } catch {
      return false;
    }
  }

  async setCanvas(canvas: HTMLCanvasElement | OffscreenCanvas): Promise<void> {
    await this.videoRenderer.setCanvas(canvas);
  }

  async play(): Promise<void> {
    if (this.playing) return;

    this.playing = true;
    this.lastFrameTime = performance.now();

    // If we're at the end, restart from beginning
    if (this.currentTime >= this.duration) {
      this.currentTime = 0;
      await this.videoRenderer.seek(0);
    }

    // Start audio playback
    await this.audioManager.play(this.currentTime);

    // Start video rendering loop
    this.startRenderLoop();

    // Start sync interval for time updates
    this.startSyncInterval();
  }

  pause(): void {
    if (!this.playing) return;

    this.playing = false;

    // Clear waiting state without emitting playing event (we're pausing, not playing)
    this.isWaiting = false;

    // Pause audio
    this.audioManager.pause();

    // Stop render loop
    this.stopRenderLoop();

    // Stop sync interval
    this.stopSyncInterval();

    // Update current time to audio time (most accurate)
    if (this.audioManager.isPlaying()) {
      this.currentTime = this.audioManager.getCurrentTime();
    }
  }

  async seek(time: number): Promise<void> {
    const clampedTime = Math.max(0, Math.min(time, this.duration));
    this.currentTime = clampedTime;

    // Update UI immediately
    if (this.onTimeUpdate) {
      this.onTimeUpdate(this.currentTime);
    }

    // Latest-only seek behavior: keep only the newest target.
    this.seekRequestId++;
    this.pendingSeekTime = clampedTime;

    if (!this.isSeeking) {
      await this.processPendingSeeks();
    }
  }

  private async processPendingSeeks(): Promise<void> {
    if (this.isSeeking) return;
    this.isSeeking = true;

    try {
      while (this.pendingSeekTime !== null) {
        const targetTime = this.pendingSeekTime;
        this.pendingSeekTime = null;
        const requestIdAtStart = this.seekRequestId;

        // Seek video first so frame display responds quickly.
        await this.videoRenderer.seek(targetTime);

        // If a newer seek arrived while video seek was running, skip this audio seek.
        if (requestIdAtStart !== this.seekRequestId) {
          continue;
        }

        await this.audioManager.seek(targetTime);
      }
    } finally {
      this.isSeeking = false;
    }

    // Handle race where a seek arrived after loop exit but before isSeeking was reset.
    if (this.pendingSeekTime !== null) {
      await this.processPendingSeeks();
    }
  }

  private startRenderLoop(): void {
    if (this.animationFrameId !== null || this.renderIntervalId !== null) {
      // Already running
      return;
    }

    const render = (requestNextFrame = true) => {
      if (!this.playing) return;

      // Get accurate time from audio manager if available
      if (this.isSeeking) {
        // Keep requested seek time stable while async seek operations settle.
      } else if (this.audioManager.isPlaying()) {
        this.currentTime = this.audioManager.getCurrentTime();
      } else {
        // Fallback to manual time tracking
        const now = performance.now();
        const deltaTime = (now - this.lastFrameTime) / 1000;
        this.lastFrameTime = now;
        this.currentTime += deltaTime * this.playbackRate;
      }

      // Check for end of playback
      if (this.currentTime >= this.duration) {
        this.handleEnded();
        return;
      }

      // Update video frame synchronously
      const { isStarving } = this.videoRenderer.updateFrame(this.currentTime);

      // Handle buffering state changes
      if (isStarving && !this.isWaiting) {
        this.isWaiting = true;
        if (this.onWaiting) {
          this.onWaiting();
        }
      } else if (!isStarving && this.isWaiting) {
        this.isWaiting = false;
        if (this.onPlaying) {
          this.onPlaying();
        }
      }

      // Schedule next frame
      if (requestNextFrame) {
        this.animationFrameId = requestAnimationFrame(() => render());
      }
    };

    // Start the render loop
    this.animationFrameId = requestAnimationFrame(() => render());

    // Also call render on an interval to ensure updates even when tab is not visible
    if (this.renderIntervalId === null) {
      this.renderIntervalId = window.setInterval(() => render(false), RENDER_INTERVAL_MS);
    }
  }

  private stopRenderLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.renderIntervalId !== null) {
      clearInterval(this.renderIntervalId);
      this.renderIntervalId = null;
    }
  }

  private startSyncInterval(): void {
    if (this.syncIntervalId !== null) return;
    // Sync for time updates
    this.syncIntervalId = window.setInterval(() => {
      if (this.playing && this.onTimeUpdate) {
        this.onTimeUpdate(this.currentTime);
      }
    }, SYNC_INTERVAL_MS);
  }

  private stopSyncInterval(): void {
    if (this.syncIntervalId !== null) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
    }
  }

  private handleEnded(): void {
    this.pause();
    this.currentTime = this.duration;

    if (this.onEnded) {
      this.onEnded();
    }
  }

  getCurrentTime(): number {
    if (this.playing && !this.isSeeking && this.audioManager.isPlaying()) {
      return this.audioManager.getCurrentTime();
    }
    return this.currentTime;
  }

  getDuration(): number {
    return this.duration;
  }

  setDuration(duration: number): void {
    this.duration = duration;
  }

  isPlaying(): boolean {
    return this.playing;
  }

  setVolume(volume: number): void {
    this.audioManager.setVolume(volume);
  }

  getVolume(): number {
    return this.audioManager.getVolume();
  }

  setMuted(muted: boolean): void {
    this.audioManager.setMuted(muted);
  }

  isMuted(): boolean {
    return this.audioManager.isMuted();
  }

  setPlaybackRate(rate: number): void {
    const clamped = Math.max(0.25, Math.min(4, rate));
    if (this.playbackRate === clamped) {
      return;
    }

    this.playbackRate = clamped;
    this.audioManager.setPlaybackRate(clamped);

    // Reset manual timer to avoid jumps when running without audio
    this.lastFrameTime = performance.now();
  }

  getPlaybackRate(): number {
    return this.playbackRate;
  }

  setTimeUpdateCallback(callback: (time: number) => void): void {
    this.onTimeUpdate = callback;
  }

  setEndedCallback(callback: () => void): void {
    this.onEnded = callback;
  }

  setWaitingCallback(callback: () => void): void {
    this.onWaiting = callback;
  }

  setPlayingCallback(callback: () => void): void {
    this.onPlaying = callback;
  }

  isBuffering(): boolean {
    return this.isWaiting;
  }

  async screenshot(options?: { format?: 'png' | 'jpeg' | 'webp'; quality?: number }): Promise<Blob | null> {
    return this.videoRenderer.screenshot(this.currentTime, options);
  }

  getVideoRenderer(): VideoRenderer {
    return this.videoRenderer;
  }

  getAudioManager(): AudioManager {
    return this.audioManager;
  }

  async switchRenderer(type: RendererType): Promise<void> {
    await this.videoRenderer.switchRenderer(type);
  }

  getRendererType(): RendererType {
    return this.videoRenderer.getRendererType();
  }

  updateCanvasDimensions(): void {
    this.videoRenderer.updateCanvasDimensions();
  }

  setRendererChangeCallback(callback: (type: RendererType) => void): void {
    this.videoRenderer.setRendererChangeCallback(callback);
  }

  setRendererFallbackCallback(callback: (from: RendererType, to: RendererType) => void): void {
    this.videoRenderer.setRendererFallbackCallback(callback);
  }

  setRotationChangeCallback(
    callback: (rotation: Rotation, displaySize: { width: number; height: number }) => void
  ): void {
    this.videoRenderer.setRotationChangeCallback(callback);
  }

  setRotation(rotation: Rotation): void {
    this.videoRenderer.setRotation(rotation);
  }

  getRotation(): Rotation {
    return this.videoRenderer.getRotation();
  }

  getDisplaySize(): { width: number; height: number } {
    return this.videoRenderer.getDisplaySize();
  }

  setPluginManager(pluginManager: PluginManager): void {
    this.videoRenderer.setPluginManager(pluginManager);
    this.audioManager.setPluginManager(pluginManager);
  }

  getCanvas(): HTMLCanvasElement | OffscreenCanvas | null {
    return this.videoRenderer.getCanvas();
  }

  refreshOverlays(): void {
    this.videoRenderer.refreshOverlays();
  }

  /**
   * Rebuild the audio graph with current plugin hooks.
   * Call this after installing/uninstalling audio plugins.
   */
  rebuildAudioGraph(): void {
    this.audioManager.rebuildAudioGraph();
  }

  async reset(): Promise<void> {
    // Stop playback completely
    this.pause();

    // Clear any pending animation frames/intervals first
    this.stopRenderLoop();
    this.stopSyncInterval();

    // Reset time to beginning
    this.currentTime = 0;
    this.duration = 0;

    // Clear iterators to stop in-flight async operations before input is disposed
    await Promise.all([this.videoRenderer.clearIterators(), this.audioManager.clearIterators()]);

    // Reset playback rate to default
    this.playbackRate = 1;
    this.lastFrameTime = 0;
    this.seekRequestId++;
    this.pendingSeekTime = null;
    this.isSeeking = false;
  }

  dispose(): void {
    this.pause();
    this.seekRequestId++;
    this.pendingSeekTime = null;
    this.isSeeking = false;
    this.videoRenderer.dispose();
    this.audioManager.dispose();
    this.onTimeUpdate = undefined;
    this.onEnded = undefined;
    this.onWaiting = undefined;
    this.onPlaying = undefined;
  }

  destroy(): void {
    this.dispose();
    this.audioManager.destroy();
  }
}
