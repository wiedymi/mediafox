import type { Input, InputAudioTrack, InputVideoTrack } from 'mediabunny';
import type { MediaConverterDecoder } from '../decoders/media-converter-decoder';
import type { PlaybackController } from '../playback/controller';
import type { SourceManager } from '../sources/manager';
import type { Store } from '../state/store';
import type { TrackManager } from '../tracks/manager';
import type { MediaSource, PlayerEventMap } from '../types';
import { logger } from './logger';

type EmitFn = <K extends keyof PlayerEventMap>(event: K, data: PlayerEventMap[K]) => void;

interface CommonDeps {
  sourceManager: SourceManager;
  trackManager: TrackManager;
  playbackController: PlaybackController;
  fallbackDecoder?: MediaConverterDecoder;
  emit: EmitFn;
  store: Store;
  /** Prefer the current live Input from SourceManager when available */
  getCurrentInput?: () => Input | null;
}

export async function ensureVideoTrackPlayable(track: InputVideoTrack, deps: CommonDeps): Promise<boolean> {
  if (track.codec !== null && (await track.canDecode())) {
    await deps.playbackController.setVideoTrack(track);
    return true;
  }

  if (!deps.fallbackDecoder?.canDecodeVideo()) return false;

  const conversionStartTime = Date.now();
  deps.emit('conversionstart', {
    type: 'video',
    trackId: track.id.toString(),
    reason: track.codec === null ? 'unsupported-codec' : 'decode-error',
  });

  try {
    const currentSource = deps.sourceManager.getOriginalSource();
    if (!currentSource) throw new Error('No source available for conversion');

    // Find index using current input when possible (avoids re-creating input)
    let index = 0;
    const liveInput = deps.getCurrentInput?.();
    if (liveInput) {
      const vts = await liveInput.getVideoTracks();
      index = Math.max(
        0,
        vts.findIndex((t) => t.id === track.id)
      );
    } else {
      // lazily import only if needed
      const { Input, BufferSource, ALL_FORMATS } = await import('mediabunny');
      const bytes = await getSourceBytes(currentSource);
      const temp = new Input({ source: new BufferSource(bytes), formats: ALL_FORMATS });
      const vts = await temp.getVideoTracks();
      index = Math.max(
        0,
        vts.findIndex((t) => t.id === track.id)
      );
    }

    deps.emit('conversionprogress', {
      type: 'video',
      trackId: track.id.toString(),
      progress: 40,
      stage: 'converting',
    });

    const srcBytes = await getSourceBytes(currentSource);
    const result = await deps.fallbackDecoder.decodeVideo(srcBytes, index, {
      onProgress: (p) => {
        deps.emit('conversionprogress', {
          type: 'video',
          trackId: track.id.toString(),
          progress: Math.max(40, Math.min(80, p)),
          stage: 'converting',
        });
      },
    });

    deps.emit('conversionprogress', {
      type: 'video',
      trackId: track.id.toString(),
      progress: 80,
      stage: 'finalizing',
    });

    const { Input, BufferSource, ALL_FORMATS } = await import('mediabunny');
    const tempInput = new Input({ source: new BufferSource(result.data), formats: ALL_FORMATS });
    const convertedTracks = await tempInput.getVideoTracks();
    if (!convertedTracks.length) throw new Error('Video conversion produced no tracks');

    const converted = convertedTracks[0];
    await deps.trackManager.replaceVideoTrackByInputId(track.id, converted);
    deps.store.updateTracks(deps.trackManager.getVideoTracks(), undefined, undefined);
    await deps.playbackController.setVideoTrack(converted);

    const duration = Date.now() - conversionStartTime;
    logger.info(`Successfully using converted video track in ${duration}ms`);
    deps.emit('conversioncomplete', { type: 'video', trackId: track.id.toString(), duration });
    return true;
  } catch (err) {
    deps.emit('conversionerror', { type: 'video', trackId: track.id.toString(), error: err as Error });
    logger.warn('Video fallback error:', err);
    await deps.playbackController.setVideoTrack(null);
    return false;
  }
}

