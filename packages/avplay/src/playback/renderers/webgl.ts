import type { IRenderer } from './types';

export interface WebGLRendererOptions {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  alpha?: boolean;
  antialias?: boolean;
  preserveDrawingBuffer?: boolean;
  powerPreference?: 'high-performance' | 'low-power' | 'default';
}

interface WebGLResources {
  gl: WebGLRenderingContext | null;
  program: WebGLProgram | null;
  texture: WebGLTexture | null;
  vertexBuffer: WebGLBuffer | null;
  texCoordBuffer: WebGLBuffer | null;
  positionLocation: number;
  texCoordLocation: number;
  textureLocation: WebGLUniformLocation | null;
}

export class WebGLRenderer implements IRenderer {
  private resources: WebGLResources;
  private isInitialized = false;
  private canvas: HTMLCanvasElement | OffscreenCanvas;
  private textureWidth = 0;
  private textureHeight = 0;
  private options: WebGLRendererOptions;

  private readonly vertexShaderSource = `
    attribute vec2 a_position;
    attribute vec2 a_texCoord;
    varying vec2 v_texCoord;

    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
      v_texCoord = a_texCoord;
    }
  `;

  private readonly fragmentShaderSource = `
    precision mediump float;
    uniform sampler2D u_texture;
    varying vec2 v_texCoord;

    void main() {
      vec4 color = texture2D(u_texture, v_texCoord);
      gl_FragColor = color;
    }
  `;

  constructor(options: WebGLRendererOptions) {
    this.canvas = options.canvas;
    this.options = options;
    this.resources = {
      gl: null,
      program: null,
      texture: null,
      vertexBuffer: null,
      texCoordBuffer: null,
      positionLocation: -1,
      texCoordLocation: -1,
      textureLocation: null,
    };

    this.initialize();
  }

  private initialize(): boolean {
    try {
      const contextOptions: WebGLContextAttributes = {
        alpha: this.options.alpha ?? false,
        antialias: this.options.antialias ?? false,
        depth: false,
        stencil: false,
        preserveDrawingBuffer: this.options.preserveDrawingBuffer ?? false,
        powerPreference: this.options.powerPreference ?? 'high-performance',
      };

      let gl = this.canvas.getContext('webgl', contextOptions) as WebGLRenderingContext | null;

      // Try experimental-webgl for HTMLCanvasElement only
      if (!gl && 'getContext' in this.canvas) {
        const canvas = this.canvas as HTMLCanvasElement;
        gl = canvas.getContext('experimental-webgl', contextOptions) as WebGLRenderingContext | null;
      }

      if (!gl) return false;
      this.resources.gl = gl;

      const vertexShader = this.createShader(gl, gl.VERTEX_SHADER, this.vertexShaderSource);
      const fragmentShader = this.createShader(gl, gl.FRAGMENT_SHADER, this.fragmentShaderSource);

      if (!vertexShader || !fragmentShader) {
        throw new Error('Failed to create shaders');
      }

      const program = gl.createProgram();
      if (!program) throw new Error('Failed to create program');

      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const error = gl.getProgramInfoLog(program);
        throw new Error(`Failed to link program: ${error}`);
      }

      this.resources.program = program;

      this.resources.positionLocation = gl.getAttribLocation(program, 'a_position');
      this.resources.texCoordLocation = gl.getAttribLocation(program, 'a_texCoord');
      this.resources.textureLocation = gl.getUniformLocation(program, 'u_texture');

      this.setupQuadBuffers(gl);

      const texture = gl.createTexture();
      if (!texture) throw new Error('Failed to create texture');

      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

      this.resources.texture = texture;

      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.CULL_FACE);
      gl.disable(gl.BLEND);

      if ('addEventListener' in this.canvas) {
        this.canvas.addEventListener('webglcontextlost', this.handleContextLost.bind(this), false);
        this.canvas.addEventListener('webglcontextrestored', this.handleContextRestored.bind(this), false);
      }

