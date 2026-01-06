import type { IRenderer, Rotation } from './types';

export interface WebGPURendererOptions {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  powerPreference?: 'high-performance' | 'low-power';
  rotation?: Rotation;
}

export class WebGPURenderer implements IRenderer {
  private canvas: HTMLCanvasElement | OffscreenCanvas;
  private device: GPUDevice | null = null;
  private context: GPUCanvasContext | null = null;
  private pipeline: GPURenderPipeline | null = null;
  private texture: GPUTexture | null = null;
  private sampler: GPUSampler | null = null;
  private bindGroup: GPUBindGroup | null = null;
  private vertexBuffer: GPUBuffer | null = null;
  private isInitialized = false;
  private textureWidth = 0;
  private textureHeight = 0;
  private powerPreference: 'high-performance' | 'low-power';
  private rotation: Rotation = 0;
  // Pre-allocated typed array for quad vertices (4 vertices * 4 floats each: x, y, u, v)
  private quadArray = new Float32Array(16);

  private readonly vertexShaderSource = `
    struct VSOut {
      @builtin(position) pos : vec4f,
      @location(0) uv : vec2f,
    };

    @vertex
    fn vs_main(@location(0) in_pos: vec2f, @location(1) in_uv: vec2f) -> VSOut {
      var out: VSOut;
      out.pos = vec4f(in_pos, 0.0, 1.0);
      out.uv = in_uv;
      return out;
    }
  `;

  private readonly fragmentShaderSource = `
    @group(0) @binding(0) var texture_sampler: sampler;
    @group(0) @binding(1) var texture_view: texture_2d<f32>;

    @fragment
    fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
      return textureSample(texture_view, texture_sampler, uv);
    }
  `;

  constructor(options: WebGPURendererOptions) {
    this.canvas = options.canvas;
    this.powerPreference = options.powerPreference || 'high-performance';
    this.rotation = options.rotation ?? 0;
    this.initialize().catch((err) => {
      console.error('WebGPU initialization failed:', err);
    });
  }

  private async initialize(): Promise<boolean> {
    try {
      const nav = navigator as Navigator & { gpu?: GPU };
      if (!nav.gpu) {
        console.log('WebGPU not available in navigator');
        return false;
      }

      const adapter = await nav.gpu.requestAdapter({
        powerPreference: this.powerPreference,
      });

      if (!adapter) {
        console.log('WebGPU adapter not available');
        return false;
      }

      this.device = await adapter.requestDevice();
      if (!this.device) {
        console.log('WebGPU device not available');
        return false;
      }

      if ('getContext' in this.canvas) {
        this.context = this.canvas.getContext('webgpu') as GPUCanvasContext | null;
      }

      if (!this.context) {
        console.log('WebGPU context not available on canvas');
        return false;
      }

      const canvasFormat = nav.gpu.getPreferredCanvasFormat();
      this.context.configure({
        device: this.device,
        format: canvasFormat,
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
        alphaMode: 'opaque',
      });

      await this.createRenderPipeline();
      this.createVertexBuffer();

      this.isInitialized = true;
      console.log('WebGPU renderer initialized successfully');
      return true;
    } catch (error) {
      console.error('WebGPU initialization error:', error);
      return false;
    }
  }

