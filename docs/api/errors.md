# Error Handling Documentation

XiaoMei provides comprehensive error handling with detailed error types, codes, and recovery strategies. This document covers all error types and best practices for error handling.

## Error System Overview

XiaoMei's error handling system includes:
- **Typed Errors**: Specific error classes for different failure modes
- **Error Codes**: Standardized error codes for programmatic handling
- **Error Context**: Additional information for debugging and recovery
- **Error Events**: Proper event emission for all error conditions
- **Recovery Strategies**: Built-in and customizable error recovery

## Error Classes

### PlayerError

Base error class for all XiaoMei-specific errors.

```typescript
class PlayerError extends Error {
  readonly code: PlayerErrorCode;
  readonly details?: any;
  readonly timestamp: number;
  readonly recoverable: boolean;

  constructor(
    code: PlayerErrorCode,
    message: string,
    details?: any,
    recoverable = false
  ) {
    super(message);
    this.name = 'PlayerError';
    this.code = code;
    this.details = details;
    this.timestamp = Date.now();
    this.recoverable = recoverable;
  }
}
```

**Usage:**
```typescript
player.on('error', (error) => {
  if (error instanceof PlayerError) {
    console.log('Player Error:', error.code, error.message);
    console.log('Recoverable:', error.recoverable);
    console.log('Details:', error.details);

    if (error.recoverable) {
      attemptRecovery(error);
    } else {
      showFatalError(error);
    }
  }
});
```

### NetworkError

Specialized error for network-related failures.

```typescript
class NetworkError extends PlayerError {
  readonly url: string;
  readonly status?: number;
  readonly statusText?: string;

  constructor(
    message: string,
    url: string,
    status?: number,
    statusText?: string
  ) {
    super(PlayerErrorCode.NETWORK_ERROR, message, {
      url,
      status,
      statusText
    }, true);

    this.name = 'NetworkError';
    this.url = url;
    this.status = status;
    this.statusText = statusText;
  }
}
```

**Usage:**
```typescript
player.on('error', (error) => {
  if (error instanceof NetworkError) {
    console.log('Network Error:', error.status, error.statusText);
    console.log('Failed URL:', error.url);

    // Implement retry logic
    if (error.status >= 500) {
      scheduleRetry(error.url);
    } else if (error.status === 404) {
      showResourceNotFound();
    }
  }
});
```

### MediaError

Error for media-specific issues (extends standard MediaError).

```typescript
class XiaoMeiMediaError extends MediaError {
  readonly playerCode: PlayerErrorCode;
  readonly sourceUrl?: string;

  constructor(
    code: number,
    message: string,
    playerCode: PlayerErrorCode,
    sourceUrl?: string
  ) {
    super();
    this.code = code;
    this.message = message;
    this.playerCode = playerCode;
    this.sourceUrl = sourceUrl;
  }
}
```

**Usage:**
```typescript
player.on('error', (error) => {
  if (error instanceof XiaoMeiMediaError) {
    switch (error.code) {
      case MediaError.MEDIA_ERR_ABORTED:
        console.log('Media loading aborted');
        break;
      case MediaError.MEDIA_ERR_NETWORK:
        console.log('Network error during media loading');
        showNetworkError();
        break;
      case MediaError.MEDIA_ERR_DECODE:
        console.log('Media decode error');
        tryAlternativeSource();
        break;
      case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
        console.log('Media format not supported');
        showUnsupportedFormatError();
        break;
    }
  }
});
```

### SourceError

Error for source loading and validation issues.

```typescript
class SourceError extends PlayerError {
  readonly source: string;
  readonly sourceType?: string;

  constructor(
    message: string,
    source: string,
    code: PlayerErrorCode,
    sourceType?: string
  ) {
    super(code, message, { source, sourceType }, true);
    this.name = 'SourceError';
    this.source = source;
    this.sourceType = sourceType;
  }
}
```

## Error Codes

### PlayerErrorCode Enum

