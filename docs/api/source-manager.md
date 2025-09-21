# SourceManager API Documentation

The SourceManager handles loading and managing different types of media sources in XiaoMei. It provides a unified interface for working with URLs, files, blobs, streams, and other source types.

## Class Overview

```typescript
class SourceManager {
  constructor(player: XiaoMei);

  // Source loading
  loadSource(source: SourceInput, options?: SourceOptions): Promise&lt;MediaSource&gt;;
  createSource(input: SourceInput): Promise&lt;Source&gt;;
  validateSource(source: SourceInput): Promise&lt;SourceValidation&gt;;

  // Source management
  getCurrentSource(): Source | null;
  getSourceMetadata(): SourceMetadata | null;
  clearSource(): void;

  // Source utilities
  detectSourceType(source: SourceInput): SourceType;
  getSupportedFormats(): string[];
  canPlayType(mimeType: string): boolean;

  // Events
  on(event: SourceManagerEvent, listener: Function): void;
  off(event: SourceManagerEvent, listener?: Function): void;
}
```

## Source Types

### SourceInput

Union type representing all supported source inputs:

```typescript
type SourceInput =
  | string                    // URL
  | File                      // File object from input
  | Blob                      // Blob data
  | ArrayBuffer               // Raw binary data
  | MediaStream               // Live stream
  | MediaSource               // Media Source Extension
  | HTMLVideoElement          // Video element
  | SourceConfig;             // Configuration object
```

### SourceConfig

```typescript
interface SourceConfig {
  /** Primary source */
  src: SourceInput;

  /** MIME type override */
  type?: string;

  /** Source metadata */
  metadata?: SourceMetadata;

  /** Loading options */
  options?: SourceOptions;

  /** Alternative sources for fallback */
  alternatives?: SourceInput[];

  /** Custom headers for network requests */
  headers?: Record&lt;string, string&gt;;

  /** Cross-origin configuration */
  crossOrigin?: 'anonymous' | 'use-credentials';
}
```

## Core Methods

### loadSource(source, options?)

Loads a media source and prepares it for playback.

```typescript
// Load from URL
await sourceManager.loadSource('https://example.com/video.mp4');

// Load with options
await sourceManager.loadSource('video.mp4', {
  preload: 'metadata',
  crossOrigin: 'anonymous',
  timeout: 30000
});

// Load file from input
const fileInput = document.getElementById('file') as HTMLInputElement;
const file = fileInput.files[0];
await sourceManager.loadSource(file);

// Load with configuration
await sourceManager.loadSource({
  src: 'video.mp4',
  type: 'video/mp4',
  alternatives: ['video.webm', 'video.ogv'],
  metadata: {
    title: 'Sample Video',
    duration: 120
  }
});

// Load blob
const blob = new Blob([arrayBuffer], { type: 'video/mp4' });
await sourceManager.loadSource(blob);

// Load MediaStream (for webcam, screen capture)
const stream = await navigator.mediaDevices.getUserMedia({ video: true });
await sourceManager.loadSource(stream);
```

**Parameters:**
- `source` (SourceInput): Source to load
- `options` (SourceOptions, optional): Loading configuration

**Returns:** Promise&lt;MediaSource&gt; - Prepared media source

**Events fired:**
- `loadstart` - Loading begins
- `progress` - Loading progress
- `loadend` - Loading completes
- `error` - Loading fails

### createSource(input)

Creates a Source object from input without loading.

```typescript
// Create source for validation
const source = await sourceManager.createSource('video.mp4');
console.log('Source type:', source.type);
console.log('Source size:', source.size);

// Batch source creation
const sources = await Promise.all([
  sourceManager.createSource('video1.mp4'),
  sourceManager.createSource('video2.mp4'),
  sourceManager.createSource('video3.mp4')
]);

// Create from various inputs
const urlSource = await sourceManager.createSource('https://example.com/video.mp4');
const fileSource = await sourceManager.createSource(file);
const blobSource = await sourceManager.createSource(blob);
```

