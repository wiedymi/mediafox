# Fallback Decoder System

The fallback decoder system in XiaoMei provides automatic codec conversion for media files containing tracks with unsupported codecs. When the browser's native WebCodecs API cannot decode a particular audio or video track, XiaoMei can automatically convert it to a browser-friendly format using custom decoder functions.

## Why Fallback Decoders Are Needed

Modern web browsers support a limited set of codecs through the WebCodecs API. When you encounter media files with:

- Uncommon or legacy codecs (e.g., AC-3, DTS, HEVC in some browsers)
- Proprietary codecs
- Corrupted codec headers that prevent native decoding

The fallback decoder system allows XiaoMei to handle these scenarios gracefully by converting unsupported tracks to widely-supported formats:

- **Audio tracks** → AAC format for broad compatibility
- **Video tracks** → H.264 MP4 for universal browser support

## Configuration

### Basic Setup

Configure a fallback decoder when creating a XiaoMei instance:

```typescript
import { XiaoMei, MediaConverterDecoder } from 'xiaomei';

const fallbackDecoder = new MediaConverterDecoder({
  decodeAudioTrack: async (data, trackIndex, options) => {
    // Your audio conversion implementation
    // Convert the audio track data to AAC format
    const convertedData = await convertAudioToAAC(data, trackIndex);
    return convertedData;
  },
  decodeVideoTrack: async (data, trackIndex, options) => {
    // Your video conversion implementation
    // Convert the video track data to H.264 MP4
    const convertedData = await convertVideoToH264(data, trackIndex);
    return convertedData;
  }
});

const player = new XiaoMei({
  fallbackDecoder,
  renderTarget: canvas,
  // other options...
});
```

### Decoder Function Signatures

#### Audio Decoder Function

```typescript
type AudioDecoderFunction = (
  data: Uint8Array,        // Full media file bytes
  trackIndex: number,      // Index of the audio track to convert
  options?: {
    onProgress?: (progress: number) => void;  // Progress callback (0-100)
  }
) => Promise<Uint8Array>;  // Converted audio data in AAC format
```

#### Video Decoder Function

```typescript
type VideoDecoderFunction = (
  data: Uint8Array,        // Full media file bytes
  trackIndex: number,      // Index of the video track to convert
  options?: {
    onProgress?: (progress: number) => void;  // Progress callback (0-100)
  }
) => Promise<Uint8Array>;  // Converted video data in H.264 MP4 format
```

## Conversion Events

The fallback decoder system emits detailed events throughout the conversion process, allowing you to provide user feedback and handle errors gracefully.

### Available Events

#### `conversionstart`
Fired when a conversion begins.

```typescript
player.on('conversionstart', (event) => {
  console.log(`Starting ${event.type} conversion for track ${event.trackId}`);
  console.log(`Reason: ${event.reason}`);
  // event.type: 'audio' | 'video'
  // event.trackId: string
  // event.reason: 'unsupported-codec' | 'decode-error'
});
```

#### `conversionprogress`
Fired periodically during conversion to report progress.

```typescript
player.on('conversionprogress', (event) => {
  console.log(`Conversion progress: ${event.progress}% (${event.stage})`);
  // event.type: 'audio' | 'video'
  // event.trackId: string
  // event.progress: number (0-100)
  // event.stage: 'extracting' | 'converting' | 'finalizing'
});
```

#### `conversioncomplete`
Fired when conversion finishes successfully.

```typescript
player.on('conversioncomplete', (event) => {
  console.log(`Conversion completed in ${event.duration}ms`);
  // event.type: 'audio' | 'video'
  // event.trackId: string
  // event.duration: number (conversion time in milliseconds)
});
```

#### `conversionerror`
Fired when conversion fails.

```typescript
player.on('conversionerror', (event) => {
  console.error(`Conversion failed:`, event.error);
  // event.type: 'audio' | 'video'
  // event.trackId: string
  // event.error: Error
});
```

## Complete Working Example

Here's a comprehensive example showing how to implement and use the fallback decoder system with FFmpeg.wasm:

### Production Implementation (from XiaoMei Demo)

This is the actual implementation used in the XiaoMei live demo:

