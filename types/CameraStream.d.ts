/**
 * Manages the lifecycle of a camera MediaStream bound to a video element.
 * Wraps the `getUserMedia` API to provide a simple open/close interface.
 *
 * @example
 * const stream = new CameraStream(videoElement);
 * const settings = await stream.open({ video: { facingMode: 'user' }, audio: false });
 * console.log(settings.width, settings.height);
 * stream.close();
 */
export default class CameraStream {
    #private;
    /**
     * Creates a new CameraStream instance.
     * @param video - The video element to bind the camera stream to.
     */
    constructor(video: HTMLVideoElement);
    /**
     * Opens a camera stream with the given constraints.
     * If a stream is already active, it is closed before opening a new one.
     *
     * @param constraints - MediaStream constraints for `getUserMedia`.
     * @returns The actual track settings reported by the camera device.
     * @throws {DOMException} If camera access is denied or the device is unavailable.
     */
    open(constraints: MediaStreamConstraints): Promise<MediaTrackSettings>;
    /**
     * Closes the active camera stream and releases all associated tracks.
     * Safe to call even when no stream is active.
     */
    close(): void;
}
