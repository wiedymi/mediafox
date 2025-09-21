import type { Input, InputAudioTrack, InputVideoTrack } from 'mediabunny';

import type { AudioTrackInfo, SubtitleTrackInfo, VideoTrackInfo } from '../types';

import type { SubtitleTrackRegistration, SubtitleTrackResource, TrackManagerState, TrackSelectionEvent } from './types';

export class TrackManager {
  private input: Input | null = null;
  private videoTracks: Map<string, InputVideoTrack> = new Map();
  private audioTracks: Map<string, InputAudioTrack> = new Map();
  private videoTrackInfos: VideoTrackInfo[] = [];
  private audioTrackInfos: AudioTrackInfo[] = [];
  private subtitleTrackInfos: SubtitleTrackInfo[] = [];
  private subtitleProviders: Map<string, SubtitleTrackRegistration[]> = new Map();
  private subtitleTrackResolvers: Map<string, () => Promise<SubtitleTrackResource>> = new Map();
  private selectedVideoTrack: string | null = null;
  private selectedAudioTrack: string | null = null;
  private selectedSubtitleTrack: string | null = null;
  private onTrackChange?: (event: TrackSelectionEvent) => void;

  async initialize(input: Input): Promise<void> {
    this.input = input;
    await this.loadTracks();
  }

  private async loadTracks(): Promise<void> {
    if (!this.input) return;

    // Load video tracks
    const videoTracks = await this.input.getVideoTracks();
    this.videoTrackInfos = await Promise.all(
      videoTracks.map(async (track) => {
        const id = `video-${track.id}`;
        this.videoTracks.set(id, track);

        // Get packet statistics for bitrate and frame rate
        let frameRate = 0;
        let bitrate = 0;
        try {
          const stats = await track.computePacketStats(100);
          frameRate = stats.averagePacketRate;
          bitrate = stats.averageBitrate;
        } catch {
          // Ignore errors in stats computation
        }

        const info: VideoTrackInfo = {
          id,
          codec: track.codec,
          language: track.languageCode,
          name: track.name,
          width: track.codedWidth,
          height: track.codedHeight,
          frameRate,
          bitrate,
          rotation: track.rotation,
          selected: false,
          decodable: await track.canDecode(),
          converted: false,
        };

        return info;
      })
    );

    // Load audio tracks
    const audioTracks = await this.input.getAudioTracks();
    this.audioTrackInfos = await Promise.all(
      audioTracks.map(async (track) => {
        const id = `audio-${track.id}`;
        this.audioTracks.set(id, track);

        // Get packet statistics for bitrate
        let bitrate = 0;
        try {
          const stats = await track.computePacketStats(100);
          bitrate = stats.averageBitrate;
        } catch {
          // Ignore errors in stats computation
        }

        const info: AudioTrackInfo = {
          id,
          codec: track.codec,
          language: track.languageCode,
          name: track.name,
          channels: track.numberOfChannels,
          sampleRate: track.sampleRate,
          bitrate,
          selected: false,
          decodable: await track.canDecode(),
          converted: false,
        };

        return info;
      })
    );

    // Auto-select first decodable tracks
    if (this.videoTrackInfos.length > 0) {
      const firstDecodable = this.videoTrackInfos.find((t) => t.decodable);
      if (firstDecodable) {
        this.selectVideoTrack(firstDecodable.id);
      }
    }

    if (this.audioTrackInfos.length > 0) {
      const firstDecodable = this.audioTrackInfos.find((t) => t.decodable);
      if (firstDecodable) {
        this.selectAudioTrack(firstDecodable.id);
      }
    }
  }

  getVideoTracks(): VideoTrackInfo[] {
    return [...this.videoTrackInfos];
  }

  getAudioTracks(): AudioTrackInfo[] {
    return [...this.audioTrackInfos];
  }

  getSubtitleTracks(): SubtitleTrackInfo[] {
    return [...this.subtitleTrackInfos];
  }

  getSelectedVideoTrack(): InputVideoTrack | null {
    if (!this.selectedVideoTrack) return null;
    return this.videoTracks.get(this.selectedVideoTrack) ?? null;
  }

  getSelectedAudioTrack(): InputAudioTrack | null {
    if (!this.selectedAudioTrack) return null;
    return this.audioTracks.get(this.selectedAudioTrack) ?? null;
  }

