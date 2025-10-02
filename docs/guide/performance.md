# Performance Optimization Guide

This guide covers best practices and techniques for optimizing AVPlay performance in various scenarios and use cases.

## Core Performance Concepts

AVPlay is built with performance in mind, but understanding its internals helps you optimize your implementation:

- **Frame Buffering**: AVPlay buffers video frames for smooth playback
- **Audio Scheduling**: Audio is scheduled ahead of time using Web Audio API
- **Canvas Rendering**: Efficient canvas operations with frame pooling
- **State Management**: Batched state updates to minimize re-renders
- **Memory Management**: Automatic cleanup of video frames and audio buffers

## Memory Optimization

### Frame Management

```typescript
import { AVPlay } from '@avplay/core';

// Configure frame buffer size based on use case
const player = new AVPlay({
  canvas: canvasElement,
  frameBufferSize: 30, // Number of frames to buffer (default: 10)
  maxMemoryUsage: 100 * 1024 * 1024 // 100MB memory limit
});

// Monitor memory usage
player.on('memoryUsage', (usage) => {
  console.log(`Memory usage: ${(usage / 1024 / 1024).toFixed(2)} MB`);

  // Adjust buffer size based on memory pressure
  if (usage > 50 * 1024 * 1024) { // 50MB
    player.setFrameBufferSize(5); // Reduce buffer
  }
});

// Manual memory cleanup when needed
function forceCleanup() {
  player.flush(); // Clear all buffers
  if (window.gc) window.gc(); // Force garbage collection (dev only)
}
```

### Canvas Pool Management

```typescript
class CanvasPoolManager {
  private pool: HTMLCanvasElement[] = [];
  private maxPoolSize = 5;

  getCanvas(width: number, height: number): HTMLCanvasElement {
    let canvas = this.pool.pop();

    if (!canvas) {
      canvas = document.createElement('canvas');
    }

    canvas.width = width;
    canvas.height = height;

    return canvas;
  }

  returnCanvas(canvas: HTMLCanvasElement) {
    if (this.pool.length < this.maxPoolSize) {
      // Clear canvas before returning to pool
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      this.pool.push(canvas);
    }
  }

  clear() {
    this.pool = [];
  }
}

// Use with AVPlay
const canvasPool = new CanvasPoolManager();

// Configure player to use canvas pool
const player = new AVPlay({
  canvas: canvasElement,
  canvasPool: canvasPool
});
```

## Rendering Optimization

### Efficient Canvas Operations

```typescript
class OptimizedRenderer {
  private lastFrameTime = 0;
  private rafId: number | null = null;
  private needsRedraw = false;

  constructor(private player: AVPlay) {
    this.setupEfficientRendering();
  }

  private setupEfficientRendering() {
    // Only render when frame actually changes
    this.player.on('frameChanged', () => {
      this.needsRedraw = true;
      this.scheduleRender();
    });

    // Stop rendering when paused
    this.player.on('pause', () => {
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
    });

    this.player.on('play', () => {
      this.scheduleRender();
    });
  }

  private scheduleRender() {
    if (this.rafId) return;

    this.rafId = requestAnimationFrame((timestamp) => {
      this.rafId = null;

      // Throttle to ~60fps max
      if (timestamp - this.lastFrameTime < 16.67) {
        this.scheduleRender();
        return;
      }

      if (this.needsRedraw) {
        this.render();
        this.needsRedraw = false;
        this.lastFrameTime = timestamp;
      }

      // Continue rendering if playing
      if (this.player.playing) {
        this.scheduleRender();
      }
    });
  }

  private render() {
    // Efficient rendering logic
    const frame = this.player.getCurrentFrame();
    if (frame) {
      this.drawFrame(frame);
    }
  }

  private drawFrame(frame: VideoFrame) {
    const canvas = this.player.canvas;
    const ctx = canvas.getContext('2d')!;

    // Use ImageBitmap for better performance if available
    if ('createImageBitmap' in window) {
      createImageBitmap(frame).then(bitmap => {
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close(); // Important: close to free memory
      });
    } else {
      ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);
    }

    // Close frame to free memory
    frame.close();
  }
}
```

### WebGL Acceleration