```typescript
enum PlayerErrorCode {
  // Generic errors
  UNKNOWN = 'UNKNOWN',
  INVALID_STATE = 'INVALID_STATE',
  OPERATION_ABORTED = 'OPERATION_ABORTED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',

  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  NETWORK_ABORT = 'NETWORK_ABORT',

  // Source errors
  SOURCE_NOT_FOUND = 'SOURCE_NOT_FOUND',
  SOURCE_INVALID = 'SOURCE_INVALID',
  SOURCE_CORRUPTED = 'SOURCE_CORRUPTED',
  SOURCE_UNSUPPORTED = 'SOURCE_UNSUPPORTED',

  // Media errors
  MEDIA_FORMAT_ERROR = 'MEDIA_FORMAT_ERROR',
  MEDIA_DECODE_ERROR = 'MEDIA_DECODE_ERROR',
  MEDIA_UNSUPPORTED = 'MEDIA_UNSUPPORTED',

  // Track errors
  TRACK_NOT_FOUND = 'TRACK_NOT_FOUND',
  TRACK_SWITCH_FAILED = 'TRACK_SWITCH_FAILED',

  // Memory errors
  OUT_OF_MEMORY = 'OUT_OF_MEMORY',
  MEMORY_LIMIT_EXCEEDED = 'MEMORY_LIMIT_EXCEEDED',

  // Codec errors
  CODEC_NOT_SUPPORTED = 'CODEC_NOT_SUPPORTED',
  CODEC_INITIALIZATION_FAILED = 'CODEC_INITIALIZATION_FAILED',

  // Canvas errors
  CANVAS_CONTEXT_LOST = 'CANVAS_CONTEXT_LOST',
  CANVAS_RENDERING_FAILED = 'CANVAS_RENDERING_FAILED'
}
```

## Error Handling Patterns

### Basic Error Handling

```typescript
import { XiaoMei, PlayerError, NetworkError, MediaError } from '@vivysub/xiaomei';

const player = new XiaoMei({ canvas: canvasElement });

player.on('error', (error) => {
  console.error('Player error occurred:', error);

  // Log error details
  logError({
    type: error.constructor.name,
    code: error.code || 'UNKNOWN',
    message: error.message,
    timestamp: Date.now(),
    playerState: player.store.getState()
  });

  // Handle different error types
  handlePlayerError(error);
});

function handlePlayerError(error: Error) {
  if (error instanceof NetworkError) {
    handleNetworkError(error);
  } else if (error instanceof MediaError) {
    handleMediaError(error);
  } else if (error instanceof PlayerError) {
    handleGenericPlayerError(error);
  } else {
    handleUnknownError(error);
  }
}
```

### Network Error Handling

```typescript
function handleNetworkError(error: NetworkError) {
  const { status, url } = error;

  switch (status) {
    case 404:
      showError('Video not found', 'The requested video could not be found.');
      suggestAlternatives();
      break;

    case 403:
      showError('Access denied', 'You do not have permission to view this video.');
      promptLogin();
      break;

    case 500:
    case 502:
    case 503:
      showError('Server error', 'There was a problem with the video server.');
      scheduleRetry(url, 5000); // Retry in 5 seconds
      break;

    case 0: // Network offline
      showError('No internet connection', 'Please check your internet connection.');
      waitForOnline();
      break;

    default:
      showError('Network error', `Failed to load video: ${error.message}`);
      offerRetry();
  }
}

function scheduleRetry(url: string, delay: number) {
  setTimeout(() => {
    player.load(url).catch(handlePlayerError);
  }, delay);
}

function waitForOnline() {
  window.addEventListener('online', () => {
    player.load(player.currentSrc).catch(handlePlayerError);
  }, { once: true });
}
```

### Media Error Handling