  private async createRenderPipeline(): Promise<void> {
    if (!this.device) return;

    const nav = navigator as Navigator & { gpu?: GPU };
    if (!nav.gpu) return;

    const vertexShaderModule = this.device.createShaderModule({
      code: this.vertexShaderSource,
    });

    const fragmentShaderModule = this.device.createShaderModule({
      code: this.fragmentShaderSource,
    });

    this.pipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: vertexShaderModule,
        entryPoint: 'vs_main',
        buffers: [
          {
            arrayStride: 16,
            attributes: [
              { shaderLocation: 0, offset: 0, format: 'float32x2' },
              { shaderLocation: 1, offset: 8, format: 'float32x2' },
            ],
          },
        ],
      },
      fragment: {
        module: fragmentShaderModule,
        entryPoint: 'fs_main',
        targets: [{ format: nav.gpu.getPreferredCanvasFormat() }],
      },
      primitive: { topology: 'triangle-strip' },
    });
  }

  private createVertexBuffer(): void {
    if (!this.device) return;

    this.vertexBuffer = this.device.createBuffer({
      size: 4 * 4 * 4,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
  }

  private createTexture(width: number, height: number): void {
    if (!this.device) return;

    if (this.texture) this.texture.destroy();

    this.texture = this.device.createTexture({
      size: { width, height },
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });

    if (!this.sampler) {
      this.sampler = this.device.createSampler({
        magFilter: 'linear',
        minFilter: 'linear',
        addressModeU: 'clamp-to-edge',
        addressModeV: 'clamp-to-edge',
      });
    }

    this.createBindGroup();
  }

  private createBindGroup(): void {
    if (!this.device || !this.texture || !this.sampler || !this.pipeline) return;

    this.bindGroup = this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: this.sampler },
        { binding: 1, resource: this.texture.createView() },
      ],
    });
  }

  public isReady(): boolean {
    return this.isInitialized && this.device !== null && this.context !== null && this.pipeline !== null;
  }

  public render(source: HTMLCanvasElement | OffscreenCanvas): boolean {
    if (!this.isReady() || !this.device || !this.context || !this.pipeline) return false;

    try {
      const sourceWidth = source.width;
      const sourceHeight = source.height;

      if (sourceWidth === 0 || sourceHeight === 0) {
        console.warn(`WebGPU: Source canvas has zero dimensions (${sourceWidth}x${sourceHeight})`);
        return false;
      }

      const canvasWidth = this.canvas.width;
      const canvasHeight = this.canvas.height;

      if (canvasWidth === 0 || canvasHeight === 0) {
        console.warn(`WebGPU: Output canvas has zero dimensions (${canvasWidth}x${canvasHeight})`);
        return false;
      }

      if (sourceWidth !== this.textureWidth || sourceHeight !== this.textureHeight) {
        this.createTexture(sourceWidth, sourceHeight);
        this.textureWidth = sourceWidth;
        this.textureHeight = sourceHeight;
      }

      if (!this.texture) return false;

      // Use copyExternalImageToTexture for better performance
      try {
        this.device.queue.copyExternalImageToTexture(
          { source },
          { texture: this.texture },
          { width: sourceWidth, height: sourceHeight }
        );
      } catch {
        // Fallback to getImageData if copyExternalImageToTexture fails
        const sourceCtx = source.getContext('2d');
        if (!sourceCtx) return false;

        const imageData = sourceCtx.getImageData(0, 0, sourceWidth, sourceHeight);
        const data = new Uint8Array(imageData.data.buffer);

        this.device.queue.writeTexture(
          { texture: this.texture, origin: { x: 0, y: 0, z: 0 } },
          data,
          { bytesPerRow: sourceWidth * 4, rowsPerImage: sourceHeight },
          { width: sourceWidth, height: sourceHeight, depthOrArrayLayers: 1 }
        );
      }

      const commandEncoder = this.device.createCommandEncoder();
      const textureView = this.context.getCurrentTexture().createView();

      const renderPass = commandEncoder.beginRenderPass({
        colorAttachments: [
          {
            view: textureView,
            clearValue: { r: 0, g: 0, b: 0, a: 1 },
            loadOp: 'clear',
            storeOp: 'store',
          },
        ],
      });

      renderPass.setPipeline(this.pipeline);
      if (this.bindGroup) renderPass.setBindGroup(0, this.bindGroup);

      // For 90/270 rotation, swap source dimensions for aspect ratio calculation
      const isRotated90or270 = this.rotation === 90 || this.rotation === 270;
      const effectiveWidth = isRotated90or270 ? this.textureHeight : this.textureWidth;
      const effectiveHeight = isRotated90or270 ? this.textureWidth : this.textureHeight;

      // Calculate letterbox dimensions to preserve aspect ratio
      const scale = Math.min(canvasWidth / effectiveWidth, canvasHeight / effectiveHeight);
      const drawW = Math.round(effectiveWidth * scale);
      const drawH = Math.round(effectiveHeight * scale);
      const x = Math.round((canvasWidth - drawW) / 2);
      const y = Math.round((canvasHeight - drawH) / 2);

      // Calculate clip-space coordinates
      const left = (x / canvasWidth) * 2 - 1;
      const right = ((x + drawW) / canvasWidth) * 2 - 1;
      const top = 1 - (y / canvasHeight) * 2;
      const bottom = 1 - ((y + drawH) / canvasHeight) * 2;

      // Calculate center of quad
      const cx = (left + right) / 2;
      const cy = (top + bottom) / 2;
      const hw = (right - left) / 2;
      const hh = (top - bottom) / 2;

      // Apply rotation by rotating vertex positions
      const rad = (this.rotation * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);

      // For rotated quads, we need to swap half-width/half-height
      const rhw = isRotated90or270 ? hh : hw;
      const rhh = isRotated90or270 ? hw : hh;

      // Calculate rotated corner positions with texture coordinates using pre-allocated array
      // Corner order: bottom-left, bottom-right, top-left, top-right
      // Each vertex: x, y, u, v
      const quad = this.quadArray;

      // bottom-left (-rhw, -rhh, 0.0, 1.0)
      quad[0] = -rhw * cos - -rhh * sin + cx;
      quad[1] = -rhw * sin + -rhh * cos + cy;
      quad[2] = 0.0;
      quad[3] = 1.0;

      // bottom-right (rhw, -rhh, 1.0, 1.0)
      quad[4] = rhw * cos - -rhh * sin + cx;
      quad[5] = rhw * sin + -rhh * cos + cy;
      quad[6] = 1.0;
      quad[7] = 1.0;

      // top-left (-rhw, rhh, 0.0, 0.0)
      quad[8] = -rhw * cos - rhh * sin + cx;
      quad[9] = -rhw * sin + rhh * cos + cy;
      quad[10] = 0.0;
      quad[11] = 0.0;

      // top-right (rhw, rhh, 1.0, 0.0)
      quad[12] = rhw * cos - rhh * sin + cx;
      quad[13] = rhw * sin + rhh * cos + cy;
      quad[14] = 1.0;
      quad[15] = 0.0;

      if (this.vertexBuffer) {
        this.device.queue.writeBuffer(this.vertexBuffer, 0, quad);
        renderPass.setVertexBuffer(0, this.vertexBuffer);
      }

      renderPass.draw(4, 1, 0, 0);
      renderPass.end();

      this.device.queue.submit([commandEncoder.finish()]);

      return true;
    } catch {
      return false;
    }
  }

  public clear(): void {
    if (!this.isReady() || !this.device || !this.context) return;

    try {
      const commandEncoder = this.device.createCommandEncoder();
      const textureView = this.context.getCurrentTexture().createView();

      const renderPass = commandEncoder.beginRenderPass({
        colorAttachments: [
          {
            view: textureView,
            clearValue: { r: 0, g: 0, b: 0, a: 1 },
            loadOp: 'clear',
            storeOp: 'store',
          },
        ],
      });

      renderPass.end();
      this.device.queue.submit([commandEncoder.finish()]);
    } catch {}
  }

  public setRotation(rotation: Rotation): void {
    this.rotation = rotation;
  }

  public getRotation(): Rotation {
    return this.rotation;
  }

  public dispose(): void {
    try {
      if (this.texture) {
        this.texture.destroy();
        this.texture = null;
      }

      if (this.vertexBuffer) {
        this.vertexBuffer.destroy();
        this.vertexBuffer = null;
      }

      this.device = null;
      this.context = null;
      this.pipeline = null;
      this.sampler = null;
      this.bindGroup = null;
      this.isInitialized = false;
    } catch {}
  }
}