```typescript
class WebGLRenderer {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private texture: WebGLTexture;

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl');
    if (!gl) {
      throw new Error('WebGL not supported');
    }
    this.gl = gl;
    this.setupShaders();
    this.setupTexture();
  }

  private setupShaders() {
    const vertexShader = this.createShader(this.gl.VERTEX_SHADER, `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      varying vec2 v_texCoord;

      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = a_texCoord;
      }
    `);

    const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, `
      precision mediump float;
      uniform sampler2D u_texture;
      varying vec2 v_texCoord;

      void main() {
        gl_FragColor = texture2D(u_texture, v_texCoord);
      }
    `);

    this.program = this.createProgram(vertexShader, fragmentShader);
  }

  private createShader(type: number, source: string): WebGLShader {
    const shader = this.gl.createShader(type)!;
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      throw new Error('Shader compilation error: ' + this.gl.getShaderInfoLog(shader));
    }

    return shader;
  }

  private createProgram(vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram {
    const program = this.gl.createProgram()!;
    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);

    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      throw new Error('Program linking error: ' + this.gl.getProgramInfoLog(program));
    }

    return program;
  }

  private setupTexture() {
    this.texture = this.gl.createTexture()!;
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
  }

  renderFrame(frame: VideoFrame) {
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      frame
    );

    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  }
}
```

## Network Optimization

### Efficient Loading

```typescript
class OptimizedLoader {
  private loadQueue: string[] = [];
  private currentRequests = 0;
  private maxConcurrentRequests = 3;

  constructor(private player: AVPlay) {
    this.setupProgressiveLoading();
  }

  private setupProgressiveLoading() {
    // Preload next segments for smooth playback
    this.player.on('progress', (buffered) => {
      const currentTime = this.player.currentTime;
      const duration = this.player.duration;

      // If we're running low on buffer, preload more
      const bufferedEnd = this.getBufferedEnd(buffered, currentTime);
      if (bufferedEnd - currentTime < 30) { // Less than 30s buffered
        this.preloadNextSegment();
      }
    });
  }

  private getBufferedEnd(buffered: TimeRanges, currentTime: number): number {
    for (let i = 0; i < buffered.length; i++) {
      if (buffered.start(i) <= currentTime && currentTime <= buffered.end(i)) {
        return buffered.end(i);
      }
    }
    return currentTime;
  }

  private async preloadNextSegment() {
    if (this.currentRequests >= this.maxConcurrentRequests) {
      return;
    }

    const nextSegmentUrl = this.getNextSegmentUrl();
    if (nextSegmentUrl && !this.loadQueue.includes(nextSegmentUrl)) {
      this.loadQueue.push(nextSegmentUrl);
      this.processLoadQueue();
    }
  }

  private async processLoadQueue() {
    while (this.loadQueue.length > 0 && this.currentRequests < this.maxConcurrentRequests) {
      const url = this.loadQueue.shift()!;
      this.currentRequests++;

      try {
        await this.loadSegment(url);
      } catch (error) {
        console.warn('Failed to preload segment:', error);
      } finally {
        this.currentRequests--;
      }
    }
  }

  private async loadSegment(url: string): Promise<void> {
    const response = await fetch(url, {
      headers: {
        'Range': 'bytes=0-1048576' // Load first 1MB for quick start
      }
    });

    if (response.ok) {
      const buffer = await response.arrayBuffer();
      // Cache the segment for later use
      this.cacheSegment(url, buffer);
    }
  }

  private cacheSegment(url: string, buffer: ArrayBuffer) {
    // Implementation depends on your caching strategy
    if ('caches' in window) {
      caches.open('avplay-segments').then(cache => {
        cache.put(url, new Response(buffer));
      });
    }
  }

  private getNextSegmentUrl(): string | null {
    // Implementation depends on your video format and segmentation
    return null;
  }
}
```

### Adaptive Bitrate

