import './camera.css';
import CameraStream from '~/CameraStream';

/**
 * Camera lifecycle state.
 * - `'open'`    — Camera is active and streaming.
 * - `'loading'` — Camera is being initialized.
 * - `'close'`   — Camera is inactive.
 */
type CameraState = 'open' | 'loading' | 'close';

/**
 * Camera facing direction.
 * - `'front'` — Front-facing (selfie) camera.
 * - `'back'`  — Rear-facing camera.
 */
type FacingMode = 'front' | 'back';

/**
 * Options for opening a camera.
 */
export interface CameraOpenOptions {
  /**
   * Camera facing direction.
   * @default 'front'
   */
  facingMode?: FacingMode;

  /**
   * Desired camera resolution width in pixels.
   */
  width?: number;

  /**
   * Desired camera resolution height in pixels.
   */
  height?: number;

  /**
   * Specific camera device ID. When specified, `facingMode` is ignored.
   */
  deviceId?: string;
}

/**
 * Options for configuring image capture behavior.
 *
 * @example
 * // Capture with resize
 * const dataUrl = camera.capture({ width: 640, height: 480, fit: 'cover' });
 *
 * @example
 * // Capture and crop a specific region
 * const dataUrl = camera.capture({
 *   extract: { x: 100, y: 50, width: 200, height: 200 },
 *   format: 'image/jpeg',
 * });
 */
export interface CaptureOptions {
  /**
   * Target width in pixels for resizing the captured image.
   * If omitted, the original width is preserved.
   * When only `width` is specified, `height` is calculated to maintain the aspect ratio.
   */
  width?: number;

  /**
   * Target height in pixels for resizing the captured image.
   * If omitted, the original height is preserved.
   * When only `height` is specified, `width` is calculated to maintain the aspect ratio.
   */
  height?: number;

  /**
   * Region to crop from the captured frame.
   * Coordinates are relative to the camera viewport (CSS pixels).
   */
  extract?: {
    /** Horizontal offset from the left edge (px). */
    x: number;
    /** Vertical offset from the top edge (px). */
    y: number;
    /** Width of the crop region (px). */
    width: number;
    /** Height of the crop region (px). */
    height: number;
  };

  /**
   * Resize fitting strategy, analogous to CSS `object-fit`.
   * - `'cover'`   — Scale to fill the target dimensions, cropping if necessary.
   * - `'contain'` — Scale to fit within the target dimensions, letter-boxing if necessary.
   * - `'fill'`    — Stretch to exactly match the target dimensions.
   * @default 'fill'
   */
  fit?: 'cover' | 'contain' | 'fill';

  /**
   * Output MIME type for the captured image.
   * @default 'image/png'
   */
  format?: string;
}

/**
 * A custom element that provides camera access, live preview, image capture,
 * and optional built-in controls using the Web Components V1 API.
 *
 * @example
 * // Register and create programmatically
 * Camera.define();
 * const camera = document.querySelector('js-camera') as Camera;
 * await camera.open({ facingMode: 'back', width: 1920, height: 1080 });
 * const dataUrl = camera.capture({ format: 'image/jpeg' });
 *
 * @example
 * // Declarative usage with auto-play
 * // <js-camera autoplay facing="back" width="1280" height="720" controls></js-camera>
 *
 * @fires opened  - Camera stream has been opened and is ready.
 * @fires played  - Camera playback has resumed from a paused state.
 * @fires paused  - Camera playback has been paused.
 * @fires captured - A frame has been captured. Event `detail.capture` contains the data URL.
 */
class Camera extends HTMLElement {
  /** Current camera lifecycle state. */
  #state: CameraState = 'close';

  /** Active camera facing direction. */
  #facingMode: FacingMode | undefined;

  /** Internal video element for displaying the camera feed. */
  #video: HTMLVideoElement;

  /** Stream lifecycle manager. */
  #stream: CameraStream;

  /** Device ID of the currently active camera. */
  #deviceId: string | undefined;

  /** Overlay element used for the capture flash effect. */
  #flash: HTMLDivElement;

  /** Whether the element has been initialized by connectedCallback. */
  #initialized = false;

  /** Current zoom level (1 = no zoom). */
  #zoomLevel = 1;

  /** Distance between two fingers at pinch start. */
  #pinchStartDistance: number | undefined;

  /** Zoom level at pinch start. */
  #pinchStartZoom = 1;

