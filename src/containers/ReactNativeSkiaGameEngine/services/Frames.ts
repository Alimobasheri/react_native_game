import EventEmitter from 'react-native/Libraries/vendor/emitter/EventEmitter';

/**
 * The event name for frame updates.
 * This event is emitted every time the frame is updated.
 */
export const FrameUpdateEvent = 'FrameUpdateEvent';

/**
 * The `Frames` class is responsible for managing and tracking frame updates within the game engine.
 * It extends `EventEmitter`, allowing other parts of the game to listen for frame updates.
 *
 * @extends EventEmitter
 */
export class Frames extends EventEmitter {
  /**
   * The current frame number.
   * This value is incremented each time the frame is updated.
   *
   * @type {number}
   * @private
   */
  private _currentFrame: number = 0;

  /**
   * Creates an instance of the `Frames` class.
   */
  constructor() {
    super();
  }

  /**
   * Gets the current frame number.
   *
   * @returns {number} The current frame number.
   */
  public get currentFrame(): number {
    return this._currentFrame;
  }

  /**
   * Updates the frame based on the provided frames per second (fps) and delta time.
   * This method increments the current frame counter and emits a `FrameUpdateEvent`.
   *
   * @param {number} fps - The frames per second rate at which the game is running.
   * @param {number} delta - The time elapsed since the last update, in milliseconds.
   */
  public updateFrame(fps: number, delta: number) {
    // Ignore delta values smaller than 1 ms
    if (delta < 1) {
      return;
    }

    // Convert delta from milliseconds to seconds
    const deltaInSeconds = delta / 1000;

    // Calculate how many frames have passed in the given delta time
    const framesPassed = fps * deltaInSeconds;

    // Increment the current frame by the number of whole frames that have passed
    this._currentFrame += Math.floor(framesPassed);

    // Emit the frame update event with the original delta (in milliseconds)
    this.emit(FrameUpdateEvent, delta);
  }
}