```typescript
class AdaptiveBitrateController {
  private bandwidthHistory: number[] = [];
  private lastSwitchTime = 0;
  private minSwitchInterval = 10000; // 10 seconds

  constructor(private player: AVPlay) {
    this.setupBandwidthMonitoring();
    this.setupQualityAdaptation();
  }

  private setupBandwidthMonitoring() {
    // Monitor download speed
    this.player.on('progress', () => {
      this.measureBandwidth();
    });

    // Use Network Information API if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection.addEventListener('change', () => {
        this.adaptToNetworkCondition(connection.downlink);
      });
    }
  }

  private measureBandwidth() {
    // Simple bandwidth estimation based on download progress
    const now = performance.now();
    const buffered = this.player.buffered;

    if (buffered && buffered.length > 0) {
      const bufferedAmount = buffered.end(buffered.length - 1);
      const downloadTime = now - this.lastMeasureTime;

      if (downloadTime > 1000) { // Measure every second
        const bandwidth = (bufferedAmount / downloadTime) * 8000; // Convert to kbps
        this.bandwidthHistory.push(bandwidth);

        // Keep only recent measurements
        if (this.bandwidthHistory.length > 10) {
          this.bandwidthHistory.shift();
        }

        this.lastMeasureTime = now;
        this.adaptQuality();
      }
    }
  }

  private lastMeasureTime = performance.now();

  private adaptQuality() {
    const now = Date.now();
    if (now - this.lastSwitchTime < this.minSwitchInterval) {
      return; // Too soon to switch again
    }

    const avgBandwidth = this.getAverageBandwidth();
    const currentTrack = this.player.currentVideoTrack;
    const tracks = this.player.tracks.video;

    if (tracks.length <= 1) return;

    let targetTrack = currentTrack;

    // Find appropriate quality based on bandwidth
    for (let i = tracks.length - 1; i >= 0; i--) {
      const track = tracks[i];
      if (track.bitrate && avgBandwidth > track.bitrate * 1.5) {
        targetTrack = i;
        break;
      }
    }

    // Switch if needed
    if (targetTrack !== currentTrack) {
      this.player.selectVideoTrack(targetTrack);
      this.lastSwitchTime = now;
      console.log(`Switched to quality ${targetTrack} (${avgBandwidth.toFixed(0)} kbps)`);
    }
  }

  private getAverageBandwidth(): number {
    if (this.bandwidthHistory.length === 0) return 0;

    const sum = this.bandwidthHistory.reduce((a, b) => a + b, 0);
    return sum / this.bandwidthHistory.length;
  }

  private adaptToNetworkCondition(downlink: number) {
    // Immediately adapt to major network changes
    const bandwidth = downlink * 1000; // Convert to kbps
    this.bandwidthHistory = [bandwidth]; // Reset history
    this.adaptQuality();
  }
}
```

## CPU and Battery Optimization

### Efficient Event Handling

```typescript
class PerformantEventManager {
  private eventQueue: Array<{type: string, data: any}> = [];
  private processingScheduled = false;

  constructor(private player: AVPlay) {
    this.setupBatchedEvents();
  }

  private setupBatchedEvents() {
    // Batch frequent events to reduce CPU usage
    const frequentEvents = ['timeupdate', 'progress'];

    frequentEvents.forEach(eventType => {
      this.player.on(eventType as any, (data) => {
        this.queueEvent(eventType, data);
      });
    });
  }

  private queueEvent(type: string, data: any) {
    this.eventQueue.push({ type, data });

    if (!this.processingScheduled) {
      this.processingScheduled = true;
      requestIdleCallback(() => {
        this.processEventQueue();
        this.processingScheduled = false;
      });
    }
  }

  private processEventQueue() {
    // Group events by type and only process the latest
    const latestEvents = new Map<string, any>();

    this.eventQueue.forEach(({ type, data }) => {
      latestEvents.set(type, data);
    });

    // Process latest events
    latestEvents.forEach((data, type) => {
      this.processEvent(type, data);
    });

    this.eventQueue = [];
  }

  private processEvent(type: string, data: any) {
    switch (type) {
      case 'timeupdate':
        this.updateTimeDisplay(data);
        break;
      case 'progress':
        this.updateProgressBar(data);
        break;
    }
  }

  private updateTimeDisplay(time: number) {
    // Throttled time display update
    const display = document.getElementById('time-display');
    if (display) {
      display.textContent = this.formatTime(time);
    }
  }

  private updateProgressBar(buffered: TimeRanges) {
    // Throttled progress bar update
    const progressBar = document.getElementById('progress-bar');
    if (progressBar && buffered.length > 0) {
      const percent = (buffered.end(0) / this.player.duration) * 100;
      progressBar.style.width = `${percent}%`;
    }
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}
```

### Background Tab Optimization

```typescript
class VisibilityOptimizer {
  private isVisible = true;
  private reducedQuality = false;

  constructor(private player: AVPlay) {
    this.setupVisibilityHandling();
  }

  private setupVisibilityHandling() {
    document.addEventListener('visibilitychange', () => {
      this.isVisible = !document.hidden;
      this.optimizeForVisibility();
    });

    // Also handle window focus/blur
    window.addEventListener('blur', () => {
      this.isVisible = false;
      this.optimizeForVisibility();
    });

    window.addEventListener('focus', () => {
      this.isVisible = true;
      this.optimizeForVisibility();
    });
  }

  private optimizeForVisibility() {
    if (!this.isVisible) {
      // Reduce quality when not visible
      this.reduceQuality();

      // Reduce frame rate
      this.player.setFrameRate(15); // Lower frame rate

      // Reduce buffer size
      this.player.setFrameBufferSize(5);
    } else {
      // Restore quality when visible again
      this.restoreQuality();

      // Restore frame rate
      this.player.setFrameRate(30);

      // Restore buffer size
      this.player.setFrameBufferSize(10);
    }
  }

  private reduceQuality() {
    if (this.reducedQuality) return;

    const tracks = this.player.tracks.video;
    if (tracks.length > 1) {
      // Switch to lowest quality
      const lowestQuality = this.findLowestQualityTrack(tracks);
      this.player.selectVideoTrack(lowestQuality);
      this.reducedQuality = true;
    }
  }

  private restoreQuality() {
    if (!this.reducedQuality) return;

    // Let adaptive bitrate controller handle quality selection
    this.reducedQuality = false;
  }

  private findLowestQualityTrack(tracks: any[]): number {
    let minPixels = Infinity;
    let lowestIndex = 0;

    tracks.forEach((track, index) => {
      const pixels = track.width * track.height;
      if (pixels < minPixels) {
        minPixels = pixels;
        lowestIndex = index;
      }
    });

    return lowestIndex;
  }
}
```