export async function ensureAudioTrackPlayable(track: InputAudioTrack, deps: CommonDeps): Promise<boolean> {
  const canDecode = await track.canDecode();
  if (track.codec !== null && canDecode) {
    await deps.playbackController.setAudioTrack(track);
    return true;
  }

  if (!deps.fallbackDecoder?.canDecodeAudio()) return false;

  const conversionStartTime = Date.now();
  deps.emit('conversionstart', {
    type: 'audio',
    trackId: track.id.toString(),
    reason: track.codec === null ? 'unsupported-codec' : 'decode-error',
  });

  try {
    const currentSource = deps.sourceManager.getOriginalSource();
    if (!currentSource) throw new Error('No source available for conversion');

    // Derive stream index from live input when possible
    let index = 0;
    const liveInput = deps.getCurrentInput?.();
    if (liveInput) {
      const ats = await liveInput.getAudioTracks();
      index = Math.max(
        0,
        ats.findIndex((t) => t.id === track.id)
      );
    } else {
      const { Input, BufferSource, ALL_FORMATS } = await import('mediabunny');
      const bytes = await getSourceBytes(currentSource);
      const temp = new Input({ source: new BufferSource(bytes), formats: ALL_FORMATS });
      const ats = await temp.getAudioTracks();
      index = Math.max(
        0,
        ats.findIndex((t) => t.id === track.id)
      );
    }

    deps.emit('conversionprogress', {
      type: 'audio',
      trackId: track.id.toString(),
      progress: 40,
      stage: 'converting',
    });

    const srcBytes = await getSourceBytes(currentSource);
    const result = await deps.fallbackDecoder.decodeAudio(srcBytes, index, {
      onProgress: (p) => {
        deps.emit('conversionprogress', {
          type: 'audio',
          trackId: track.id.toString(),
          progress: Math.max(40, Math.min(80, p)),
          stage: 'converting',
        });
      },
    });

    deps.emit('conversionprogress', {
      type: 'audio',
      trackId: track.id.toString(),
      progress: 80,
      stage: 'finalizing',
    });

    const { Input, BufferSource, ALL_FORMATS } = await import('mediabunny');
    const tempInput = new Input({ source: new BufferSource(result.data), formats: ALL_FORMATS });
    const convertedTracks = await tempInput.getAudioTracks();
    if (!convertedTracks.length) throw new Error('Audio conversion produced no tracks');

    const converted = convertedTracks[0];
    await deps.trackManager.replaceAudioTrackByInputId(track.id, converted);
    deps.store.updateTracks(undefined, deps.trackManager.getAudioTracks(), undefined);
    await deps.playbackController.setAudioTrack(converted);

    const duration = Date.now() - conversionStartTime;
    logger.info(`Successfully using converted audio track in ${duration}ms`);
    deps.emit('conversioncomplete', { type: 'audio', trackId: track.id.toString(), duration });
    return true;
  } catch (err) {
    deps.emit('conversionerror', { type: 'audio', trackId: track.id.toString(), error: err as Error });
    logger.warn('Audio fallback error:', err);
    await deps.playbackController.setAudioTrack(null);
    return false;
  }
}

// Local helper duplicated from XiaoMei to avoid circular imports
async function getSourceBytes(src: MediaSource): Promise<Uint8Array> {
  if (src instanceof Uint8Array) return src;
  if (src instanceof ArrayBuffer) return new Uint8Array(src);
  if (typeof Blob !== 'undefined' && src instanceof Blob) {
    const buf = await src.arrayBuffer();
    return new Uint8Array(buf);
  }
  if (typeof src === 'string' || (typeof URL !== 'undefined' && src instanceof URL)) {
    const res = await fetch(String(src));
    const buf = await res.arrayBuffer();
    return new Uint8Array(buf);
  }
  throw new Error('Cannot extract bytes from streaming sources');
}
