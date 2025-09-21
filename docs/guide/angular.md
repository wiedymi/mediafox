# Angular Integration

XiaoMei integrates seamlessly with Angular using services and components. This guide covers Angular 16+ with standalone components.

## Angular Service

Create a service to manage the player instance:

```typescript
// xiaomei.service.ts
import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { XiaoMei, PlayerStateData, PlayerOptions } from 'xiaomei';

@Injectable({
  providedIn: 'root'
})
export class XiaoMeiService implements OnDestroy {
  private player: XiaoMei | null = null;
  private stateSubject = new BehaviorSubject<PlayerStateData | null>(null);
  private errorSubject = new BehaviorSubject<Error | null>(null);

  state$: Observable<PlayerStateData | null> = this.stateSubject.asObservable();
  error$: Observable<Error | null> = this.errorSubject.asObservable();

  initialize(options: PlayerOptions): void {
    if (this.player) {
      this.player.dispose();
    }

    this.player = new XiaoMei(options);

    // Subscribe to state changes
    this.player.subscribe(state => {
      this.stateSubject.next(state);
    });

    // Handle errors
    this.player.on('error', error => {
      this.errorSubject.next(error);
    });
  }

  async load(source: any): Promise<void> {
    if (!this.player) {
      throw new Error('Player not initialized');
    }

    try {
      this.errorSubject.next(null);
      await this.player.load(source);
    } catch (error) {
      this.errorSubject.next(error as Error);
      throw error;
    }
  }

  async play(): Promise<void> {
    await this.player?.play();
  }

  pause(): void {
    this.player?.pause();
  }

  async seek(time: number): Promise<void> {
    await this.player?.seek(time);
  }

  setVolume(volume: number): void {
    if (this.player) {
      this.player.volume = volume;
    }
  }

  setMuted(muted: boolean): void {
    if (this.player) {
      this.player.muted = muted;
    }
  }

  ngOnDestroy(): void {
    this.player?.dispose();
    this.stateSubject.complete();
    this.errorSubject.complete();
  }
}
```

## Basic Video Player Component