```typescript
function handleMediaError(error: MediaError | XiaoMeiMediaError) {
  switch (error.code) {
    case MediaError.MEDIA_ERR_ABORTED:
      // User aborted loading - usually not an error to show
      console.log('Media loading was aborted by user');
      break;

    case MediaError.MEDIA_ERR_NETWORK:
      showError(
        'Network error',
        'There was a problem downloading the video.'
      );
      offerRetry();
      break;

    case MediaError.MEDIA_ERR_DECODE:
      showError(
        'Video error',
        'There was a problem playing the video file.'
      );
      tryAlternativeFormats();
      break;

    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
      showError(
        'Unsupported format',
        'This video format is not supported by your browser.'
      );
      suggestBrowserUpdate();
      break;

    default:
      showError('Playback error', error.message);
  }
}

function tryAlternativeFormats() {
  const alternatives = getAlternativeFormats(player.currentSrc);
  if (alternatives.length > 0) {
    player.load(alternatives[0]).catch(handlePlayerError);
  }
}
```

### Recovery Strategies

```typescript
class ErrorRecoveryManager {
  private retryCount = 0;
  private maxRetries = 3;
  private retryDelay = 1000;

  constructor(private player: XiaoMei) {
    this.setupErrorHandling();
  }

  private setupErrorHandling() {
    this.player.on('error', this.handleError.bind(this));
  }

  private async handleError(error: Error) {
    if (!this.isRecoverable(error)) {
      this.showFatalError(error);
      return;
    }

    if (this.retryCount >= this.maxRetries) {
      this.showRetryLimitError(error);
      return;
    }

    await this.attemptRecovery(error);
  }

  private isRecoverable(error: Error): boolean {
    if (error instanceof PlayerError) {
      return error.recoverable;
    }

    if (error instanceof NetworkError) {
      // Network errors are generally recoverable
      return true;
    }

    if (error instanceof MediaError) {
      // Some media errors are recoverable
      return error.code === MediaError.MEDIA_ERR_NETWORK;
    }

    return false;
  }

  private async attemptRecovery(error: Error) {
    this.retryCount++;
    const delay = this.retryDelay * Math.pow(2, this.retryCount - 1); // Exponential backoff

    console.log(`Attempting recovery (${this.retryCount}/${this.maxRetries}) in ${delay}ms`);

    setTimeout(async () => {
      try {
        if (error instanceof NetworkError) {
          await this.recoverFromNetworkError(error);
        } else if (error instanceof MediaError) {
          await this.recoverFromMediaError(error);
        } else {
          await this.genericRecovery();
        }

        // Reset retry count on successful recovery
        this.retryCount = 0;
      } catch (recoveryError) {
        console.error('Recovery failed:', recoveryError);
        this.handleError(recoveryError);
      }
    }, delay);
  }

  private async recoverFromNetworkError(error: NetworkError) {
    // Try to reload the same source
    await this.player.load(error.url);
  }

  private async recoverFromMediaError(error: MediaError) {
    // Try alternative sources or formats
    const currentSrc = this.player.currentSrc;
    const alternatives = this.getAlternativeSources(currentSrc);

    for (const alternative of alternatives) {
      try {
        await this.player.load(alternative);
        console.log('Successfully recovered with alternative source');
        return;
      } catch (altError) {
        console.warn('Alternative source failed:', altError);
      }
    }

    throw new Error('No working alternative sources found');
  }

  private async genericRecovery() {
    // Reinitialize the player
    const currentSrc = this.player.currentSrc;
    const currentTime = this.player.currentTime;

    await this.player.load(currentSrc);
    if (currentTime > 0) {
      this.player.seek(currentTime);
    }
  }

  private getAlternativeSources(originalSrc: string): string[] {
    // Implementation depends on your source structure
    // Could return different qualities, formats, or CDN endpoints
    return [];
  }

  private showFatalError(error: Error) {
    console.error('Fatal error - cannot recover:', error);
    // Show user-friendly error message
  }

  private showRetryLimitError(error: Error) {
    console.error('Retry limit exceeded:', error);
    // Show retry limit message with manual retry option
  }
}
```

### Custom Error Handling

