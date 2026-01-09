import type { WrappedCanvas } from 'mediabunny';
import type { MediaFox } from '../mediafox';
import type { MediaInfo, MediaSource, PlayerEventMap, PlayerStateData } from '../types';
import { createPluginContext } from './context';
import type { HookResult, InstalledPlugin, MediaFoxPlugin, OverlayDimensions, OverlayEntry } from './types';

/**
 * Manages plugin lifecycle and hook execution.
 * @internal
 */
export class PluginManager {
  private plugins: Map<string, InstalledPlugin> = new Map();
  private overlays: OverlayEntry[] = [];
  private overlaysSorted = false;
  private registrationCounter = 0;

  constructor(private player: MediaFox) {}

  /**
   * Install a plugin.
   */
  async install(plugin: MediaFoxPlugin): Promise<void> {
    const { name } = plugin;

    // Check if already installed
    if (this.plugins.has(name)) {
      throw new Error(`Plugin "${name}" is already installed`);
    }

    // Check dependencies
    if (plugin.dependencies) {
      for (const dep of plugin.dependencies) {
        if (!this.plugins.has(dep)) {
          throw new Error(`Plugin "${name}" requires plugin "${dep}" to be installed first`);
        }
      }
    }

    // Create installed plugin entry
    const installedPlugin: InstalledPlugin = {
      plugin,
      context: null as unknown as InstalledPlugin['context'], // Will be set below
      eventListeners: new Map(),
      stateUnsubscribes: [],
      pluginState: undefined,
    };

    // Create context
    installedPlugin.context = createPluginContext(this.player, plugin, installedPlugin, () => this.plugins);

    // Store before install (so inter-plugin communication works)
    this.plugins.set(name, installedPlugin);

    // Call install
    try {
      await plugin.install(installedPlugin.context);
    } catch (error) {
      // Remove on failure
      this.plugins.delete(name);
      throw error;
    }

    // Register overlay if present
    if (plugin.hooks?.render?.onOverlay) {
      this.overlays.push({
        pluginName: name,
        zIndex: plugin.hooks.render.onOverlay.zIndex ?? 0,
        registrationOrder: this.registrationCounter++,
        render: plugin.hooks.render.onOverlay,
      });
      this.overlaysSorted = false;
      // Refresh overlays immediately so new overlay appears
      this.player.refreshOverlays();
    }
  }

  /**
   * Uninstall a plugin by name.
   */
  async uninstall(name: string): Promise<void> {
    const installed = this.plugins.get(name);
    if (!installed) {
      throw new Error(`Plugin "${name}" is not installed`);
    }

    // Call uninstall hook
    try {
      await installed.plugin.uninstall?.();
    } catch (error) {
      console.error(`Error uninstalling plugin "${name}":`, error);
    }

    // Cleanup event listeners
    for (const [event, listeners] of installed.eventListeners) {
      for (const listener of listeners) {
        this.player.off(event, listener as (data: PlayerEventMap[typeof event]) => void);
      }
    }

    // Cleanup state subscriptions
    for (const unsubscribe of installed.stateUnsubscribes) {
      unsubscribe();
    }

    // Remove overlay and refresh if this plugin had one
    const hadOverlay = this.overlays.some((o) => o.pluginName === name);
    this.overlays = this.overlays.filter((o) => o.pluginName !== name);

    // Remove from plugins
    this.plugins.delete(name);

    // Refresh overlays immediately so removed overlay disappears
    if (hadOverlay) {
      this.player.refreshOverlays();
    }
  }

  /**
   * Check if a plugin is installed.
   */
  has(name: string): boolean {
    return this.plugins.has(name);
  }

  /**
   * Get installed plugin count.
   */
  get size(): number {
    return this.plugins.size;
  }

  // ============================================================================
  // Lifecycle Hook Execution
  // ============================================================================

  async executeBeforeLoad(source: MediaSource): Promise<HookResult<MediaSource> | undefined> {
    for (const [, installed] of this.plugins) {
      const hook = installed.plugin.hooks?.lifecycle?.beforeLoad;
      if (!hook) continue;

      try {
        const result = await hook.call(installed.plugin, source);
        if (result?.cancel) return result;
        if (result?.data !== undefined) source = result.data;
      } catch (error) {
        console.error(`[MediaFox:${installed.plugin.name}] Error in beforeLoad hook:`, error);
      }
    }
    return { data: source };
  }

  async executeAfterLoad(mediaInfo: MediaInfo): Promise<void> {
    for (const [, installed] of this.plugins) {
      const hook = installed.plugin.hooks?.lifecycle?.afterLoad;
      if (!hook) continue;

      try {
        await hook.call(installed.plugin, mediaInfo);
      } catch (error) {
        console.error(`[MediaFox:${installed.plugin.name}] Error in afterLoad hook:`, error);
      }
    }
  }

