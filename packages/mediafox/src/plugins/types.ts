import type { WrappedCanvas } from 'mediabunny';
import type { MediaFox } from '../mediafox';
import type { MediaInfo, MediaSource, PlayerEventMap, PlayerStateData } from '../types';

// ============================================================================
// Utility Types
// ============================================================================

/** A value that may or may not be a Promise */
export type MaybePromise<T> = T | Promise<T>;

/** Result from a hook that can cancel or modify an operation */
export interface HookResult<T = void> {
  /** If true, cancel the operation */
  cancel?: boolean;
  /** Modified value to use instead of original */
  data?: T;
}

/** Overlay render dimensions */
export interface OverlayDimensions {
  width: number;
  height: number;
}

// ============================================================================
// Hook Interfaces
// ============================================================================

/**
 * Lifecycle hooks are called at key points during player operations.
 * These hooks can be async and may cancel or modify operations.
 */
export interface LifecycleHooks {
  /** Called before loading a media source. Can modify source or cancel. */
  beforeLoad?(source: MediaSource): MaybePromise<HookResult<MediaSource> | undefined>;
  /** Called after media is loaded successfully. */
  afterLoad?(mediaInfo: MediaInfo): MaybePromise<void>;

  /** Called before play starts. Can cancel play. */
  beforePlay?(): MaybePromise<HookResult | undefined>;
  /** Called after play has started. */
  afterPlay?(): void;

  /** Called before pause. Can cancel pause. */
  beforePause?(): MaybePromise<HookResult | undefined>;
  /** Called after pause completes. */
  afterPause?(): void;

  /** Called before seeking. Can modify seek time or cancel. */
  beforeSeek?(time: number): MaybePromise<HookResult<number> | undefined>;
  /** Called after seek completes. */
  afterSeek?(time: number): void;

  /** Called before stop. Can cancel stop. */
  beforeStop?(): MaybePromise<HookResult | undefined>;
  /** Called after stop completes. */
  afterStop?(): void;

  /** Called when an error occurs. Return { handled: true } to suppress. */
  onError?(error: Error): { handled?: boolean } | undefined;
  /** Called when playback ends naturally. */
  onEnded?(): void;
}

/**
 * Render hooks are called during the video rendering pipeline.
 * IMPORTANT: These must be synchronous for performance.
 */
export interface RenderHooks {
  /** Called before a frame is rendered. Return { skip: true } to skip this frame. */
  beforeRender?(frame: WrappedCanvas, time: number): { skip?: boolean } | undefined;
  /** Called to transform a frame before rendering. Return modified frame. */
  transformFrame?(frame: WrappedCanvas): WrappedCanvas;
  /** Called after frame is rendered to canvas. */
  afterRender?(canvas: HTMLCanvasElement | OffscreenCanvas): void;

  /**
   * Canvas overlay hook - draws on top of video frame.
   * zIndex controls layer order (higher = on top).
   * Default zIndex is 0; plugins with same zIndex render in registration order.
   */
  onOverlay?: {
    /** Layer order - higher values render on top */
    zIndex?: number;
    /** Render function called each frame */
    render(ctx: CanvasRenderingContext2D, time: number, dimensions: OverlayDimensions): void;
  };
}

/**
 * State hooks are called when player state changes.
 * These are synchronous.
 */
export interface StateHooks {
  /** Called before state is updated. Return modified update or null to cancel. */
  beforeStateUpdate?(update: Partial<PlayerStateData>): Partial<PlayerStateData> | null | undefined;
  /** Called after state has changed. */
  onStateChange?(state: PlayerStateData, prevState: PlayerStateData): void;
}

/**
 * Event hooks allow intercepting and modifying player events.
 * These are synchronous.
 */
export interface EventHooks {
  /** Called before an event is emitted. Can modify data or cancel emission. */
  beforeEvent?<K extends keyof PlayerEventMap>(
    event: K,
    data: PlayerEventMap[K]
  ): HookResult<PlayerEventMap[K]> | undefined;
  /** Called after an event is emitted. */
  afterEvent?<K extends keyof PlayerEventMap>(event: K, data: PlayerEventMap[K]): void;
}