```typescript
// video-player.component.ts
import { Component, ElementRef, Input, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { XiaoMeiService } from './xiaomei.service';
import { formatTime } from 'xiaomei';

@Component({
  selector: 'app-video-player',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="video-player">
      <canvas #videoCanvas class="video-canvas"></canvas>

      <div class="controls" *ngIf="state$ | async as state">
        <button (click)="togglePlay()">
          {{ state.playing ? '⏸' : '▶️' }}
        </button>

        <div class="progress" (click)="handleSeek($event)">
          <div
            class="progress-bar"
            [style.width.%]="(state.currentTime / state.duration) * 100"
          ></div>
        </div>

        <span class="time">
          {{ formatTime(state.currentTime) }} / {{ formatTime(state.duration) }}
        </span>

        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          [value]="state.volume"
          (input)="updateVolume($event)"
        />
      </div>

      <div class="error" *ngIf="error$ | async as error">
        Error: {{ error.message }}
      </div>
    </div>
  `,
  styles: [`
    .video-player {
      background: #000;
      border-radius: 8px;
      overflow: hidden;
    }

    .video-canvas {
      width: 100%;
      height: auto;
      display: block;
    }

    .controls {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px;
      background: #333;
    }

    .progress {
      flex: 1;
      height: 4px;
      background: #666;
      cursor: pointer;
      position: relative;
    }

    .progress-bar {
      height: 100%;
      background: #0066cc;
    }

    .time {
      color: white;
      font-size: 14px;
    }

    .error {
      padding: 10px;
      background: #f44336;
      color: white;
    }
  `]
})
export class VideoPlayerComponent implements OnInit, OnDestroy {
  @ViewChild('videoCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @Input() src?: string | File | Blob;
  @Input() autoplay = false;

  state$ = this.playerService.state$;
  error$ = this.playerService.error$;
  formatTime = formatTimeUtil;

  constructor(private playerService: XiaoMeiService) {}

  ngOnInit(): void {
    // Initialize player with canvas
    this.playerService.initialize({
      renderTarget: this.canvasRef.nativeElement,
      autoplay: this.autoplay
    });

    // Load source if provided
    if (this.src) {
      this.playerService.load(this.src);
    }
  }

  ngOnDestroy(): void {
    // Service handles cleanup
  }

  async togglePlay(): Promise<void> {
    const state = await this.state$.pipe(take(1)).toPromise();
    if (state?.playing) {
      this.playerService.pause();
    } else {
      await this.playerService.play();
    }
  }

  handleSeek(event: MouseEvent): void {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const percent = (event.clientX - rect.left) / rect.width;
    const state = this.playerService.state$.value;
    if (state) {
      const time = percent * state.duration;
      this.playerService.seek(time);
    }
  }

  updateVolume(event: Event): void {
    const value = parseFloat((event.target as HTMLInputElement).value);
    this.playerService.setVolume(value);
  }
}
```

## Advanced Player with Full Controls

```typescript
// advanced-player.component.ts
import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { XiaoMei, VideoTrackInfo, AudioTrackInfo, formatTime } from 'xiaomei';

@Component({
  selector: 'app-advanced-player',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="advanced-player" (mousemove)="showControls()">
      <canvas #videoCanvas class="video-canvas"></canvas>

      <!-- Loading spinner -->
      <div class="loading" *ngIf="loading">
        <div class="spinner"></div>
      </div>

      <!-- Controls overlay -->
      <div class="controls-overlay" [class.hidden]="!controlsVisible && playing">
        <!-- Center play button -->
        <button
          class="play-center"
          *ngIf="!playing && loaded"
          (click)="play()"
        >
          ▶️
        </button>

        <!-- Bottom controls -->
        <div class="controls-bar">
          <!-- Progress bar -->
          <div class="progress-container" (click)="seek($event)">
            <div class="buffered"
              *ngFor="let range of bufferedRanges"
              [style.left.%]="(range.start / duration) * 100"
              [style.width.%]="((range.end - range.start) / duration) * 100"
            ></div>
            <div class="progress" [style.width.%]="progressPercent"></div>
            <div class="scrubber" [style.left.%]="progressPercent"></div>
          </div>

          <!-- Control buttons -->
          <div class="controls-row">
            <div class="controls-left">
              <button (click)="togglePlay()">{{ playing ? '⏸' : '▶️' }}</button>
              <button (click)="stop()">⏹</button>
              <button (click)="skipBackward()">⏮ -10s</button>
              <button (click)="skipForward()">⏭ +10s</button>

              <span class="time">
                {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
              </span>
            </div>

            <div class="controls-right">
              <button (click)="toggleMute()">
                {{ muted ? 'Mute' : 'Unmute' }}
              </button>
              <input
                type="range"
                class="volume-slider"
                min="0"
                max="1"
                step="0.01"
                [(ngModel)]="volume"
                (input)="updateVolume()"
              />

              <!-- Playback speed -->
              <select [(ngModel)]="playbackRate" (change)="updatePlaybackRate()">
                <option [value]="0.25">0.25x</option>
                <option [value]="0.5">0.5x</option>
                <option [value]="0.75">0.75x</option>
                <option [value]="1">1x</option>
                <option [value]="1.25">1.25x</option>
                <option [value]="1.5">1.5x</option>
                <option [value]="2">2x</option>
              </select>

              <!-- Quality selector -->
              <select *ngIf="videoTracks.length > 1" (change)="selectVideoTrack($event)">
                <option *ngFor="let track of videoTracks" [value]="track.id">
                  {{ track.width }}x{{ track.height }}
                </option>
              </select>

              <button (click)="toggleFullscreen()">Fullscreen</button>
              <button (click)="screenshot()">Screenshot</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .advanced-player {
      position: relative;
      background: #000;
      width: 100%;
      user-select: none;
    }

    .video-canvas {
      width: 100%;
      height: auto;
      display: block;
    }

    .loading {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }

    .spinner {
      width: 50px;
      height: 50px;
      border: 3px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: white;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .controls-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(
        to bottom,
        rgba(0,0,0,0.7) 0%,
        transparent 20%,
        transparent 80%,
        rgba(0,0,0,0.7) 100%
      );
      transition: opacity 0.3s;
    }

    .controls-overlay.hidden {
      opacity: 0;
      pointer-events: none;
    }

    .play-center {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: rgba(0,0,0,0.7);
      border: 2px solid white;
      color: white;
      font-size: 32px;
      cursor: pointer;
    }

    .controls-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 10px;
      pointer-events: all;
    }

    .progress-container {
      height: 5px;
      background: rgba(255,255,255,0.3);
      margin-bottom: 10px;
      cursor: pointer;
      position: relative;
    }

    .buffered {
      position: absolute;
      height: 100%;
      background: rgba(255,255,255,0.5);
    }

    .progress {
      height: 100%;
      background: #0066cc;
    }

    .scrubber {
      position: absolute;
      top: -5px;
      width: 15px;
      height: 15px;
      background: white;
      border-radius: 50%;
      transform: translateX(-50%);
    }

    .controls-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .controls-left, .controls-right {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    button {
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.3);
      color: white;
      padding: 5px 10px;
      border-radius: 4px;
      cursor: pointer;
    }

    button:hover {
      background: rgba(255,255,255,0.2);
    }

    .time {
      color: white;
      font-size: 14px;
    }

    .volume-slider {
      width: 100px;
    }

    select {
      background: rgba(0,0,0,0.5);
      color: white;
      border: 1px solid rgba(255,255,255,0.3);
      padding: 5px;
      border-radius: 4px;
    }
  `]
})
export class AdvancedPlayerComponent implements OnInit {
  @ViewChild('videoCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @Input() src!: string | File | Blob;

  player!: XiaoMei;
  loading = false;
  loaded = false;
  playing = false;
  currentTime = 0;
  duration = 0;
  volume = 1;
  muted = false;
  playbackRate = 1;
  progressPercent = 0;
  bufferedRanges: Array<{start: number, end: number}> = [];
  videoTracks: VideoTrackInfo[] = [];
  audioTracks: AudioTrackInfo[] = [];
  controlsVisible = true;
  private controlsTimeout?: number;

  formatTime = formatTime;

  async ngOnInit(): Promise<void> {
    // Initialize player
    this.player = new XiaoMei({
      renderTarget: this.canvasRef.nativeElement
    });

    // Subscribe to state changes
    this.player.subscribe(state => {
      this.playing = state.playing;
      this.currentTime = state.currentTime;
      this.duration = state.duration;
      this.volume = state.volume;
      this.muted = state.muted;
      this.bufferedRanges = state.buffered;

      if (this.duration > 0) {
        this.progressPercent = (this.currentTime / this.duration) * 100;
      }
    });

    // Load media
    await this.loadMedia();

    // Keyboard shortcuts
    this.setupKeyboardControls();
  }

  async loadMedia(): Promise<void> {
    this.loading = true;
    try {
      await this.player.load(this.src);
      this.loaded = true;

      // Get available tracks
      this.videoTracks = this.player.getVideoTracks();
      this.audioTracks = this.player.getAudioTracks();
    } catch (error) {
      console.error('Failed to load media:', error);
    } finally {
      this.loading = false;
    }
  }

  async play(): Promise<void> {
    await this.player.play();
  }

  pause(): void {
    this.player.pause();
  }

  stop(): void {
    this.player.stop();
  }

  async togglePlay(): Promise<void> {
    if (this.playing) {
      this.pause();
    } else {
      await this.play();
    }
  }

  seek(event: MouseEvent): void {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const percent = (event.clientX - rect.left) / rect.width;
    this.player.currentTime = percent * this.duration;
  }

  skipBackward(): void {
    this.player.currentTime = Math.max(0, this.currentTime - 10);
  }

  skipForward(): void {
    this.player.currentTime = Math.min(this.duration, this.currentTime + 10);
  }

  toggleMute(): void {
    this.player.muted = !this.muted;
  }

  updateVolume(): void {
    this.player.volume = this.volume;
  }

  updatePlaybackRate(): void {
    this.player.playbackRate = this.playbackRate;
  }

  async selectVideoTrack(event: Event): Promise<void> {
    const trackId = (event.target as HTMLSelectElement).value;
    await this.player.selectVideoTrack(trackId);
  }

  async screenshot(): Promise<void> {
    const blob = await this.player.screenshot({ format: 'png' });
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'screenshot.png';
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  toggleFullscreen(): void {
    const element = this.canvasRef.nativeElement;
    if (!document.fullscreenElement) {
      element.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  showControls(): void {
    this.controlsVisible = true;
    clearTimeout(this.controlsTimeout);
    this.controlsTimeout = window.setTimeout(() => {
      if (this.playing) {
        this.controlsVisible = false;
      }
    }, 3000);
  }

  private setupKeyboardControls(): void {
    document.addEventListener('keydown', (e) => {
      switch(e.key) {
        case ' ':
          e.preventDefault();
          this.togglePlay();
          break;
        case 'ArrowLeft':
          this.skipBackward();
          break;
        case 'ArrowRight':
          this.skipForward();
          break;
        case 'ArrowUp':
          this.player.volume = Math.min(1, this.volume + 0.1);
          break;
        case 'ArrowDown':
          this.player.volume = Math.max(0, this.volume - 0.1);
          break;
        case 'm':
          this.toggleMute();
          break;
        case 'f':
          this.toggleFullscreen();
          break;
      }
    });
  }

  ngOnDestroy(): void {
    clearTimeout(this.controlsTimeout);
    this.player.dispose();
  }
}
```

## Using with Angular Forms

```typescript
// player-form.component.ts
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-player-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <form [formGroup]="playerForm">
      <div class="form-group">
        <label>Volume</label>
        <input
          type="range"
          formControlName="volume"
          min="0"
          max="1"
          step="0.01"
        />
        <span>{{ playerForm.get('volume')?.value | percent }}</span>
      </div>

      <div class="form-group">
        <label>
          <input type="checkbox" formControlName="muted" />
          Muted
        </label>
      </div>

      <div class="form-group">
        <label>Playback Speed</label>
        <select formControlName="playbackRate">
          <option [value]="0.5">0.5x</option>
          <option [value]="1">1x</option>
          <option [value]="1.5">1.5x</option>
          <option [value]="2">2x</option>
        </select>
      </div>
    </form>
  `
})
export class PlayerFormComponent {
  playerForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private playerService: XiaoMeiService
  ) {
    this.playerForm = this.fb.group({
      volume: [1],
      muted: [false],
      playbackRate: [1]
    });

    // React to form changes
    this.playerForm.valueChanges.subscribe(values => {
      this.playerService.setVolume(values.volume);
      this.playerService.setMuted(values.muted);
      // Set playback rate...
    });

    // Update form from player state
    this.playerService.state$.subscribe(state => {
      if (state) {
        this.playerForm.patchValue({
          volume: state.volume,
          muted: state.muted
        }, { emitEvent: false });
      }
    });
  }
}
```

## Directive for Easy Integration

```typescript
// xiaomei.directive.ts
import { Directive, ElementRef, Input, OnInit, OnDestroy } from '@angular/core';
import { XiaoMei } from 'xiaomei';