  async executeBeforePlay(): Promise<HookResult | undefined> {
    for (const [, installed] of this.plugins) {
      const hook = installed.plugin.hooks?.lifecycle?.beforePlay;
      if (!hook) continue;

      try {
        const result = await hook.call(installed.plugin);
        if (result?.cancel) return result;
      } catch (error) {
        console.error(`[MediaFox:${installed.plugin.name}] Error in beforePlay hook:`, error);
      }
    }
    return undefined;
  }

  executeAfterPlay(): void {
    for (const [, installed] of this.plugins) {
      const hook = installed.plugin.hooks?.lifecycle?.afterPlay;
      if (!hook) continue;

      try {
        hook.call(installed.plugin);
      } catch (error) {
        console.error(`[MediaFox:${installed.plugin.name}] Error in afterPlay hook:`, error);
      }
    }
  }

  async executeBeforePause(): Promise<HookResult | undefined> {
    for (const [, installed] of this.plugins) {
      const hook = installed.plugin.hooks?.lifecycle?.beforePause;
      if (!hook) continue;

      try {
        const result = await hook.call(installed.plugin);
        if (result?.cancel) return result;
      } catch (error) {
        console.error(`[MediaFox:${installed.plugin.name}] Error in beforePause hook:`, error);
      }
    }
    return undefined;
  }

  executeAfterPause(): void {
    for (const [, installed] of this.plugins) {
      const hook = installed.plugin.hooks?.lifecycle?.afterPause;
      if (!hook) continue;

      try {
        hook.call(installed.plugin);
      } catch (error) {
        console.error(`[MediaFox:${installed.plugin.name}] Error in afterPause hook:`, error);
      }
    }
  }

  async executeBeforeSeek(time: number): Promise<HookResult<number> | undefined> {
    for (const [, installed] of this.plugins) {
      const hook = installed.plugin.hooks?.lifecycle?.beforeSeek;
      if (!hook) continue;

      try {
        const result = await hook.call(installed.plugin, time);
        if (result?.cancel) return result;
        if (result?.data !== undefined) time = result.data;
      } catch (error) {
        console.error(`[MediaFox:${installed.plugin.name}] Error in beforeSeek hook:`, error);
      }
    }
    return { data: time };
  }

  executeAfterSeek(time: number): void {
    for (const [, installed] of this.plugins) {
      const hook = installed.plugin.hooks?.lifecycle?.afterSeek;
      if (!hook) continue;

      try {
        hook.call(installed.plugin, time);
      } catch (error) {
        console.error(`[MediaFox:${installed.plugin.name}] Error in afterSeek hook:`, error);
      }
    }
  }

  async executeBeforeStop(): Promise<HookResult | undefined> {
    for (const [, installed] of this.plugins) {
      const hook = installed.plugin.hooks?.lifecycle?.beforeStop;
      if (!hook) continue;

      try {
        const result = await hook.call(installed.plugin);
        if (result?.cancel) return result;
      } catch (error) {
        console.error(`[MediaFox:${installed.plugin.name}] Error in beforeStop hook:`, error);
      }
    }
    return undefined;
  }

  executeAfterStop(): void {
    for (const [, installed] of this.plugins) {
      const hook = installed.plugin.hooks?.lifecycle?.afterStop;
      if (!hook) continue;

      try {
        hook.call(installed.plugin);
      } catch (error) {
        console.error(`[MediaFox:${installed.plugin.name}] Error in afterStop hook:`, error);
      }
    }
  }

  executeOnError(error: Error): boolean {
    let handled = false;
    for (const [, installed] of this.plugins) {
      const hook = installed.plugin.hooks?.lifecycle?.onError;
      if (!hook) continue;

      try {
        const result = hook.call(installed.plugin, error);
        if (result?.handled) handled = true;
      } catch (hookError) {
        console.error(`[MediaFox:${installed.plugin.name}] Error in onError hook:`, hookError);
      }
    }
    return handled;
  }

  executeOnEnded(): void {
    for (const [, installed] of this.plugins) {
      const hook = installed.plugin.hooks?.lifecycle?.onEnded;
      if (!hook) continue;

      try {
        hook.call(installed.plugin);
      } catch (error) {
        console.error(`[MediaFox:${installed.plugin.name}] Error in onEnded hook:`, error);
      }
    }
  }

  // ============================================================================
  // Render Hook Execution
  // ============================================================================

  executeBeforeRender(frame: WrappedCanvas, time: number): { skip?: boolean } | undefined {
    for (const [, installed] of this.plugins) {
      const hook = installed.plugin.hooks?.render?.beforeRender;
      if (!hook) continue;

      try {
        const result = hook.call(installed.plugin, frame, time);
        if (result?.skip) return result;
      } catch (error) {
        console.error(`[MediaFox:${installed.plugin.name}] Error in beforeRender hook:`, error);
      }
    }
    return undefined;
  }

