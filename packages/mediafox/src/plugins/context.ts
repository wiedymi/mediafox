import type { MediaFox } from '../mediafox';
import type { PlayerEventMap, PlayerStateData } from '../types';
import type { InstalledPlugin, MediaFoxPlugin, PluginContext } from './types';

/**
 * Creates a PluginContext for a plugin.
 * The context provides controlled access to player internals.
 * @internal
 */
export function createPluginContext(
  player: MediaFox,
  plugin: MediaFoxPlugin,
  installedPlugin: InstalledPlugin,
  getInstalledPlugins: () => Map<string, InstalledPlugin>
): PluginContext {
  const pluginName = plugin.name;

  return {
    player,

    // State access
    getState(): Readonly<PlayerStateData> {
      return player.getState();
    },

    subscribe(listener: (state: PlayerStateData) => void): () => void {
      const subscription = player.subscribe(listener);
      const unsubscribe = () => subscription.unsubscribe();
      installedPlugin.stateUnsubscribes.push(unsubscribe);
      return unsubscribe;
    },

    // Plugin-specific state
    getPluginState<T>(): T | undefined {
      return installedPlugin.pluginState as T | undefined;
    },

    setPluginState<T>(state: T): void {
      installedPlugin.pluginState = state;
    },

    // Events with auto-cleanup tracking
    on<K extends keyof PlayerEventMap>(event: K, handler: (data: PlayerEventMap[K]) => void): void {
      player.on(event, handler);

      // Track for auto-cleanup
      let listeners = installedPlugin.eventListeners.get(event);
      if (!listeners) {
        listeners = new Set();
        installedPlugin.eventListeners.set(event, listeners);
      }
      listeners.add(handler as (data: unknown) => void);
    },

    off<K extends keyof PlayerEventMap>(event: K, handler: (data: PlayerEventMap[K]) => void): void {
      player.off(event, handler);

      // Remove from tracking
      const listeners = installedPlugin.eventListeners.get(event);
      if (listeners) {
        listeners.delete(handler as (data: unknown) => void);
      }
    },

    // Canvas access
    getCanvas(): HTMLCanvasElement | OffscreenCanvas | null {
      return player.getRenderTarget();
    },

    // Inter-plugin communication
    getPlugin<T extends MediaFoxPlugin>(name: string): T | undefined {
      const installed = getInstalledPlugins().get(name);
      return installed?.plugin as T | undefined;
    },

    hasPlugin(name: string): boolean {
      return getInstalledPlugins().has(name);
    },

    // Logging with plugin prefix
    log(...args: unknown[]): void {
      console.log(`[MediaFox:${pluginName}]`, ...args);
    },

    warn(...args: unknown[]): void {
      console.warn(`[MediaFox:${pluginName}]`, ...args);
    },

    error(...args: unknown[]): void {
      console.error(`[MediaFox:${pluginName}]`, ...args);
    },
  };
}