```typescript
class CustomErrorHandler {
  private errorQueue: Error[] = [];
  private isProcessing = false;

  constructor(private player: XiaoMei) {
    this.setupErrorHandler();
  }

  private setupErrorHandler() {
    this.player.on('error', (error) => {
      this.queueError(error);
    });
  }

  private queueError(error: Error) {
    this.errorQueue.push(error);

    if (!this.isProcessing) {
      this.processErrorQueue();
    }
  }

  private async processErrorQueue() {
    this.isProcessing = true;

    while (this.errorQueue.length > 0) {
      const error = this.errorQueue.shift()!;
      await this.processError(error);
    }

    this.isProcessing = false;
  }

  private async processError(error: Error) {
    // Log to analytics
    this.logToAnalytics(error);

    // Report to error tracking service
    await this.reportError(error);

    // Show user notification
    this.showUserNotification(error);

    // Attempt automatic recovery
    await this.attemptAutoRecovery(error);
  }

  private logToAnalytics(error: Error) {
    // Send error data to analytics service
    analytics.track('player_error', {
      error_type: error.constructor.name,
      error_code: (error as any).code || 'UNKNOWN',
      error_message: error.message,
      player_state: this.player.store.getState(),
      user_agent: navigator.userAgent,
      timestamp: Date.now()
    });
  }

  private async reportError(error: Error) {
    try {
      await fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
            code: (error as any).code
          },
          context: {
            userAgent: navigator.userAgent,
            url: window.location.href,
            timestamp: Date.now(),
            playerState: this.player.store.getState()
          }
        })
      });
    } catch (reportError) {
      console.error('Failed to report error:', reportError);
    }
  }

  private showUserNotification(error: Error) {
    const userFriendlyMessage = this.getUserFriendlyMessage(error);
    showToast(userFriendlyMessage, 'error');
  }

  private getUserFriendlyMessage(error: Error): string {
    if (error instanceof NetworkError) {
      return 'Connection problem. Please check your internet connection.';
    }

    if (error instanceof MediaError) {
      switch (error.code) {
        case MediaError.MEDIA_ERR_DECODE:
          return 'There was a problem with the video file.';
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          return 'This video format is not supported.';
        default:
          return 'There was a problem playing the video.';
      }
    }

    return 'An unexpected error occurred.';
  }

  private async attemptAutoRecovery(error: Error) {
    // Implement automatic recovery logic
    // This could include retrying, switching sources, etc.
  }
}
```

## Error Prevention

### Validation

```typescript
class ErrorPrevention {
  static validateSource(source: any): void {
    if (!source) {
      throw new SourceError('Source is required', '', PlayerErrorCode.SOURCE_INVALID);
    }

    if (typeof source === 'string') {
      try {
        new URL(source);
      } catch {
        throw new SourceError('Invalid URL format', source, PlayerErrorCode.SOURCE_INVALID);
      }
    }
  }

  static validateCanvas(canvas: any): void {
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new PlayerError(
        PlayerErrorCode.INVALID_STATE,
        'Canvas must be an HTMLCanvasElement'
      );
    }

    if (!canvas.getContext) {
      throw new PlayerError(
        PlayerErrorCode.CANVAS_CONTEXT_LOST,
        'Canvas context is not available'
      );
    }
  }

  static validatePlayerState(player: XiaoMei, operation: string): void {
    if (player.destroyed) {
      throw new PlayerError(
        PlayerErrorCode.INVALID_STATE,
        `Cannot ${operation} on destroyed player`
      );
    }
  }
}

// Usage in XiaoMei methods
async load(source: SourceInput) {
  ErrorPrevention.validatePlayerState(this, 'load');
  ErrorPrevention.validateSource(source);

  try {
    // Loading logic...
  } catch (error) {
    this.emit('error', error);
    throw error;
  }
}
```

## Best Practices

1. **Always Handle Errors**: Listen for error events and handle them appropriately
2. **Provide User Feedback**: Show user-friendly error messages
3. **Log for Debugging**: Include detailed error information for debugging
4. **Implement Recovery**: Attempt automatic recovery for recoverable errors
5. **Monitor Errors**: Track error rates and patterns for system health
6. **Validate Inputs**: Prevent errors through input validation
7. **Graceful Degradation**: Provide fallbacks when features fail
8. **Report Errors**: Send error reports to monitoring services

Error handling in XiaoMei is designed to be comprehensive, providing both automatic recovery mechanisms and detailed information for custom error handling strategies.