  /**
   * Current camera lifecycle state.
   *
   * @example
   * if (camera.state === 'open') {
   *   camera.capture();
   * }
   */
  get state(): CameraState {
    return this.#state;
  }

  /**
   * Active camera facing direction, or `undefined` if the camera has not been opened.
   *
   * @example
   * console.log(camera.facingMode); // 'front' or 'back'
   */
  get facingMode(): FacingMode | undefined {
    return this.#facingMode;
  }

  /**
   * Device ID of the currently active camera, or `undefined` if not opened.
   */
  get deviceId(): string | undefined {
    return this.#deviceId;
  }

  /**
   * The active `MediaStreamTrack` for the video feed,
   * or `undefined` if no stream is active.
   *
   * @example
   * if (camera.track) {
   *   console.log(camera.track.getSettings());
   * }
   */
  get track(): MediaStreamTrack | undefined {
    if (!this.#video.srcObject)
      return undefined;
    return (this.#video.srcObject as MediaStream).getVideoTracks()[0];
  }

  /**
   * Whether the camera stream is currently active.
   *
   * @example
   * if (camera.opened) {
   *   const dataUrl = camera.capture();
   * }
   */
  get opened(): boolean {
    return !!this.track;
  }

  /**
   * Whether the camera playback is currently paused.
   */
  get paused(): boolean {
    return this.#video.paused;
  }

  /**
   * The actual video resolution reported by the camera hardware.
   *
   * @example
   * const { width, height } = camera.resolution;
   * console.log(`Camera resolution: ${width}x${height}`);
   */
  get resolution(): { width: number; height: number } {
    return {
      width: this.#video.videoWidth,
      height: this.#video.videoHeight,
    };
  }

  /**
   * Current zoom level. `1` means no zoom.
   *
   * @example
   * console.log(camera.zoom); // 1
   */
  get zoom(): number {
    return this.#zoomLevel;
  }

  constructor() {
    super();
    this.#video = document.createElement('video');
    this.#stream = new CameraStream(this.#video);
    this.#flash = document.createElement('div');
  }

  /**
   * Called when the element is inserted into the DOM.
   * Initializes the camera UI and optional controls.
   */
  protected connectedCallback(): void {
    if (this.#initialized)
      return;
    this.#initialized = true;

    // Ensure the element has a positioned context for absolute children.
    if (getComputedStyle(this).position === 'static')
      this.style.position = 'relative';
    this.classList.add('jsc');

    // Set up the video element.
    this.#video.classList.add('jsc-video');
    this.#video.setAttribute('playsinline', 'true');
    this.#video.muted = true;
    this.appendChild(this.#video);

    // Initialize optional UI components.
    this.#initControls();

    // Enable pinch-to-zoom gesture.
    this.#initPinchZoom();

    // Set up the flash overlay.
    this.#flash.classList.add('jsc-flash');
    this.appendChild(this.#flash);

    // Auto-open if the `autoplay` attribute is present.
    if (this.hasAttribute('autoplay'))
      this.open({facingMode: this.getAttribute('facing') as FacingMode || 'back'});
  }

  /**
   * Registers the `<js-camera>` custom element.
   * Safe to call multiple times; subsequent calls are no-ops.
   *
   * @returns The Camera class for chaining.
   *
   * @example
   * Camera.define();
   * // <js-camera> is now available in HTML
   */
  static define(): typeof Camera {
    if (window.customElements.get('js-camera'))
      return this;
    window.customElements.define('js-camera', this);
    return this;
  }

  /**
   * Creates a new `<js-camera>` element instance.
   * Automatically calls {@link define} if not already registered.
   *
   * @returns A new Camera element ready to be appended to the DOM.
   *
   * @example
   * const camera = Camera.createElement();
   * document.body.appendChild(camera);
   * await camera.open({ facingMode: 'back' });
   */
  static createElement(): Camera {
    this.define();
    return new (window.customElements.get('js-camera')!)() as Camera;
  }

  /**
   * Opens the camera with the specified options.
   * If a camera is already open, it is closed and re-opened with the new options.
   *
   * @param options - Camera configuration including facing mode and resolution.
   * @returns The actual track settings reported by the camera device.
   * @throws {DOMException} If camera access is denied or the device is unavailable.
   *
   * @example
   * // Open the rear camera at Full HD resolution
   * const settings = await camera.open({
   *   facingMode: 'back',
   *   width: 1920,
   *   height: 1080,
   * });
   * console.log(settings.deviceId);
   *
   * @example
   * // Open a specific camera by device ID
   * const settings = await camera.open({
   *   deviceId: 'abc123',
   * });
   */
  async open(options: CameraOpenOptions = {}): Promise<MediaTrackSettings> {
    const opts = {facingMode: 'front' as FacingMode, ...options};

    this.#state = 'loading';

    try {
      // Attempt to recover from a denied permission state.
      const permission = await this.queryPermission();
      if (permission === 'denied')
        await this.revokePermission();

      // Reset zoom and apply mirror transform for the new facing mode.
      this.#zoomLevel = 1;
      this.#facingMode = opts.facingMode;
      this.#applyVideoTransform();

      // Fall back to HTML attributes for resolution if not explicitly provided.
      const width = opts.width ?? (this.getAttribute('width') ? parseFloat(this.getAttribute('width')!) : undefined);
      const height = opts.height ?? (this.getAttribute('height') ? parseFloat(this.getAttribute('height')!) : undefined);

      // Build getUserMedia constraints.
      const constraints: MediaStreamConstraints = {
        video: {
          ...!opts.deviceId
            ? {facingMode: opts.facingMode === 'front' ? 'user' : 'environment'}
            : {deviceId: {exact: opts.deviceId}},
          ...width ? {width: {ideal: width}} : null,
          ...height ? {height: {ideal: height}} : null,
        },
        audio: false,
      };

      const settings = await this.#stream.open(constraints);

      this.#deviceId = settings.deviceId;
      this.#state = 'open';

      this.#dispatchEvent('opened');
      await this.#video.play();
      return settings;
    } catch (error) {
      // Reset state so the camera can be retried after a failure.
      this.#state = 'close';
      this.#facingMode = undefined;
      this.#deviceId = undefined;
      throw error;
    }
  }

  /**
   * Returns a promise that resolves when the camera finishes opening.
   * If the camera is not currently loading, resolves immediately.
   *
   * @example
   * await camera.waitOpen();
   * const dataUrl = camera.capture();
   */
  async waitOpen(): Promise<void> {
    return new Promise<void>(resolve => {
      if (this.#state !== 'loading')
        return void resolve();
      this.on('opened', resolve as () => void, {once: true});
    });
  }

  /**
   * Closes the camera and releases all associated resources.
   *
   * @example
   * camera.close();
   * console.log(camera.state); // 'close'
   */
  close(): void {
    this.#stream.close();
    this.#facingMode = undefined;
    this.#deviceId = undefined;
    this.#zoomLevel = 1;
    this.#state = 'close';
  }

  /**
   * Resumes camera playback from a paused state.
   *
   * @example
   * camera.play();
   */
  async play(): Promise<void> {
    await this.#video.play();
    this.#dispatchEvent('played');
  }

  /**
   * Pauses camera playback.
   * The current frame remains visible but the stream stops updating.
   *
   * @example
   * camera.pause();
   * console.log(camera.paused); // true
   */
  pause(): void {
    this.#video.pause();
    this.#dispatchEvent('paused');
  }

  /**
   * Resets the zoom level to 1 (no zoom).
   *
   * @example
   * camera.resetZoom();
   * console.log(camera.zoom); // 1
   */
  resetZoom(): void {
    this.#zoomLevel = 1;
    this.#applyVideoTransform();
  }

  /**
   * Captures the current video frame as a data URL.
   * Applies optional cropping, resizing, and format conversion.
   *
   * @param options - Capture configuration for cropping, resizing, and output format.
   * @returns A data URL string of the captured image.
   *
   * @example
   * // Simple capture as PNG
   * const dataUrl = camera.capture();
   *
   * @example
   * // Capture as JPEG, resized to 320x240 with cover fit
   * const dataUrl = camera.capture({
   *   width: 320,
   *   height: 240,
   *   fit: 'cover',
   *   format: 'image/jpeg',
   * });
   *
   * @example
   * // Crop a 200x200 region from position (100, 50)
   * const dataUrl = camera.capture({
   *   extract: { x: 100, y: 50, width: 200, height: 200 },
   * });
   */
  capture(options?: CaptureOptions): string {
    const opts: Required<Pick<CaptureOptions, 'fit' | 'format'>> & CaptureOptions = {
      fit: 'fill',
      format: 'image/png',
      ...options,
    };

    // Trigger the flash animation.
    this.#playFlashEffect();

    // Draw the camera viewport onto a canvas.
    const boundary = this.#getCameraViewportBoundary();
    let canvas = document.createElement('canvas');
    canvas.width = boundary.width;
    canvas.height = boundary.height;
    canvas.getContext('2d')!.drawImage(
      this.#video,
      boundary.x, boundary.y, boundary.width, boundary.height,
      0, 0, boundary.width, boundary.height,
    );

    // Mirror the canvas for front-facing cameras.
    if (this.#facingMode === 'front')
      this.#flipHorizontally(canvas);

    // Crop if an extract region is specified.
    if (opts.extract) {
      const scaleX = canvas.width / this.#video.clientWidth;
      const scaleY = canvas.height / this.#video.clientHeight;
      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = opts.extract.width * scaleX;
      cropCanvas.height = opts.extract.height * scaleY;
      cropCanvas.getContext('2d')!.drawImage(
        canvas,
        opts.extract.x * scaleX,
        opts.extract.y * scaleY,
        opts.extract.width * scaleX,
        opts.extract.height * scaleY,
        0, 0,
        opts.extract.width * scaleX,
        opts.extract.height * scaleY,
      );
      canvas = cropCanvas;
    }

    // Return without resizing if no target dimensions are specified.
    if (!opts.width && !opts.height)
      return canvas.toDataURL(opts.format, 1.0);

    // Resize to the target dimensions with the specified fit mode.
    return this.#resizeCanvas(canvas, opts);
  }

  /**
   * Queries the current camera permission state.
   *
   * @returns The permission state, or `undefined` if the Permissions API is unavailable.
   *
   * @example
   * const permission = await camera.queryPermission();
   * if (permission === 'granted') {
   *   await camera.open({ facingMode: 'back' });
   * }
   */
  async queryPermission(): Promise<PermissionState | undefined> {
    try {
      if (!navigator.permissions?.query)
        return undefined;
      const status = await navigator.permissions.query({name: 'camera' as PermissionName});
      return status.state;
    } catch {
      return undefined;
    }
  }

  /**
   * Revokes camera permissions using the Permissions API.
   * Not all browsers support this; a warning is logged if unsupported.
   */
  async revokePermission(): Promise<void> {
    if (!navigator.permissions || !('revoke' in navigator.permissions)) {
      console.warn('Permissions Revoke API is not supported.');
      return;
    }
    // @ts-ignore — `navigator.permissions.revoke` is not in the TypeScript standard lib.
    await navigator.permissions.revoke({name: 'camera'});
  }

  /**
   * Enumerates available camera devices on the system.
   * Requests temporary camera access if permission has not been granted.
   *
   * @returns An array of objects containing `deviceId` and `label` for each camera.
   *
   * @example
   * const devices = await camera.getDevices();
   * devices.forEach(d => console.log(`${d.label} (${d.deviceId})`));
   */
  async getDevices(): Promise<Pick<MediaDeviceInfo, 'deviceId' | 'label'>[]> {
    if (!navigator.mediaDevices?.enumerateDevices) {
      console.warn('MediaDevices.enumerateDevices is not supported by this browser.');
      return [];
    }

    // Temporary access is needed to enumerate devices with labels.
    const tempStream = await navigator.mediaDevices.getUserMedia({video: {facingMode: {ideal: 'user'}}, audio: false});
    tempStream.getTracks().forEach(track => track.stop());

    return (await navigator.mediaDevices.enumerateDevices())
      .filter(device => device.kind === 'videoinput')
      .map(({deviceId, label}) => ({deviceId, label}));
  }

  /**
   * Adds an event listener to this camera element.
   *
   * @param type     - Event type (e.g., `'opened'`, `'captured'`).
   * @param listener - Callback function.
   * @param options  - Listener options.
   * @returns This camera element for chaining.
   *
   * @example
   * camera
   *   .on('opened', () => console.log('Camera ready'))
   *   .on('captured', (e) => console.log('Captured:', e.detail.capture));
   */
  on(type: string, listener: (event?: Event) => void, options?: { once?: boolean }): Camera {
    this.addEventListener(type, listener, options);
    return this;
  }

  /**
   * Removes an event listener from this camera element.
   *
   * @param type     - Event type.
   * @param listener - The listener to remove.
   * @returns This camera element for chaining.
   */
  off(type: string, listener: (event?: Event) => void): Camera {
    this.removeEventListener(type, listener);
    return this;
  }

  // ---------------------------------------------------------------------------
  // Private methods
  // ---------------------------------------------------------------------------

  /**
   * Dispatches a custom event on this element.
   */
  #dispatchEvent(type: string, detail: Record<string, unknown> = {}): void {
    super.dispatchEvent(new CustomEvent(type, {detail}));
  }

  /**
   * Applies the combined CSS transform (mirror + zoom) to the video element.
   */
  #applyVideoTransform(): void {
    const mirror = this.#facingMode === 'front' ? 'scaleX(-1)' : '';
    this.#video.style.transform = `scale(${this.#zoomLevel}) ${mirror}`.trim();
  }

  /**
   * Initializes pinch-to-zoom gesture handling on the element.
   */
  #initPinchZoom(): void {
    this.addEventListener('touchstart', (e: TouchEvent) => {
      if (e.touches.length === 2) {
        this.#pinchStartDistance = this.#getTouchDistance(e.touches);
        this.#pinchStartZoom = this.#zoomLevel;
      }
    });

    this.addEventListener('touchmove', (e: TouchEvent) => {
      if (e.touches.length !== 2 || this.#pinchStartDistance === undefined)
        return;
      e.preventDefault();
      const distance = this.#getTouchDistance(e.touches);
      const scale = distance / this.#pinchStartDistance;
      this.#zoomLevel = Math.min(Math.max(this.#pinchStartZoom * scale, 1), 5);
      this.#applyVideoTransform();
    }, {passive: false});

    this.addEventListener('touchend', () => {
      this.#pinchStartDistance = undefined;
    });
  }

  /**
   * Calculates the distance between two touch points.
   */
  #getTouchDistance(touches: TouchList): number {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  }

  /**
   * Initializes built-in camera controls (play/pause overlay, capture button, face switch).
   * Only activated when the `controls` HTML attribute is present.
   */
  #initControls(): void {
    if (!this.hasAttribute('controls'))
      return;

    // Play/pause overlay.
    this.insertAdjacentHTML('afterbegin',
      `<div data-on-tap-player class="jsc-overlay">
        <button data-on-play-pause class="jsc-playback-btn" type="button" played="false"><i></i></button>
      </div>`);

    const playPauseButton = this.querySelector('[data-on-play-pause]')!;
    playPauseButton.addEventListener('click', () => {
      if (this.paused)
        this.play();
      else
        this.pause();
    });

    // Show/hide the overlay on tap.
    const overlay = this.querySelector('[data-on-tap-player]')!;
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    overlay.addEventListener('click', () => {
      if (hideTimer !== undefined)
        clearTimeout(hideTimer);
      playPauseButton.setAttribute('played', !this.paused ? 'true' : 'false');
      if (overlay.classList.contains('fadein'))
        return void overlay.classList.remove('fadein');
      overlay.classList.add('fadein');
      hideTimer = setTimeout(() => {
        hideTimer = undefined;
        overlay.classList.remove('fadein');
      }, 2000);
    });

    // Control bar with capture and face-switch buttons.
    this.insertAdjacentHTML('beforeend',
      `<div class="jsc-controls">
        <div class="jsc-controls-inner">
          <a class="jsc-thumbnail"><img></a>
          <button data-on-capture class="jsc-capture-btn" type="button"></button>
          <button data-on-change-facing class="jsc-facing-btn" type="button"></button>
        </div>
      </div>`);

    // Capture button handler.
    this.querySelector('[data-on-capture]')!.addEventListener('click', () => {
      const capture = this.capture();
      this.querySelector('.jsc-thumbnail img')!.setAttribute('src', capture);
      this.#dispatchEvent('captured', {capture});
    });

    // Face-switch button handler.
    this.querySelector('[data-on-change-facing]')!.addEventListener('click', async () => {
      await this.open({facingMode: this.#facingMode === 'front' ? 'back' : 'front'});
    });
  }

  /**
   * Calculates the visible area of the video within the element,
   * accounting for the CSS `object-fit` property.
   */
  #getCameraViewportBoundary(): { x: number; y: number; width: number; height: number } {
    const style = getComputedStyle(this.#video);
    const fitMode = style.getPropertyValue('object-fit');
    const videoRatio = this.#video.videoWidth / this.#video.videoHeight;
    const clientRatio = this.#video.clientWidth / this.#video.clientHeight;
    const position = style.getPropertyValue('object-position').split(' ');
    const positionX = parseInt(position[0], 10) / 100;
    const positionY = parseInt(position[1], 10) / 100;

    let width = 0;
    let height = 0;
    let x = 0;
    let y = 0;

    if (fitMode === 'none') {
      width = this.#video.clientWidth;
      height = this.#video.clientHeight;
      x = (this.#video.videoWidth - this.#video.clientWidth) * positionX;
      y = (this.#video.videoHeight - this.#video.clientHeight) * positionY;
    } else if (fitMode === 'contain' || fitMode === 'scale-down') {
      width = this.#video.videoWidth;
      height = this.#video.videoHeight;
    } else if (fitMode === 'cover') {
      if (videoRatio > clientRatio) {
        width = this.#video.videoHeight * clientRatio;
        height = this.#video.videoHeight;
        x = (this.#video.videoWidth - width) * positionX;
      } else {
        width = this.#video.videoWidth;
        height = this.#video.videoWidth / clientRatio;
        y = (this.#video.videoHeight - height) * positionY;
      }
    } else if (fitMode === 'fill') {
      width = this.#video.videoWidth;
      height = this.#video.videoHeight;
    } else {
      console.error(`Unexpected object-fit value: "${fitMode}"`);
    }

    // Apply zoom — crop into the center of the visible area.
    if (this.#zoomLevel > 1) {
      const zoomedWidth = width / this.#zoomLevel;
      const zoomedHeight = height / this.#zoomLevel;
      x += (width - zoomedWidth) / 2;
      y += (height - zoomedHeight) / 2;
      width = zoomedWidth;
      height = zoomedHeight;
    }

    return {x, y, width, height};
  }

  /**
   * Flips the canvas horizontally using a canvas transform.
   * Used to mirror captures from the front-facing camera.
   */
  #flipHorizontally(canvas: HTMLCanvasElement): void {
    const temp = document.createElement('canvas');
    temp.width = canvas.width;
    temp.height = canvas.height;
    temp.getContext('2d')!.drawImage(canvas, 0, 0);

    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(-1, 1);
    ctx.drawImage(temp, -canvas.width, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  /**
   * Resizes the source canvas to the target dimensions using the specified fit mode.
   */
  #resizeCanvas(source: HTMLCanvasElement, opts: CaptureOptions): string {
    let width = opts.width!;
    let height = opts.height!;
    if (!width)
      width = source.width * height / source.height;
    if (!height)
      height = source.height * width / source.width;

    const sourceRatio = source.height / source.width;
    const targetRatio = height / width;
    let destX = 0;
    let destY = 0;
    let destWidth = width;
    let destHeight = height;

    if (opts.fit === 'contain') {
      if (sourceRatio < targetRatio) {
        destHeight = width * sourceRatio;
        destY = (height - destHeight) / 2;
      } else if (sourceRatio > targetRatio) {
        destWidth = width * targetRatio / sourceRatio;
        destX = (width - destWidth) / 2;
      }
    } else if (opts.fit === 'cover') {
      if (sourceRatio > targetRatio) {
        destHeight = width * sourceRatio;
        destY = (height - destHeight) / 2;
      } else if (sourceRatio < targetRatio) {
        destWidth = width * targetRatio / sourceRatio;
        destX = (width - destWidth) / 2;
      }
    }

    const destCanvas = document.createElement('canvas');
    destCanvas.width = width;
    destCanvas.height = height;
    const ctx = destCanvas.getContext('2d')!;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(source, destX, destY, destWidth, destHeight);
    return destCanvas.toDataURL(opts.format, 1.0);
  }

  /**
   * Plays a brief white flash animation to simulate a camera shutter effect.
   */
  #playFlashEffect(): void {
    this.#flash.style.display = 'block';
    const animation = this.#flash.animate(
      [{opacity: 0}, {opacity: 0.5}, {opacity: 0}],
      {duration: 300, easing: 'ease-out'},
    );
    animation.onfinish = () => {
      this.#flash.style.display = 'none';
    };
  }
}

// Register the custom element on module load.
Camera.define();

export default Camera;