**Parameters:**
- `input` (SourceInput): Input to create source from

**Returns:** Promise&lt;Source&gt; - Source object

### validateSource(source)

Validates if a source can be played.

```typescript
// Validate before loading
const validation = await sourceManager.validateSource('video.mp4');

if (validation.valid) {
  console.log('Source is valid');
  await sourceManager.loadSource('video.mp4');
} else {
  console.error('Validation errors:', validation.errors);
  showUnsupportedFormatMessage();
}

// Validate file before upload
const fileInput = document.getElementById('file') as HTMLInputElement;
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  const validation = await sourceManager.validateSource(file);

  if (!validation.valid) {
    alert('Unsupported file format');
    return;
  }

  await sourceManager.loadSource(file);
});

// Validate multiple sources
async function validateSources(sources: SourceInput[]) {
  const validations = await Promise.all(
    sources.map(source => sourceManager.validateSource(source))
  );

  return validations.filter(v => v.valid);
}
```

**Parameters:**
- `source` (SourceInput): Source to validate

**Returns:** Promise&lt;SourceValidation&gt;

**SourceValidation interface:**
```typescript
interface SourceValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  metadata?: SourceMetadata;
  supportLevel: 'full' | 'partial' | 'none';
}
```

## Source Management

### getCurrentSource()

Returns the currently loaded source.

```typescript
// Get current source info
const currentSource = sourceManager.getCurrentSource();

if (currentSource) {
  console.log('Current source URL:', currentSource.url);
  console.log('Source type:', currentSource.type);
  console.log('File size:', currentSource.size);
}

// Check if source is loaded
function isSourceLoaded(): boolean {
  return sourceManager.getCurrentSource() !== null;
}

// Get source for analytics
function trackSourceInfo() {
  const source = sourceManager.getCurrentSource();
  if (source) {
    analytics.track('video_loaded', {
      source_type: source.type,
      source_size: source.size,
      source_url: source.url
    });
  }
}
```

**Returns:** Source | null - Current source or null if none loaded

### getSourceMetadata()

Returns metadata for the current source.

```typescript
// Get source metadata
const metadata = sourceManager.getSourceMetadata();

if (metadata) {
  console.log('Title:', metadata.title);
  console.log('Duration:', metadata.duration);
  console.log('Dimensions:', metadata.width, 'x', metadata.height);
}

// Update UI with metadata
function updateMediaInfo() {
  const metadata = sourceManager.getSourceMetadata();

  if (metadata) {
    document.getElementById('title').textContent = metadata.title || 'Unknown';
    document.getElementById('duration').textContent = formatDuration(metadata.duration);
  }
}

// Extract custom metadata
const metadata = sourceManager.getSourceMetadata();
if (metadata?.custom) {
  const { artist, album, genre } = metadata.custom;
  updateMusicInfo(artist, album, genre);
}
```

**Returns:** SourceMetadata | null

### clearSource()

Clears the current source and frees resources.

```typescript
// Clear current source
sourceManager.clearSource();

// Clear on component unmount
class VideoPlayer {
  destroy() {
    sourceManager.clearSource();
  }
}

// Clear before loading new source
async function loadNewVideo(url: string) {
  sourceManager.clearSource();
  await sourceManager.loadSource(url);
}
```

## Utility Methods

### detectSourceType(source)

Detects the type of a source input.

```typescript
// Detect source types
const urlType = sourceManager.detectSourceType('video.mp4');
console.log(urlType); // 'url'

const fileType = sourceManager.detectSourceType(file);
console.log(fileType); // 'file'

const streamType = sourceManager.detectSourceType(mediaStream);
console.log(streamType); // 'stream'

// Use for conditional logic
function handleSource(source: SourceInput) {
  const type = sourceManager.detectSourceType(source);

  switch (type) {
    case 'url':
      return handleUrlSource(source as string);
    case 'file':
      return handleFileSource(source as File);
    case 'stream':
      return handleStreamSource(source as MediaStream);
    default:
      throw new Error(`Unsupported source type: ${type}`);
  }
}
```