/**
 * Audio hooks allow modifying the Web Audio graph.
 * These are synchronous.
 */
export interface AudioHooks {
  /**
   * Called when audio graph is set up.
   * Return a modified AudioNode to insert into the chain.
   */
  onAudioNode?(audioContext: AudioContext, sourceNode: GainNode): AudioNode | undefined;
}

/**
 * All plugin hooks grouped by category.
 */
export interface PluginHooks {
  lifecycle?: LifecycleHooks;
  render?: RenderHooks;
  state?: StateHooks;
  event?: EventHooks;
  audio?: AudioHooks;
}

// ============================================================================
// Plugin Context
// ============================================================================

/**
 * Context provided to plugins during installation.
 * Provides controlled access to player internals.
 */
export interface PluginContext {
  /** Reference to the MediaFox player instance */
  readonly player: MediaFox;

  // State access
  /** Get current player state (read-only) */
  getState(): Readonly<PlayerStateData>;
  /** Subscribe to state changes. Returns unsubscribe function. */
  subscribe(listener: (state: PlayerStateData) => void): () => void;

  // Plugin-specific state (isolated namespace)
  /** Get plugin's private state */
  getPluginState<T>(): T | undefined;
  /** Set plugin's private state */
  setPluginState<T>(state: T): void;

  // Events (auto-cleanup on uninstall)
  /** Subscribe to player event */
  on<K extends keyof PlayerEventMap>(event: K, handler: (data: PlayerEventMap[K]) => void): void;
  /** Unsubscribe from player event */
  off<K extends keyof PlayerEventMap>(event: K, handler: (data: PlayerEventMap[K]) => void): void;

  // Canvas access
  /** Get the player's render canvas */
  getCanvas(): HTMLCanvasElement | OffscreenCanvas | null;

  // Inter-plugin communication
  /** Get another plugin by name */
  getPlugin<T extends MediaFoxPlugin>(name: string): T | undefined;
  /** Check if a plugin is installed */
  hasPlugin(name: string): boolean;

  // Logging (prefixed with plugin name)
  /** Log message with plugin prefix */
  log(...args: unknown[]): void;
  /** Log warning with plugin prefix */
  warn(...args: unknown[]): void;
  /** Log error with plugin prefix */
  error(...args: unknown[]): void;
}

// ============================================================================
// Plugin Interface
// ============================================================================

/**
 * MediaFox plugin interface.
 * Plugins must implement this interface to be used with player.use().
 */
export interface MediaFoxPlugin {
  /** Unique plugin name */
  readonly name: string;
  /** Plugin version (optional, for debugging) */
  readonly version?: string;
  /** Other plugins that must be installed first */
  readonly dependencies?: string[];

  /**
   * Called when plugin is installed.
   * Use context to set up event listeners and state.
   */
  install(context: PluginContext): void | Promise<void>;

  /**
   * Called when plugin is uninstalled (optional).
   * Clean up any external resources here.
   * Event listeners registered via context.on() are auto-cleaned.
   */
  uninstall?(): void | Promise<void>;

  /**
   * Plugin hooks (optional).
   * Define hooks to intercept player operations.
   */
  hooks?: PluginHooks;
}

// ============================================================================
// Internal Types
// ============================================================================

/** @internal Installed plugin with context */
export interface InstalledPlugin {
  plugin: MediaFoxPlugin;
  context: PluginContext;
  eventListeners: Map<keyof PlayerEventMap, Set<(data: unknown) => void>>;
  stateUnsubscribes: Array<() => void>;
  pluginState: unknown;
}

/** @internal Overlay entry for sorted rendering */
export interface OverlayEntry {
  pluginName: string;
  zIndex: number;
  registrationOrder: number;
  render: RenderHooks['onOverlay'];
}