  getSelectedVideoTrackInfo(): VideoTrackInfo | null {
    if (!this.selectedVideoTrack) return null;
    return this.videoTrackInfos.find((t) => t.id === this.selectedVideoTrack) ?? null;
  }

  getSelectedAudioTrackInfo(): AudioTrackInfo | null {
    if (!this.selectedAudioTrack) return null;
    return this.audioTrackInfos.find((t) => t.id === this.selectedAudioTrack) ?? null;
  }

  getSelectedSubtitleTrackInfo(): SubtitleTrackInfo | null {
    if (!this.selectedSubtitleTrack) return null;
    return this.subtitleTrackInfos.find((t) => t.id === this.selectedSubtitleTrack) ?? null;
  }

  selectVideoTrack(trackId: string | null): boolean {
    if (trackId === this.selectedVideoTrack) return true;

    if (trackId && !this.videoTracks.has(trackId)) {
      return false;
    }

    const previousId = this.selectedVideoTrack;

    // Update selection state
    this.videoTrackInfos.forEach((track) => {
      track.selected = track.id === trackId;
    });

    this.selectedVideoTrack = trackId;

    // Notify change
    if (this.onTrackChange) {
      this.onTrackChange({
        type: 'video',
        previousTrackId: previousId,
        newTrackId: trackId,
      });
    }

    return true;
  }

  selectAudioTrack(trackId: string | null): boolean {
    if (trackId === this.selectedAudioTrack) return true;

    if (trackId && !this.audioTracks.has(trackId)) {
      return false;
    }

    const previousId = this.selectedAudioTrack;

    // Update selection state
    this.audioTrackInfos.forEach((track) => {
      track.selected = track.id === trackId;
    });

    this.selectedAudioTrack = trackId;

    // Notify change
    if (this.onTrackChange) {
      this.onTrackChange({
        type: 'audio',
        previousTrackId: previousId,
        newTrackId: trackId,
      });
    }

    return true;
  }

  selectSubtitleTrack(trackId: string | null): boolean {
    if (trackId === this.selectedSubtitleTrack) return true;

    if (trackId && !this.subtitleTrackResolvers.has(trackId)) {
      return false;
    }

    const previousId = this.selectedSubtitleTrack;

    // Update selection state
    this.subtitleTrackInfos.forEach((track) => {
      track.selected = track.id === trackId;
    });

    this.selectedSubtitleTrack = trackId;

    // Notify change
    if (this.onTrackChange) {
      this.onTrackChange({
        type: 'subtitle',
        previousTrackId: previousId,
        newTrackId: trackId,
      });
    }

    return true;
  }

  registerSubtitleTracks(sourceId: string, entries: SubtitleTrackRegistration[]): void {
    this.subtitleProviders.set(sourceId, entries);
    this.rebuildSubtitleTracks();
  }

  unregisterSubtitleTracks(sourceId: string): void {
    if (!this.subtitleProviders.delete(sourceId)) {
      return;
    }
    this.rebuildSubtitleTracks();
  }

  async getSubtitleTrackResource(trackId: string | null): Promise<SubtitleTrackResource | null> {
    if (!trackId) return null;
    const resolver = this.subtitleTrackResolvers.get(trackId);
    if (!resolver) return null;
    return resolver();
  }

  private rebuildSubtitleTracks(): void {
    const previousSelected = this.selectedSubtitleTrack;

    this.subtitleTrackInfos = [];
    this.subtitleTrackResolvers.clear();

    for (const entries of this.subtitleProviders.values()) {
      for (const entry of entries) {
        const info: SubtitleTrackInfo = {
          ...entry.info,
          selected: false,
        };
        this.subtitleTrackInfos.push(info);
        this.subtitleTrackResolvers.set(info.id, entry.resolver);
      }
    }

    let nextSelected = previousSelected;
    if (!nextSelected || !this.subtitleTrackResolvers.has(nextSelected)) {
      nextSelected = this.subtitleTrackInfos[0]?.id ?? null;
    }

    this.selectedSubtitleTrack = nextSelected;
    this.subtitleTrackInfos.forEach((track) => {
      track.selected = track.id === this.selectedSubtitleTrack;
    });

    if (previousSelected !== this.selectedSubtitleTrack && this.onTrackChange) {
      this.onTrackChange({
        type: 'subtitle',
        previousTrackId: previousSelected,
        newTrackId: this.selectedSubtitleTrack,
      });
    }
  }

