export enum ErrorCode {
  MEDIA_NOT_SUPPORTED = 'MEDIA_NOT_SUPPORTED',
  MEDIA_LOAD_FAILED = 'MEDIA_LOAD_FAILED',
  DECODE_ERROR = 'DECODE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  PLAYBACK_ERROR = 'PLAYBACK_ERROR',
  TRACK_NOT_FOUND = 'TRACK_NOT_FOUND',
  INVALID_STATE = 'INVALID_STATE',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export class MediaFoxError extends Error {
  code: ErrorCode;
  details?: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'MediaFoxError';
    this.code = code;
    this.details = details;
  }

  static mediaNotSupported(message = 'Media format not supported', details?: unknown): MediaFoxError {
    return new MediaFoxError(ErrorCode.MEDIA_NOT_SUPPORTED, message, details);
  }

  static mediaLoadFailed(message = 'Failed to load media', details?: unknown): MediaFoxError {
    return new MediaFoxError(ErrorCode.MEDIA_LOAD_FAILED, message, details);
  }

  static decodeError(message = 'Failed to decode media', details?: unknown): MediaFoxError {
    return new MediaFoxError(ErrorCode.DECODE_ERROR, message, details);
  }

  static networkError(message = 'Network error occurred', details?: unknown): MediaFoxError {
    return new MediaFoxError(ErrorCode.NETWORK_ERROR, message, details);
  }

  static permissionDenied(message = 'Permission denied', details?: unknown): MediaFoxError {
    return new MediaFoxError(ErrorCode.PERMISSION_DENIED, message, details);
  }

  static playbackError(message = 'Playback error occurred', details?: unknown): MediaFoxError {
    return new MediaFoxError(ErrorCode.PLAYBACK_ERROR, message, details);
  }

  static trackNotFound(message = 'Track not found', details?: unknown): MediaFoxError {
    return new MediaFoxError(ErrorCode.TRACK_NOT_FOUND, message, details);
  }

  static invalidState(message = 'Invalid player state', details?: unknown): MediaFoxError {
    return new MediaFoxError(ErrorCode.INVALID_STATE, message, details);
  }

  static unknownError(message = 'Unknown error occurred', details?: unknown): MediaFoxError {
    return new MediaFoxError(ErrorCode.UNKNOWN_ERROR, message, details);
  }
}

/**
 * Wrap an error with additional context
 */
export function wrapError(error: unknown, context: string): MediaFoxError {
  if (error instanceof MediaFoxError) {
    return error;
  }

  if (error instanceof Error) {
    return new MediaFoxError(ErrorCode.UNKNOWN_ERROR, `${context}: ${error.message}`, { originalError: error });
  }

  return new MediaFoxError(ErrorCode.UNKNOWN_ERROR, `${context}: ${String(error)}`, { originalError: error });
}