**Parameters:**
- `source` (SourceInput): Source to detect type for

**Returns:** SourceType

**SourceType enum:**
```typescript
enum SourceType {
  URL = 'url',
  FILE = 'file',
  BLOB = 'blob',
  BUFFER = 'buffer',
  STREAM = 'stream',
  MEDIA_SOURCE = 'media_source',
  VIDEO_ELEMENT = 'video_element',
  CONFIG = 'config'
}
```

### getSupportedFormats()

Returns array of supported MIME types.

```typescript
// Get all supported formats
const formats = sourceManager.getSupportedFormats();
console.log('Supported formats:', formats);

// Filter user file selection
function createFileInput() {
  const input = document.createElement('input');
  input.type = 'file';

  const formats = sourceManager.getSupportedFormats();
  const extensions = formats.map(format => getExtensionFromMime(format));
  input.accept = extensions.join(',');

  return input;
}

// Show format support info
function displaySupportInfo() {
  const formats = sourceManager.getSupportedFormats();
  const list = document.getElementById('supported-formats');

  formats.forEach(format => {
    const li = document.createElement('li');
    li.textContent = format;
    list.appendChild(li);
  });
}
```

**Returns:** string[] - Array of supported MIME types

### canPlayType(mimeType)

Checks if a specific MIME type can be played.

```typescript
// Check format support
const canPlayMP4 = sourceManager.canPlayType('video/mp4');
const canPlayWebM = sourceManager.canPlayType('video/webm');

console.log('MP4 support:', canPlayMP4);
console.log('WebM support:', canPlayWebM);

// Choose best format
function chooseBestFormat(availableFormats: string[]): string | null {
  const preferredOrder = ['video/mp4', 'video/webm', 'video/ogg'];

  for (const format of preferredOrder) {
    if (availableFormats.includes(format) && sourceManager.canPlayType(format)) {
      return format;
    }
  }

  return null;
}

// Validate file type
function validateFileType(file: File): boolean {
  return sourceManager.canPlayType(file.type);
}
```

**Parameters:**
- `mimeType` (string): MIME type to check

**Returns:** boolean - Whether the type can be played

## Event Handling

### Source Events

```typescript
// Listen to source loading events
sourceManager.on('loadstart', () => {
  console.log('Started loading source');
  showLoadingIndicator();
});

sourceManager.on('progress', (loaded: number, total: number) => {
  const percent = (loaded / total) * 100;
  updateProgressBar(percent);
});

sourceManager.on('loadend', (source: Source) => {
  console.log('Source loaded successfully');
  hideLoadingIndicator();
  showPlayerControls();
});

sourceManager.on('error', (error: Error) => {
  console.error('Source loading failed:', error);
  showErrorMessage(error.message);
});

sourceManager.on('sourcechange', (newSource: Source, oldSource: Source | null) => {
  console.log('Source changed from', oldSource?.url, 'to', newSource.url);
  updateSourceInfo(newSource);
});

// Metadata events
sourceManager.on('metadata', (metadata: SourceMetadata) => {
  console.log('Source metadata:', metadata);
  updateMediaInfo(metadata);
});
```

## Advanced Usage

### Custom Source Loaders

```typescript
// Register custom source loader
class CustomSourceLoader {
  canHandle(source: SourceInput): boolean {
    return typeof source === 'string' && source.startsWith('custom://');
  }

  async load(source: string): Promise&lt;Source&gt; {
    // Custom loading logic
    const data = await fetchCustomSource(source);
    return createSourceFromData(data);
  }
}

sourceManager.registerLoader(new CustomSourceLoader());

// Use custom source
await sourceManager.loadSource('custom://my-special-source');
```

### Source Transformation

```typescript
// Transform sources before loading
class SourceTransformer {
  transform(source: SourceInput): SourceInput {
    if (typeof source === 'string') {
      // Add CDN prefix
      return `https://cdn.example.com/${source}`;
    }
    return source;
  }
}