@Directive({
  selector: '[xiaoMeiPlayer]',
  standalone: true
})
export class XiaoMeiDirective implements OnInit, OnDestroy {
  @Input() xiaoMeiPlayer?: string | File | Blob;
  @Input() xiaoMeiOptions: any = {};

  private player?: XiaoMei;

  constructor(private el: ElementRef<HTMLCanvasElement>) {}

  ngOnInit(): void {
    if (this.el.nativeElement.tagName !== 'CANVAS') {
      console.error('xiaoMeiPlayer directive must be used on a canvas element');
      return;
    }

    this.player = new XiaoMei({
      renderTarget: this.el.nativeElement,
      ...this.xiaoMeiOptions
    });

    if (this.xiaoMeiPlayer) {
      this.player.load(this.xiaoMeiPlayer);
    }
  }

  ngOnDestroy(): void {
    this.player?.dispose();
  }
}

// Usage:
// <canvas [xiaoMeiPlayer]="videoUrl" [xiaoMeiOptions]="{autoplay: true}"></canvas>
```

## Testing

```typescript
// video-player.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VideoPlayerComponent } from './video-player.component';
import { XiaoMeiService } from './xiaomei.service';

describe('VideoPlayerComponent', () => {
  let component: VideoPlayerComponent;
  let fixture: ComponentFixture<VideoPlayerComponent>;
  let mockService: jasmine.SpyObj<XiaoMeiService>;

  beforeEach(async () => {
    mockService = jasmine.createSpyObj('XiaoMeiService', [
      'initialize',
      'load',
      'play',
      'pause'
    ]);

    await TestBed.configureTestingModule({
      imports: [VideoPlayerComponent],
      providers: [
        { provide: XiaoMeiService, useValue: mockService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(VideoPlayerComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize player on init', () => {
    fixture.detectChanges();
    expect(mockService.initialize).toHaveBeenCalled();
  });

  it('should load source when provided', async () => {
    component.src = 'test.mp4';
    fixture.detectChanges();
    expect(mockService.load).toHaveBeenCalledWith('test.mp4');
  });
});
```

## Best Practices

### 1. Use OnPush Change Detection

```typescript
@Component({
  selector: 'app-video-player',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // ...
})
```

### 2. Unsubscribe Properly

```typescript
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

export class PlayerComponent implements OnDestroy {
  private destroy$ = new Subject<void>();

  ngOnInit() {
    this.playerService.state$
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        // Handle state
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

### 3. Handle Zone.js

```typescript
import { NgZone } from '@angular/core';

constructor(private zone: NgZone) {}

// Run outside Angular zone for performance
this.zone.runOutsideAngular(() => {
  this.player.on('timeupdate', ({ currentTime }) => {
    // Update progress without triggering change detection
    this.progressBar.style.width = `${(currentTime / duration) * 100}%`;
  });
});
```

## Next Steps

- [Svelte Integration](/guide/svelte) - Using XiaoMei with Svelte
- [State Management](/guide/state-management) - Advanced state handling
- [API Reference](/api/player) - Complete API documentation