```typescript
import { XiaoMei, MediaConverterDecoder } from 'xiaomei';
import { FFmpeg } from '@ffmpeg/ffmpeg';

async function setupPlayerWithFFmpegDecoder() {
  // Create fallback decoder if FFmpeg is available
  let fallbackDecoder: MediaConverterDecoder | undefined;

  try {
    // Load FFmpeg for unsupported codec fallback
    const ffmpeg = new FFmpeg();

    // Initialize FFmpeg silently
    ffmpeg.on("log", () => {}); // Suppress logs

    await ffmpeg.load({
      coreURL: "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js",
      wasmURL: "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm",
    });

    // Audio conversion function
    const decodeAudioTrack = async (
      data: Uint8Array,
      trackIndex: number,
      options?: { onProgress?: (p: number) => void }
    ) => {
      console.log('FFmpeg: Starting audio conversion, input size:', data.length);

      // Convert to AAC in ADTS (.aac) for broad WebCodecs decode support
      const timestamp = Date.now();
      const inputFile = `input_${timestamp}.bin`;
      const outputFile = `output_${timestamp}.aac`;

      try {
        await ffmpeg.writeFile(inputFile, data);
        console.log('FFmpeg: Input file written');

        // Convert to AAC LC in ADTS container
        const args = [
          '-i', inputFile,
          '-map', `0:a:${trackIndex}`,
          '-vn',              // Remove video
          '-c:a', 'aac',      // AAC LC encoder
          '-b:a', '128k',     // 128 kbps
          '-ar', '48000',     // 48 kHz
          '-ac', '2',         // Stereo
          '-f', 'adts',       // ADTS container
          outputFile
        ];

        console.log('FFmpeg: Running AAC conversion with args:', args);

        // Hook progress events and scale to 40..80
        const onProg = ({ progress }: { progress: number }) => {
          const p = typeof progress === 'number' ? progress : 0;
          const scaled = 40 + Math.max(0, Math.min(1, p)) * 40;
          options?.onProgress?.(Math.round(scaled));
        };

        ffmpeg.on('progress', onProg);
        try {
          await ffmpeg.exec(args);
          options?.onProgress?.(80);
        } finally {
          ffmpeg.off('progress', onProg);
        }

        console.log('FFmpeg: AAC conversion completed');

        const outputData = await ffmpeg.readFile(outputFile);
        console.log('FFmpeg: AAC output file read, size:', outputData.length);

        // Cleanup
        await ffmpeg.deleteFile(inputFile);
        await ffmpeg.deleteFile(outputFile);

        return outputData as Uint8Array;
      } catch (error) {
        console.error('FFmpeg audio conversion failed:', error);
        // Cleanup on error
        try {
          await ffmpeg.deleteFile(inputFile);
          await ffmpeg.deleteFile(outputFile);
        } catch {
          // Ignore cleanup errors
        }
        throw error;
      }
    };

    // Video conversion function
    const decodeVideoTrack = async (
      data: Uint8Array,
      trackIndex: number,
      options?: { onProgress?: (p: number) => void }
    ) => {
      // Convert to H.264 MP4 - most compatible format
      const timestamp = Date.now();
      const inputFile = `input_${timestamp}.bin`;
      const outputFile = `output_${timestamp}.mp4`;

      await ffmpeg.writeFile(inputFile, data);

      // Simple command: convert to H.264 MP4
      const args = [
        '-i', inputFile,
        '-map', `0:v:${trackIndex}`,
        '-an', // Remove audio
        '-c:v', 'libx264', // H.264 - universally supported
        '-preset', 'fast',
        '-f', 'mp4',
        outputFile
      ];

      const onProg = ({ progress }: { progress: number }) => {
        const p = typeof progress === 'number' ? progress : 0;
        const scaled = 40 + Math.max(0, Math.min(1, p)) * 40;
        options?.onProgress?.(Math.round(scaled));
      };

      ffmpeg.on('progress', onProg);
      try {
        await ffmpeg.exec(args);
        options?.onProgress?.(80);
      } finally {
        ffmpeg.off('progress', onProg);
      }

      const outputData = await ffmpeg.readFile(outputFile);

      // Cleanup
      await ffmpeg.deleteFile(inputFile);
      await ffmpeg.deleteFile(outputFile);

      return outputData as Uint8Array;
    };

    fallbackDecoder = new MediaConverterDecoder({
      decodeAudioTrack,
      decodeVideoTrack,
    });

    console.log("Fallback decoder initialized for unsupported codecs");
  } catch (e) {
    console.log("FFmpeg not available, fallback decoder disabled");
  }

  // Create player with optional fallback decoder
  const player = new XiaoMei({
    renderTarget: canvas,
    volume: 0.8,
    autoplay: false,
    fallbackDecoder, // Will be undefined if FFmpeg failed to load
  });

  return player;
}
```