  executeTransformFrame(frame: WrappedCanvas): WrappedCanvas {
    for (const [, installed] of this.plugins) {
      const hook = installed.plugin.hooks?.render?.transformFrame;
      if (!hook) continue;

      try {
        const result = hook.call(installed.plugin, frame);
        if (result) frame = result;
      } catch (error) {
        console.error(`[MediaFox:${installed.plugin.name}] Error in transformFrame hook:`, error);
      }
    }
    return frame;
  }

  executeAfterRender(canvas: HTMLCanvasElement | OffscreenCanvas): void {
    for (const [, installed] of this.plugins) {
      const hook = installed.plugin.hooks?.render?.afterRender;
      if (!hook) continue;

      try {
        hook.call(installed.plugin, canvas);
      } catch (error) {
        console.error(`[MediaFox:${installed.plugin.name}] Error in afterRender hook:`, error);
      }
    }
  }

  executeOverlays(ctx: CanvasRenderingContext2D, time: number, dimensions: OverlayDimensions): void {
    if (this.overlays.length === 0) return;

    // Sort overlays if needed
    if (!this.overlaysSorted) {
      this.overlays.sort((a, b) => {
        if (a.zIndex !== b.zIndex) return a.zIndex - b.zIndex;
        return a.registrationOrder - b.registrationOrder;
      });
      this.overlaysSorted = true;
    }

    // Execute overlays in order
    for (const overlay of this.overlays) {
      try {
        overlay.render?.render(ctx, time, dimensions);
      } catch (error) {
        console.error(`[MediaFox:${overlay.pluginName}] Error in onOverlay hook:`, error);
      }
    }
  }

  // ============================================================================
  // State Hook Execution
  // ============================================================================

  executeBeforeStateUpdate(update: Partial<PlayerStateData>): Partial<PlayerStateData> | null {
    for (const [, installed] of this.plugins) {
      const hook = installed.plugin.hooks?.state?.beforeStateUpdate;
      if (!hook) continue;

      try {
        const result = hook.call(installed.plugin, update);
        if (result === null) return null;
        if (result !== undefined) update = result;
      } catch (error) {
        console.error(`[MediaFox:${installed.plugin.name}] Error in beforeStateUpdate hook:`, error);
      }
    }
    return update;
  }

  executeOnStateChange(state: PlayerStateData, prevState: PlayerStateData): void {
    for (const [, installed] of this.plugins) {
      const hook = installed.plugin.hooks?.state?.onStateChange;
      if (!hook) continue;

      try {
        hook.call(installed.plugin, state, prevState);
      } catch (error) {
        console.error(`[MediaFox:${installed.plugin.name}] Error in onStateChange hook:`, error);
      }
    }
  }

  // ============================================================================
  // Event Hook Execution
  // ============================================================================

  executeBeforeEvent<K extends keyof PlayerEventMap>(
    event: K,
    data: PlayerEventMap[K]
  ): HookResult<PlayerEventMap[K]> | undefined {
    for (const [, installed] of this.plugins) {
      const hook = installed.plugin.hooks?.event?.beforeEvent;
      if (!hook) continue;

      try {
        const result = hook.call(installed.plugin, event, data) as HookResult<PlayerEventMap[K]> | undefined;
        if (result?.cancel) return result;
        if (result?.data !== undefined) data = result.data;
      } catch (error) {
        console.error(`[MediaFox:${installed.plugin.name}] Error in beforeEvent hook:`, error);
      }
    }
    return { data };
  }

  executeAfterEvent<K extends keyof PlayerEventMap>(event: K, data: PlayerEventMap[K]): void {
    for (const [, installed] of this.plugins) {
      const hook = installed.plugin.hooks?.event?.afterEvent;
      if (!hook) continue;

      try {
        hook.call(installed.plugin, event, data);
      } catch (error) {
        console.error(`[MediaFox:${installed.plugin.name}] Error in afterEvent hook:`, error);
      }
    }
  }

  // ============================================================================
  // Audio Hook Execution
  // ============================================================================

  executeOnAudioNode(audioContext: AudioContext, gainNode: GainNode): AudioNode {
    let currentNode: AudioNode = gainNode;

    for (const [, installed] of this.plugins) {
      const hook = installed.plugin.hooks?.audio?.onAudioNode;
      if (!hook) continue;

      try {
        const result = hook.call(installed.plugin, audioContext, gainNode);
        if (result) currentNode = result;
      } catch (error) {
        console.error(`[MediaFox:${installed.plugin.name}] Error in onAudioNode hook:`, error);
      }
    }

    return currentNode;
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  async dispose(): Promise<void> {
    // Uninstall all plugins in reverse order
    const names = Array.from(this.plugins.keys()).reverse();
    for (const name of names) {
      try {
        await this.uninstall(name);
      } catch (error) {
        console.error(`Error disposing plugin "${name}":`, error);
      }
    }
  }
}
