/**
 * Fallback decoder for handling unsupported codecs
 * Accepts separate decoder functions for audio and video tracks
 */

/**
 * Audio decoder function - converts audio track to a browser-friendly format.
 * Receives bytes that represent only the selected audio track.
 */
export type AudioDecoderFunction = (
  data: Uint8Array,
  trackIndex: number,
  options?: { onProgress?: (progress: number) => void }
) => Promise<Uint8Array>;

/**
 * Video decoder function - converts video track to H.264 MP4.
 * Receives bytes that represent only the selected video track.
 */
export type VideoDecoderFunction = (
  data: Uint8Array,
  trackIndex: number,
  options?: { onProgress?: (progress: number) => void }
) => Promise<Uint8Array>;

/**
 * Audio decoder that takes the full input file bytes and a track index.
 * Implementations should demux and convert the specified audio stream.
 */
// (Removed legacy split API)

/**
 * Video decoder that takes the full input file bytes and a track index.
 * Implementations should demux and convert the specified video stream.
 */
// (Removed legacy split API)

/**
 * Fallback decoder configuration
 */
export interface FallbackDecoderConfig {
  decodeAudioTrack?: AudioDecoderFunction;
  decodeVideoTrack?: VideoDecoderFunction;
}

/**
 * Result of a fallback decode operation
 */
export interface FallbackDecodeResult {
  data: Uint8Array;
  mimeType: string;
  codec: string;
}

/**
 * Fallback decoder for unsupported codecs
 */
export class MediaConverterDecoder {
  private audioDecoder?: AudioDecoderFunction;
  private videoDecoder?: VideoDecoderFunction;
  // unified API only

  constructor(config: FallbackDecoderConfig) {
    this.audioDecoder = config.decodeAudioTrack;
    this.videoDecoder = config.decodeVideoTrack;
    // unified API only
  }

  /**
   * Check if we can handle audio fallback
   */
  canDecodeAudio(): boolean {
    return !!this.audioDecoder;
  }

  /**
   * Check if we can handle video fallback
   */
  canDecodeVideo(): boolean {
    return !!this.videoDecoder;
  }

  /**
   * Decode an audio track to a browser-friendly format (AAC/ADTS recommended)
   */
  async decodeAudio(
    data: Uint8Array,
    trackIndex: number,
    options?: { onProgress?: (progress: number) => void }
  ): Promise<FallbackDecodeResult> {
    if (!this.audioDecoder) {
      throw new Error('No audio decoder configured');
    }

    const decodedData = await this.audioDecoder(data, trackIndex, options);

    return {
      data: decodedData,
      mimeType: 'audio/aac',
      codec: 'aac',
    };
  }

  // unified API only; per-input decode handled by decodeAudio

  /**
   * Decode a video track to H.264 MP4
   */
  async decodeVideo(
    data: Uint8Array,
    trackIndex: number,
    options?: { onProgress?: (progress: number) => void }
  ): Promise<FallbackDecodeResult> {
    if (!this.videoDecoder) {
      throw new Error('No video decoder configured');
    }

    const decodedData = await this.videoDecoder(data, trackIndex, options);

    return {
      data: decodedData,
      mimeType: 'video/mp4',
      codec: 'h264',
    };
  }

  // unified API only; per-input decode handled by decodeVideo

  /**
   * Dispose of any resources
   */
  async dispose(): Promise<void> {
    // Cleanup if needed
  }
}