### Simplified Example

```typescript
import { XiaoMei, MediaConverterDecoder } from 'xiaomei';
import { FFmpeg } from '@ffmpeg/ffmpeg';

// Create FFmpeg instance for conversion
const ffmpeg = new FFmpeg();
await ffmpeg.load();

// Audio conversion function
async function convertAudioToAAC(data: Uint8Array, trackIndex: number): Promise<Uint8Array> {
  const timestamp = Date.now();
  const inputFile = `input_${timestamp}.bin`;
  const outputFile = `output_${timestamp}.aac`;

  try {
    // Write input data
    await ffmpeg.writeFile(inputFile, data);

    // Convert to AAC
    await ffmpeg.exec([
      '-i', inputFile,
      '-map', `0:a:${trackIndex}`,
      '-vn',              // Remove video
      '-c:a', 'aac',      // AAC encoder
      '-b:a', '128k',     // 128 kbps
      '-ar', '48000',     // 48 kHz
      '-ac', '2',         // Stereo
      '-f', 'adts',       // ADTS container
      outputFile
    ]);

    // Read output
    const outputData = await ffmpeg.readFile(outputFile);

    // Cleanup
    await ffmpeg.deleteFile(inputFile);
    await ffmpeg.deleteFile(outputFile);

    return outputData as Uint8Array;
  } catch (error) {
    // Cleanup on error
    try {
      await ffmpeg.deleteFile(inputFile);
      await ffmpeg.deleteFile(outputFile);
    } catch {}
    throw error;
  }
}

// Video conversion function
async function convertVideoToH264(data: Uint8Array, trackIndex: number): Promise<Uint8Array> {
  const timestamp = Date.now();
  const inputFile = `input_${timestamp}.bin`;
  const outputFile = `output_${timestamp}.mp4`;

  try {
    await ffmpeg.writeFile(inputFile, data);

    // Convert to H.264 MP4
    await ffmpeg.exec([
      '-i', inputFile,
      '-map', `0:v:${trackIndex}`,
      '-an',              // Remove audio
      '-c:v', 'libx264',  // H.264 encoder
      '-preset', 'fast',
      '-f', 'mp4',
      outputFile
    ]);

    const outputData = await ffmpeg.readFile(outputFile);

    // Cleanup
    await ffmpeg.deleteFile(inputFile);
    await ffmpeg.deleteFile(outputFile);

    return outputData as Uint8Array;
  } catch (error) {
    // Cleanup on error
    try {
      await ffmpeg.deleteFile(inputFile);
      await ffmpeg.deleteFile(outputFile);
    } catch {}
    throw error;
  }
}

// Create fallback decoder
const fallbackDecoder = new MediaConverterDecoder({
  decodeAudioTrack: async (data, trackIndex, options) => {
    // Report progress
    options?.onProgress?.(10);

    const converted = await convertAudioToAAC(data, trackIndex);

    options?.onProgress?.(100);
    return converted;
  },

  decodeVideoTrack: async (data, trackIndex, options) => {
    // Report progress
    options?.onProgress?.(10);

    const converted = await convertVideoToH264(data, trackIndex);

    options?.onProgress?.(100);
    return converted;
  }
});

// Create player with fallback decoder
const player = new XiaoMei({
  fallbackDecoder,
  renderTarget: document.getElementById('canvas') as HTMLCanvasElement,
});

// Set up event listeners for conversion tracking
player.on('conversionstart', (event) => {
  showConversionUI(event.trackId, event.type);
  console.log(`Starting ${event.type} conversion (${event.reason})`);
});

player.on('conversionprogress', (event) => {
  updateProgressBar(event.trackId, event.progress, event.stage);
  console.log(`⏳ ${event.progress}% - ${event.stage}`);
});

player.on('conversioncomplete', (event) => {
  hideConversionUI(event.trackId);
  console.log(`Conversion completed in ${event.duration}ms`);
});

player.on('conversionerror', (event) => {
  hideConversionUI(event.trackId);
  showErrorMessage(`Conversion failed: ${event.error.message}`);
  console.error('Conversion error:', event.error);
});

// Handle codec warnings
player.on('warning', (event) => {
  if (event.type.includes('codec-unsupported')) {
    console.warn('Codec warning:', event.message);
  }
});

// UI helper functions
function showConversionUI(trackId: string, type: string) {
  const element = document.getElementById('conversion-status');
  if (element) {
    element.textContent = `Converting ${type} track...`;
    element.style.display = 'block';
  }
}

function updateProgressBar(trackId: string, progress: number, stage: string) {
  const progressBar = document.getElementById('progress-bar') as HTMLProgressElement;
  const statusText = document.getElementById('progress-text');

  if (progressBar) progressBar.value = progress;
  if (statusText) statusText.textContent = `${stage}: ${progress}%`;
}

function hideConversionUI(trackId: string) {
  const element = document.getElementById('conversion-status');
  if (element) element.style.display = 'none';
}

function showErrorMessage(message: string) {
  alert(`Error: ${message}`);
}

// Load and play media with automatic conversion
async function playMediaWithFallback() {
  try {
    // Load media - conversion happens automatically if needed
    await player.load('media-with-unsupported-codecs.mkv');

    // Get available tracks
    const audioTracks = player.getAudioTracks();
    const videoTracks = player.getVideoTracks();

    console.log('Audio tracks:', audioTracks);
    console.log('Video tracks:', videoTracks);

    // Switch tracks - may trigger conversion if unsupported
    if (audioTracks.length > 1) {
      await player.selectAudioTrack(audioTracks[1].id);
    }

    // Start playback
    await player.play();

  } catch (error) {
    console.error('Playback error:', error);
  }
}
```

