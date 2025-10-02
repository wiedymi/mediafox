import type { InputAudioTrack, InputVideoTrack } from 'mediabunny';
import type { PlaybackController } from '../playback/controller';
import type { SourceManager } from '../sources/manager';
import type { Store } from '../state/store';
import type { TrackManager } from '../tracks/manager';
import type { PlayerEventMap } from '../types';
import { KeyedLock } from '../utils/async-lock';
import { logger } from '../utils/logger';

type EmitFn = <K extends keyof PlayerEventMap>(event: K, data: PlayerEventMap[K]) => void;

export interface TrackSwitcherDeps {
  sourceManager: SourceManager;
  trackManager: TrackManager;
  playbackController: PlaybackController;
  emit: EmitFn;
  store: Store;
  getCurrentInput: () => import('mediabunny').Input | null;
}

export class TrackSwitcher {
  private deps: TrackSwitcherDeps;
  private locks = new KeyedLock();

  constructor(deps: TrackSwitcherDeps) {
    this.deps = deps;
  }

  async setupInitialTracks(
    videoTrack: InputVideoTrack | null,
    audioTrack: InputAudioTrack | null
  ): Promise<{ videoSupported: boolean; audioSupported: boolean; warningMessage: string }> {
    let videoSupported = false;
    let audioSupported = false;
    let warningMessage = '';

    if (videoTrack) {
      try {
        videoSupported = await this.locks.run('video', async () => {
          if (videoTrack.codec !== null && (await videoTrack.canDecode())) {
            return await this.deps.playbackController.trySetVideoTrack(videoTrack);
          }
          return false;
        });
        if (!videoSupported) warningMessage += 'Unsupported video codec. ';
      } catch (error) {
        warningMessage += 'Failed to set up video track. ';
        logger.warn('Video track error:', error);
      }
    }

    if (audioTrack) {
      try {
        audioSupported = await this.locks.run('audio', async () => {
          if (audioTrack.codec !== null && (await audioTrack.canDecode())) {
            return await this.deps.playbackController.trySetAudioTrack(audioTrack);
          }
          return false;
        });
        if (!audioSupported) warningMessage += 'Unsupported audio codec. ';
      } catch (error) {
        warningMessage += 'Failed to set up audio track. ';
        logger.warn('Audio track error:', error);
      }
    }

    if (!videoSupported && !audioSupported && !warningMessage) {
      warningMessage = 'No audio or video track found.';
    }

    return { videoSupported, audioSupported, warningMessage };
  }

  async selectVideoTrack(trackManager: TrackManager, trackId: string | null): Promise<void> {
    if (!trackManager.selectVideoTrack(trackId)) {
      throw new Error(`Invalid video track ID: ${trackId}`);
    }
    const track = trackManager.getSelectedVideoTrack();
    if (!track) {
      await this.deps.playbackController.setVideoTrack(null);
      return;
    }

    const ok = await this.locks.run('video', async () => {
      if (track.codec !== null && (await track.canDecode())) {
        return await this.deps.playbackController.trySetVideoTrack(track);
      }
      return false;
    });

    if (!ok) {
      this.deps.emit('warning', {
        type: 'video-codec-unsupported',
        message: `Video codec not supported.`,
        error: undefined,
      });
      await this.deps.playbackController.setVideoTrack(null);
    }
  }

  async selectAudioTrack(trackManager: TrackManager, trackId: string | null): Promise<void> {
    if (!trackManager.selectAudioTrack(trackId)) {
      throw new Error(`Invalid audio track ID: ${trackId}`);
    }
    const track = trackManager.getSelectedAudioTrack();
    if (!track) {
      await this.deps.playbackController.setAudioTrack(null);
      return;
    }

    const ok = await this.locks.run('audio', async () => {
      if (track.codec !== null && (await track.canDecode())) {
        return await this.deps.playbackController.trySetAudioTrack(track);
      }
      return false;
    });

    if (!ok) {
      this.deps.emit('warning', {
        type: 'audio-codec-unsupported',
        message: `Audio codec not supported. Continuing without audio.`,
        error: undefined,
      });
      await this.deps.playbackController.setAudioTrack(null);
    }
  }
}