## Monitoring and Debugging

### Performance Monitor

```typescript
class PerformanceMonitor {
  private metrics = {
    frameDrops: 0,
    avgFrameTime: 0,
    memoryUsage: 0,
    bufferHealth: 0,
    networkBandwidth: 0
  };

  private frameTimeHistory: number[] = [];
  private lastFrameTime = 0;

  constructor(private player: AVPlay) {
    this.setupMonitoring();
  }

  private setupMonitoring() {
    // Monitor frame rendering performance
    this.player.on('frameRendered', (timestamp) => {
      this.trackFramePerformance(timestamp);
    });

    // Monitor memory usage
    setInterval(() => {
      this.checkMemoryUsage();
    }, 5000);

    // Monitor buffer health
    this.player.on('progress', () => {
      this.checkBufferHealth();
    });
  }

  private trackFramePerformance(timestamp: number) {
    if (this.lastFrameTime > 0) {
      const frameTime = timestamp - this.lastFrameTime;
      this.frameTimeHistory.push(frameTime);

      // Keep only recent frame times
      if (this.frameTimeHistory.length > 60) {
        this.frameTimeHistory.shift();
      }

      // Calculate average
      const sum = this.frameTimeHistory.reduce((a, b) => a + b, 0);
      this.metrics.avgFrameTime = sum / this.frameTimeHistory.length;

      // Detect frame drops (frame time > 33ms for 30fps)
      if (frameTime > 33) {
        this.metrics.frameDrops++;
      }
    }

    this.lastFrameTime = timestamp;
  }

  private checkMemoryUsage() {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.metrics.memoryUsage = memory.usedJSHeapSize;

      // Warn if memory usage is high
      if (memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.8) {
        console.warn('High memory usage detected:', {
          used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
          limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
        });
      }
    }
  }

  private checkBufferHealth() {
    const currentTime = this.player.currentTime;
    const buffered = this.player.buffered;

    if (buffered && buffered.length > 0) {
      // Find buffer level at current time
      for (let i = 0; i < buffered.length; i++) {
        if (buffered.start(i) <= currentTime && currentTime <= buffered.end(i)) {
          this.metrics.bufferHealth = buffered.end(i) - currentTime;
          break;
        }
      }
    }

    // Warn if buffer is low
    if (this.metrics.bufferHealth < 5) {
      console.warn('Low buffer detected:', this.metrics.bufferHealth);
    }
  }

  getMetrics() {
    return { ...this.metrics };
  }

  logPerformanceReport() {
    const report = {
      ...this.metrics,
      avgFrameTime: Math.round(this.metrics.avgFrameTime * 100) / 100,
      memoryUsageMB: Math.round(this.metrics.memoryUsage / 1024 / 1024),
      bufferHealthSeconds: Math.round(this.metrics.bufferHealth * 100) / 100
    };

    console.table(report);
  }
}

// Usage
const monitor = new PerformanceMonitor(player);

// Log performance report every 30 seconds
setInterval(() => {
  monitor.logPerformanceReport();
}, 30000);
```

## Best Practices Summary

### Memory Management
- Set appropriate frame buffer sizes
- Use canvas pooling for multiple players
- Implement proper cleanup on component unmount
- Monitor memory usage and adapt accordingly

### Rendering Performance
- Use `requestAnimationFrame` for smooth rendering
- Only render when frames actually change
- Consider WebGL for complex video processing
- Implement efficient canvas operations

### Network Optimization
- Implement adaptive bitrate streaming
- Use progressive loading for large files
- Cache frequently accessed segments
- Monitor bandwidth and adapt quality

### CPU and Battery
- Batch frequent events to reduce processing
- Reduce quality when tab is not visible
- Use `requestIdleCallback` for non-critical operations
- Implement efficient event handling

### Monitoring
- Track frame drop rates and rendering performance
- Monitor memory usage and buffer health
- Log performance metrics for debugging
- Implement automated quality adaptation

Following these optimization techniques will help you build high-performance video players that work well across different devices and network conditions.
