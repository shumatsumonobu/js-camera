import './camera.css';
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
declare class Camera extends HTMLElement {
    #private;
    /**
     * Current camera lifecycle state.
     *
     * @example
     * if (camera.state === 'open') {
     *   camera.capture();
     * }
     */
    get state(): CameraState;
    /**
     * Active camera facing direction, or `undefined` if the camera has not been opened.
     *
     * @example
     * console.log(camera.facingMode); // 'front' or 'back'
     */
    get facingMode(): FacingMode | undefined;
    /**
     * Device ID of the currently active camera, or `undefined` if not opened.
     */
    get deviceId(): string | undefined;
    /**
     * The active `MediaStreamTrack` for the video feed,
     * or `undefined` if no stream is active.
     *
     * @example
     * if (camera.track) {
     *   console.log(camera.track.getSettings());
     * }
     */
    get track(): MediaStreamTrack | undefined;
    /**
     * Whether the camera stream is currently active.
     *
     * @example
     * if (camera.opened) {
     *   const dataUrl = camera.capture();
     * }
     */
    get opened(): boolean;
    /**
     * Whether the camera playback is currently paused.
     */
    get paused(): boolean;
    /**
     * The actual video resolution reported by the camera hardware.
     *
     * @example
     * const { width, height } = camera.resolution;
     * console.log(`Camera resolution: ${width}x${height}`);
     */
    get resolution(): {
        width: number;
        height: number;
    };
    /**
     * Current zoom level. `1` means no zoom.
     *
     * @example
     * console.log(camera.zoom); // 1
     */
    get zoom(): number;
    constructor();
    /**
     * Called when the element is inserted into the DOM.
     * Initializes the camera UI and optional controls.
     */
    protected connectedCallback(): void;
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
    static define(): typeof Camera;
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
    static createElement(): Camera;
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
    open(options?: CameraOpenOptions): Promise<MediaTrackSettings>;
    /**
     * Returns a promise that resolves when the camera finishes opening.
     * If the camera is not currently loading, resolves immediately.
     *
     * @example
     * await camera.waitOpen();
     * const dataUrl = camera.capture();
     */
    waitOpen(): Promise<void>;
    /**
     * Closes the camera and releases all associated resources.
     *
     * @example
     * camera.close();
     * console.log(camera.state); // 'close'
     */
    close(): void;
    /**
     * Resumes camera playback from a paused state.
     *
     * @example
     * camera.play();
     */
    play(): Promise<void>;
    /**
     * Pauses camera playback.
     * The current frame remains visible but the stream stops updating.
     *
     * @example
     * camera.pause();
     * console.log(camera.paused); // true
     */
    pause(): void;
    /**
     * Resets the zoom level to 1 (no zoom).
     *
     * @example
     * camera.resetZoom();
     * console.log(camera.zoom); // 1
     */
    resetZoom(): void;
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
    capture(options?: CaptureOptions): string;
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
    queryPermission(): Promise<PermissionState | undefined>;
    /**
     * Revokes camera permissions using the Permissions API.
     * Not all browsers support this; a warning is logged if unsupported.
     */
    revokePermission(): Promise<void>;
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
    getDevices(): Promise<Pick<MediaDeviceInfo, 'deviceId' | 'label'>[]>;
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
    on(type: string, listener: (event?: Event) => void, options?: {
        once?: boolean;
    }): Camera;
    /**
     * Removes an event listener from this camera element.
     *
     * @param type     - Event type.
     * @param listener - The listener to remove.
     * @returns This camera element for chaining.
     */
    off(type: string, listener: (event?: Event) => void): Camera;
}
export default Camera;
