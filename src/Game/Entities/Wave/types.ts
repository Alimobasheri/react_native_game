import { WaveSource } from '../Sea/types';

/**
 * Interface representing a wave.
 * Providing information about the wave for drawing purposes.
 * @interface IWave
 */
export interface IWave {
  /**
   * The initial config passed to constructor.
   * @type {WaveConfig}
   */
  get initialConfig(): WaveConfig;
  /**
   * Original position the wave originated from.
   * @type {number}
   */
  get x(): number;
  /**
   * Current phase value in latest frame the wave is updated at.
   * @type {number}
   */

  get phase(): number;
  /**
   * Current time value in latest frame the wave is updated at.
   * @type {number}
   */
  get time(): number;
  /**
   * Current amplitude value in latest frame the wave is updated at.
   * @type {number}
   */
  get amplitude(): number;
  /**
   * Maximum amplitude the wave is gonna reach in initial x.
   */
  get maxAmplitude(): number;
  /**
   * Current frequency value in latest frame the wave is updated at.
   * @type {number}
   */
  get frequency(): number;
  /**
   * What source caused this wave
   */
  get source(): WaveSource;
  /**
   * Checks if based on current amplitude,the wave is no longer useful to draw.
   * @returns {boolean} true if wave is expired
   */
  isExpired: () => boolean;
  getDecayFactorAtDistance: (distance: number) => number;
  getDistance: (x: number) => number;
  getXAcceleration: () => number;
  /**
   * Given an x coordinate, calculate the y coordinate of the water surface.
   * Uses x to determine horizontal distance from original starting position of this wave.
   * Uses distance to calculate a factor to decay the wave's height.
   * Uses the wave's phase and frequency to determine the wave's angle.
   * Finally uses `Math.cos` to calculate the wave's height direction [-1, 1].
   * @param {number} x The x-coordinate of position to calculate surface at.
   * @returns {number} The y-coordinate of the water surface.
   */
  getSurfaceAtPosition: (x: number) => number;
  /**
   * Given a point x and y, calculate the distance of the point from the water surface in y-coordinate. If poit is under surface, positive value returns, otherwise negative.
   * @param x The x-coordinate of position to calculate surface at.
   * @param y The y-coordinate of position to calculate surface at.
   * @returns {number} The distance of the position from the water surface in y-coordinate.
   */
  getDistanceFromSurfaceAtPosition: (x: number, y: number) => number;
  /**
   * Given an x coordinate, calculate the slope of the water surface in radian.
   * @param x The x-coordinate of position to calculate surface slope at.
   * @returns {number} The slope of the water surface in radian.
   */
  getSlopeAtPosition: (x: number) => number;
  /**
   * Given a frame number, updates the wave's phase, time, amplitude, and frquency.
   * After the update, surface points and distances and expirations are calculated based on new values.
   * @param {number | undefined} deltaTime Time passed since last animation frame.
   * @returns {void}
   */
  update: (deltaTime?: number) => void;
}

/**
 * Initial config to create a functioning wave in sea.
 */
export type WaveConfig = {
  /**
   * Dimensions to normalize the wave.
   */
  dimensions: { width: number; height: number };
  /**
   * Used to differentiate between user made waves and other waves.
   */
  source: WaveSource;
  /**
   * x-coordinate of the wave's origin position.
   * @type {number}
   */
  x: number;
  /**
   * set initial value for amplitude.
   * @type {number}
   */
  initialAmplitude: number;
  /**
   * set initial value for frequency.
   * @type {number}
   */
  initialFrequency: number;
  initialForce?: number;
  /**
   * speed of wave based on force
   */
  speed?: number;
  /**
   * At what frame was this wave created at.
   * @type {number | undefined}
   */
  createdFrame?: number;
  /**
   * override initial phase to start drawing phase.
   * @default 0
   * @type {number | undefined}
   */
  initialPhase?: number;
  /**
   * override initial value for time multiplier
   * @default 0
   * @type {number | undefined}
   */
  initialTime?: number;
  /**
   * Override value for amplitude multiplier.
   * In each frame, the amplitude value is multiplied by this value.
   * @default 0.95
   * @type {numebr | undefined}
   */
  amplitudeMultiplier?: number;
  /**
   * Override value for frequency multiplier.
   * In each frame, the frequency value is multiplied by this value.
   * @default 1.01
   * @type {numebr | undefined}
   */
  frequencyMultiplier?: number;
  /**
   * To provide a custom updater for phase value in each frame.
   * By default phase is incremented by 0.2.
   * This function can beused for custom implementation, like multiplying or deviding, or deciding based on frame numebr.
   * @param prevPhase Phase value in previous frame
   * @param numberOfFrame Current frame number in game engine
   * @returns {number} Phase value to be used in current frame
   */
  phaseValueUpdater?: (prevPhase: number, numberOfFrame: number) => number;
  /**
   * To provide a custom updater for time value in each frame.
   * By default time is incremented by 1.
   * This function can beused for custom implementation, like multiplying or deviding, or deciding based on frame numebr.
   * @param prevTime Time value in previous frame
   * @param numberOfFrame Current frame number in game engine
   * @returns {number} Time value to be used in current frame
   */
  timeValueUpdater?: (prevTime: number, numberOfFrame: number) => number;
  /**
   * To provide a custom updater for amplitude value in each frame.
   * By default amplitude is multiplied by {@link WaveConfig.amplitudeMultiplier amplitudeMultiplier}.
   * @param prevAmplitude Amplitude value in previous frame
   * @param numberOfFrame Current frame numebr in game engine
   * @returns {number} Amplitude value to be used in current frame
   */
  amplitudeValueUpdater?: (
    prevAmplitude: number,
    numberOfFrame: number
  ) => number;
  /**
   * To provide a custom updater for amplitude value in each frame.
   * By default amplitude is multiplied by {@link WaveConfig.frequencyMultiplier frequencyMultiplier}.
   * @param prevFrequency Frequency value in previous frame
   * @param numberOfFrame Current frame numebr in game engine
   * @returns {number} Frequency value to be used in current frame
   */
  frequencyValueUpdater?: (
    prevFrequency: number,
    numberOfFrame: number
  ) => number;
  /**
   * Minimum amplitude value. If amplitude value reaches this value or less than it, the wave will be expired and not drawn anymore.
   * @default 5
   * @type {number | undefined}
   */
  minimumAmplitude?: number;
};