## Supported Conversion Scenarios

The fallback decoder system handles several scenarios:

### Automatic Conversion Triggers

1. **Unsupported Codec**: When `track.codec` is not supported by the browser
2. **Decode Errors**: When `track.decodable` is false even for supported codecs
3. **Track Switching**: When switching to a track that cannot be decoded natively

### Conversion Process

1. **Detection**: XiaoMei detects an unsupported track during load or track switching
2. **Fallback Check**: Verifies a suitable decoder function is available
3. **Extraction**: Extracts the specific track from the source media
4. **Conversion**: Calls your decoder function with progress callbacks
5. **Integration**: Replaces the original track with the converted version
6. **Playback**: Continues normal playback with the converted track

## Integration with Track Information

Converted tracks are marked in the track information:

```typescript
// Check if a track was converted
const audioTracks = player.getAudioTracks();
audioTracks.forEach(track => {
  if (track.converted) {
    console.log(`Track ${track.name} was converted from ${track.codec}`);
  }
});
```

The `converted` property is added to track info objects to indicate when fallback conversion was used.

## Error Handling Best Practices

Always handle conversion errors gracefully:

```typescript
player.on('conversionerror', (event) => {
  // Log the error
  console.error(`Failed to convert ${event.type} track:`, event.error);

  // Inform the user
  showNotification(`Unable to play ${event.type} track: ${event.error.message}`);

  // Continue playback with other tracks if available
  if (event.type === 'audio') {
    // Audio conversion failed - continue with video only
    console.log('Continuing playback without audio');
  } else {
    // Video conversion failed - audio-only playback
    console.log('Continuing with audio-only playback');
  }
});
```

## Performance Considerations

- **Caching**: Converted tracks are cached to avoid re-conversion
- **Progress Reporting**: Use progress callbacks to provide user feedback
- **Error Handling**: Graceful fallback when conversion fails
- **Memory Management**: Conversion is performed efficiently with proper cleanup

This fallback decoder system allows XiaoMei to handle a wide variety of media formats while providing detailed feedback about the conversion process, making it suitable for applications that need to support diverse codec requirements.