      this.isInitialized = true;
      return true;
    } catch {
      this.cleanup();
      return false;
    }
  }

  private createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
    const shader = gl.createShader(type);
    if (!shader) return null;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  private setupQuadBuffers(gl: WebGLRenderingContext): void {
    const positions = new Float32Array([-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0]);

    const texCoords = new Float32Array([0.0, 1.0, 1.0, 1.0, 0.0, 0.0, 1.0, 0.0]);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    this.resources.vertexBuffer = positionBuffer;

    const texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
    this.resources.texCoordBuffer = texCoordBuffer;
  }

  public isReady(): boolean {
    return this.isInitialized && this.resources.gl !== null;
  }

  public render(source: HTMLCanvasElement, target: HTMLCanvasElement | OffscreenCanvas): boolean {
    if (!this.isInitialized || !this.resources.gl) return false;

    const gl = this.resources.gl;

    try {
      const sourceWidth = source.width;
      const sourceHeight = source.height;

      if (sourceWidth === 0 || sourceHeight === 0) {
        return false;
      }

      const canvasWidth = target.width;
      const canvasHeight = target.height;

      if (this.canvas.width !== canvasWidth || this.canvas.height !== canvasHeight) {
        this.canvas.width = canvasWidth;
        this.canvas.height = canvasHeight;
        gl.viewport(0, 0, canvasWidth, canvasHeight);
      }

      // Upload texture
      gl.bindTexture(gl.TEXTURE_2D, this.resources.texture);

      if (sourceWidth !== this.textureWidth || sourceHeight !== this.textureHeight) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
        this.textureWidth = sourceWidth;
        this.textureHeight = sourceHeight;
      } else {
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, source);
      }

      // Clear
      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      // Calculate letterbox dimensions
      const scale = Math.min(canvasWidth / this.textureWidth, canvasHeight / this.textureHeight);
      const drawW = Math.floor(this.textureWidth * scale);
      const drawH = Math.floor(this.textureHeight * scale);
      const x = Math.floor((canvasWidth - drawW) / 2);
      const y = Math.floor((canvasHeight - drawH) / 2);

      const left = (x / canvasWidth) * 2 - 1;
      const right = ((x + drawW) / canvasWidth) * 2 - 1;
      const top = 1 - (y / canvasHeight) * 2;
      const bottom = 1 - ((y + drawH) / canvasHeight) * 2;

      const positions = new Float32Array([left, bottom, right, bottom, left, top, right, top]);

      gl.bindBuffer(gl.ARRAY_BUFFER, this.resources.vertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);

      // Render
      gl.useProgram(this.resources.program);

      gl.bindBuffer(gl.ARRAY_BUFFER, this.resources.vertexBuffer);
      gl.enableVertexAttribArray(this.resources.positionLocation);
      gl.vertexAttribPointer(this.resources.positionLocation, 2, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, this.resources.texCoordBuffer);
      gl.enableVertexAttribArray(this.resources.texCoordLocation);
      gl.vertexAttribPointer(this.resources.texCoordLocation, 2, gl.FLOAT, false, 0, 0);

      gl.uniform1i(this.resources.textureLocation, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      return true;
    } catch {
      return false;
    }
  }

  public clear(): void {
    if (!this.resources.gl) return;

    const gl = this.resources.gl;
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  private handleContextLost(event: Event): void {
    event.preventDefault();
    this.isInitialized = false;
  }

  private handleContextRestored(): void {
    this.initialize();
  }

  private cleanup(): void {
    const gl = this.resources.gl;
    if (!gl) return;

    if (this.resources.texture) gl.deleteTexture(this.resources.texture);
    if (this.resources.vertexBuffer) gl.deleteBuffer(this.resources.vertexBuffer);
    if (this.resources.texCoordBuffer) gl.deleteBuffer(this.resources.texCoordBuffer);
    if (this.resources.program) gl.deleteProgram(this.resources.program);

    this.resources = {
      gl: null,
      program: null,
      texture: null,
      vertexBuffer: null,
      texCoordBuffer: null,
      positionLocation: -1,
      texCoordLocation: -1,
      textureLocation: null,
    };

    this.isInitialized = false;
  }

  public dispose(): void {
    if (this.resources.gl) {
      const loseExt = this.resources.gl.getExtension('WEBGL_lose_context') as { loseContext: () => void } | null;

      if (loseExt) {
        try {
          loseExt.loseContext();
        } catch {}
      }
    }

    this.cleanup();

    if ('removeEventListener' in this.canvas) {
      this.canvas.removeEventListener('webglcontextlost', this.handleContextLost.bind(this));
      this.canvas.removeEventListener('webglcontextrestored', this.handleContextRestored.bind(this));
    }
  }
}
