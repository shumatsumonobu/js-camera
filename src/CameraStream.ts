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
  /** The video element that displays the camera feed. */
  #video: HTMLVideoElement;

  /**
   * Creates a new CameraStream instance.
   * @param video - The video element to bind the camera stream to.
   */
  constructor(video: HTMLVideoElement) {
    this.#video = video;
  }

  /**
   * Opens a camera stream with the given constraints.
   * If a stream is already active, it is closed before opening a new one.
   *
   * @param constraints - MediaStream constraints for `getUserMedia`.
   * @returns The actual track settings reported by the camera device.
   * @throws {DOMException} If camera access is denied or the device is unavailable.
   */
  async open(constraints: MediaStreamConstraints): Promise<MediaTrackSettings> {
    // Close any existing stream before opening a new one.
    this.close();

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    this.#video.srcObject = stream;

    const track = stream.getVideoTracks()[0];

    return new Promise<MediaTrackSettings>((resolve, reject) => {
      const onLoaded = () => {
        this.#video.removeEventListener('error', onError);
        resolve(track.getSettings());
      };
      const onError = () => {
        this.#video.removeEventListener('loadedmetadata', onLoaded);
        reject(this.#video.error);
      };
      this.#video.addEventListener('loadedmetadata', onLoaded, {once: true});
      this.#video.addEventListener('error', onError, {once: true});
    });
  }

  /**
   * Closes the active camera stream and releases all associated tracks.
   * Safe to call even when no stream is active.
   */
  close(): void {
    (this.#video.srcObject as MediaStream)?.getTracks().forEach(track => track.stop());
    this.#video.srcObject = null;
  }
}
