import { SharedValue } from 'react-native-reanimated';
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
   * @type {SharedValue<number>}
   */
  get x(): SharedValue<number>;
  /**
   * Current phase value in latest frame the wave is updated at.
   * @type {SharedValue<number>}
   */

  get phase(): SharedValue<number>;
  /**
   * Current time value in latest frame the wave is updated at.
   * @type {SharedValue<number>}
   */
  get time(): SharedValue<number>;
  /**
   * Current amplitude value in latest frame the wave is updated at.
   * @type {SharedValue<number>}
   */
  get amplitude(): SharedValue<number>;
  /**
   * Maximum amplitude the wave is gonna reach in initial x.
   */
  get maxAmplitude(): SharedValue<number>;
  /**
   * Current frequency value in latest frame the wave is updated at.
   * @type {SharedValue<number>}
   */
  get frequency(): SharedValue<number>;
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
   * @type {SharedValue<number>}
   */
  x: SharedValue<number>;
  /**
   * set initial value for amplitude.
   * @type {SharedValue<number>}
   */
  initialAmplitude: SharedValue<number>;
  /**
   * set initial value for frequency.
   * @type {SharedValue<number>}
   */
  initialFrequency: SharedValue<number>;
  /**
   * speed of wave based on force
   */
  speed: SharedValue<number>;
  /**
   * At what frame was this wave created at.
   * @type {number | undefined}
   */
  createdFrame?: number;
  /**
   * override initial phase to start drawing phase.
   * @default 0
   * @type {SharedValue<number> | undefined}
   */
  initialPhase: SharedValue<number>;
  /**
   * override initial value for time multiplier
   * @default 0
   * @type {SharedValue<number> | undefined}
   */
  initialTime: SharedValue<number>;
  /**
   * Minimum amplitude value. If amplitude value reaches this value or less than it, the wave will be expired and not drawn anymore.
   * @default 5
   * @type {SharedValue<number> | undefined}
   */
  minimumAmplitude?: SharedValue<number>;
};