  setTrackChangeListener(listener: (event: TrackSelectionEvent) => void): void {
    this.onTrackChange = listener;
  }

  getState(): TrackManagerState {
    return {
      videoTracks: this.getVideoTracks(),
      audioTracks: this.getAudioTracks(),
      subtitleTracks: this.getSubtitleTracks(),
      selectedVideoTrack: this.selectedVideoTrack,
      selectedAudioTrack: this.selectedAudioTrack,
      selectedSubtitleTrack: this.selectedSubtitleTrack,
    };
  }

  getPrimaryVideoTrack(): InputVideoTrack | null {
    if (this.videoTracks.size === 0) return null;
    return this.selectedVideoTrack
      ? (this.videoTracks.get(this.selectedVideoTrack) ?? null)
      : (this.videoTracks.values().next().value ?? null);
  }

  getPrimaryAudioTrack(): InputAudioTrack | null {
    if (this.audioTracks.size === 0) return null;
    return this.selectedAudioTrack
      ? (this.audioTracks.get(this.selectedAudioTrack) ?? null)
      : (this.audioTracks.values().next().value ?? null);
  }

  hasVideo(): boolean {
    return this.videoTrackInfos.length > 0;
  }

  hasAudio(): boolean {
    return this.audioTrackInfos.length > 0;
  }

  hasSubtitles(): boolean {
    return this.subtitleTrackInfos.length > 0;
  }

  dispose(): void {
    this.videoTracks.clear();
    this.audioTracks.clear();
    this.videoTrackInfos = [];
    this.audioTrackInfos = [];
    this.subtitleTrackInfos = [];
    this.subtitleProviders.clear();
    this.subtitleTrackResolvers.clear();
    this.selectedVideoTrack = null;
    this.selectedAudioTrack = null;
    this.selectedSubtitleTrack = null;
    this.input = null;
    this.onTrackChange = undefined;
  }

  // Replace an audio track (by original input track id) with a new InputAudioTrack
  async replaceAudioTrackByInputId(originalInputId: number, newTrack: InputAudioTrack): Promise<void> {
    // Find map key for original track
    let key: string | null = null;
    for (const [k, t] of this.audioTracks.entries()) {
      if (t.id === originalInputId) {
        key = k;
        break;
      }
    }
    if (!key) return;

    // Update map
    this.audioTracks.set(key, newTrack);

    // Update info
    const idx = this.audioTrackInfos.findIndex((i) => i.id === key);
    if (idx !== -1) {
      let bitrate = 0;
      try {
        const stats = await newTrack.computePacketStats(100);
        bitrate = stats.averageBitrate;
      } catch {}
      this.audioTrackInfos[idx] = {
        ...this.audioTrackInfos[idx],
        codec: newTrack.codec,
        channels: newTrack.numberOfChannels,
        sampleRate: newTrack.sampleRate,
        bitrate,
        decodable: await newTrack.canDecode(),
        converted: true,
      };
    }
  }

  // Replace a video track (by original input track id) with a new InputVideoTrack
  async replaceVideoTrackByInputId(originalInputId: number, newTrack: InputVideoTrack): Promise<void> {
    let key: string | null = null;
    for (const [k, t] of this.videoTracks.entries()) {
      if (t.id === originalInputId) {
        key = k;
        break;
      }
    }
    if (!key) return;

    this.videoTracks.set(key, newTrack);

    const idx = this.videoTrackInfos.findIndex((i) => i.id === key);
    if (idx !== -1) {
      let frameRate = 0;
      let bitrate = 0;
      try {
        const stats = await newTrack.computePacketStats(100);
        frameRate = stats.averagePacketRate;
        bitrate = stats.averageBitrate;
      } catch {}
      this.videoTrackInfos[idx] = {
        ...this.videoTrackInfos[idx],
        codec: newTrack.codec,
        width: newTrack.codedWidth,
        height: newTrack.codedHeight,
        rotation: newTrack.rotation,
        frameRate,
        bitrate,
        decodable: await newTrack.canDecode(),
        converted: true,
      };
    }
  }
}