sourceManager.setTransformer(new SourceTransformer());

// Now all URL sources will be transformed
await sourceManager.loadSource('video.mp4'); // Loads from CDN
```

### Source Caching

```typescript
// Enable source caching
sourceManager.enableCaching({
  maxSize: 100 * 1024 * 1024, // 100MB
  maxAge: 3600 * 1000, // 1 hour
  strategy: 'lru' // Least Recently Used
});

// Preload sources for caching
async function preloadSources(urls: string[]) {
  const promises = urls.map(url =>
    sourceManager.createSource(url).then(source =>
      sourceManager.cacheSource(source)
    )
  );

  await Promise.all(promises);
}

// Check cache status
const isCached = sourceManager.isCached('video.mp4');
if (isCached) {
  console.log('Source is cached, will load quickly');
}
```

### Progressive Loading

```typescript
// Configure progressive loading
await sourceManager.loadSource('large-video.mp4', {
  progressive: true,
  chunkSize: 1024 * 1024, // 1MB chunks
  preloadSize: 5 * 1024 * 1024, // Preload 5MB
  onProgress: (loaded, total) => {
    console.log(`Loaded: ${loaded}/${total} bytes`);
  }
});

// Adaptive chunk sizing
sourceManager.setAdaptiveChunking({
  enabled: true,
  minChunkSize: 256 * 1024, // 256KB
  maxChunkSize: 4 * 1024 * 1024, // 4MB
  adaptToNetwork: true
});
```

## Source Metadata

### SourceMetadata Interface

```typescript
interface SourceMetadata {
  // Basic info
  title?: string;
  description?: string;
  duration?: number;

  // Video properties
  width?: number;
  height?: number;
  frameRate?: number;
  bitrate?: number;
  codec?: string;

  // Audio properties
  channels?: number;
  sampleRate?: number;
  audioBitrate?: number;
  audioCodec?: string;

  // Track information
  tracks?: {
    video: VideoTrackInfo[];
    audio: AudioTrackInfo[];
    subtitle?: SubtitleTrackInfo[];
  };

  // File properties
  size?: number;
  format?: string;
  container?: string;

  // Custom metadata
  custom?: Record&lt;string, any&gt;;

  // Timestamps
  createdAt?: Date;
  modifiedAt?: Date;
}
```

## Error Handling

```typescript
// Comprehensive error handling
sourceManager.on('error', (error: SourceError) => {
  console.error('Source error:', error);

  switch (error.code) {
    case 'NETWORK_ERROR':
      handleNetworkError(error);
      break;
    case 'FORMAT_UNSUPPORTED':
      handleUnsupportedFormat(error);
      break;
    case 'FILE_CORRUPTED':
      handleCorruptedFile(error);
      break;
    case 'PERMISSION_DENIED':
      handlePermissionError(error);
      break;
    default:
      handleGenericError(error);
  }
});

function handleNetworkError(error: SourceError) {
  // Retry with exponential backoff
  const retryCount = error.retryCount || 0;
  if (retryCount < 3) {
    const delay = Math.pow(2, retryCount) * 1000;
    setTimeout(() => {
      sourceManager.loadSource(error.source, {
        ...error.options,
        retryCount: retryCount + 1
      });
    }, delay);
  } else {
    showPermanentError('Network error - please check your connection');
  }
}
```

## Best Practices

1. **Validate Sources**: Always validate sources before loading
2. **Handle Errors**: Implement comprehensive error handling
3. **Use Metadata**: Leverage source metadata for better UX
4. **Cache Sources**: Enable caching for better performance
5. **Progressive Loading**: Use progressive loading for large files
6. **Cleanup Resources**: Clear sources when not needed
7. **Type Detection**: Use automatic type detection when possible

The SourceManager provides a powerful and flexible system for handling all types of media sources in XiaoMei, with built-in support for validation, caching, and progressive loading.