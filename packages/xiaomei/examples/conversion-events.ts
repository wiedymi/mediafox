/**
 * Example: Listening to audio conversion events
 *
 * This example shows how to track the progress of fallback audio conversions
 * when switching to unsupported audio tracks.
 */

import type { MediaConverterDecoder } from '../src/decoders/media-converter-decoder';
import { XiaoMei } from '../src/xiaomei';

// Mock converter for example (replace with actual implementation)
const mockConverter: MediaConverterDecoder = {
  canDecodeAudio: () => true,
  canDecodeVideo: () => false,
  decodeAudio: async (_data: Uint8Array) => ({
    data: new Uint8Array(), // Mock converted data
    mimeType: 'audio/mp4',
    codec: 'aac',
  }),
  decodeVideo: async () => {
    throw new Error('Video conversion not supported');
  },
  dispose: async () => {},
};

async function setupPlayerWithConversionTracking() {
  const player = new XiaoMei({
    fallbackDecoder: mockConverter,
  });

  // Track conversion start
  player.on('conversionstart', (event) => {
    console.log(`🔄 Starting ${event.type} conversion for track ${event.trackId}`);
    console.log(`   Reason: ${event.reason}`);

    // Show conversion UI/spinner
    showConversionSpinner(event.trackId);
  });

  // Track conversion progress
  player.on('conversionprogress', (event) => {
    console.log(`⏳ ${event.type} conversion progress: ${event.progress}% (${event.stage})`);

    // Update progress bar
    updateProgressBar(event.trackId, event.progress, event.stage);
  });

  // Track conversion completion
  player.on('conversioncomplete', (event) => {
    console.log(`✅ ${event.type} conversion completed in ${event.duration}ms`);

    // Hide conversion UI
    hideConversionSpinner(event.trackId);
    showSuccessMessage(`Audio track converted successfully in ${event.duration}ms`);
  });

  // Track conversion errors
  player.on('conversionerror', (event) => {
    console.error(`❌ ${event.type} conversion failed:`, event.error);

    // Hide conversion UI and show error
    hideConversionSpinner(event.trackId);
    showErrorMessage(`Audio conversion failed: ${event.error.message}`);
  });

  // Track general warnings
  player.on('warning', (event) => {
    if (event.type === 'audio-codec-unsupported') {
      console.warn('⚠️ Audio codec warning:', event.message);
    }
  });

  return player;
}

// Mock UI functions (replace with actual UI implementation)
function showConversionSpinner(trackId: string) {
  console.log(`🔄 Showing conversion spinner for track ${trackId}`);
  // Implement your spinner/loading UI here
}

function updateProgressBar(trackId: string, progress: number, stage: string) {
  console.log(`📊 Track ${trackId}: ${progress}% - ${stage}`);
  // Update your progress bar here
}

function hideConversionSpinner(trackId: string) {
  console.log(`✨ Hiding conversion spinner for track ${trackId}`);
  // Hide your spinner/loading UI here
}

function showSuccessMessage(message: string) {
  console.log(`✅ ${message}`);
  // Show success notification
}

function showErrorMessage(message: string) {
  console.error(`❌ ${message}`);
  // Show error notification
}

// Example usage
async function example() {
  const player = await setupPlayerWithConversionTracking();

  // Load a media file
  await player.load('path/to/media/with/unsupported/audio.mkv');

  // Get available audio tracks
  const audioTracks = player.getAudioTracks();
  console.log('Available audio tracks:', audioTracks);

  // Try to switch to an unsupported audio track
  // This will trigger the conversion events if the track is unsupported
  if (audioTracks.length > 1) {
    console.log('Switching to second audio track...');
    await player.selectAudioTrack(audioTracks[1].id);
  }
}

export { setupPlayerWithConversionTracking, example };
