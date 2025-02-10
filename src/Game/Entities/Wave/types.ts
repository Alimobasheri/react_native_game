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
  initialConfig: WaveConfig;
  isFlowing: SharedValue<boolean>;
  /**
   * Original position the wave originated from.
   * @type {SharedValue<number>}
   */
  x: SharedValue<number>;
  /**
   * Current phase value in latest frame the wave is updated at.
   * @type {SharedValue<number>}
   */

  phase: SharedValue<number>;
  /**
   * Current time value in latest frame the wave is updated at.
   * @type {SharedValue<number>}
   */
  time: SharedValue<number>;
  /**
   * Current amplitude value in latest frame the wave is updated at.
   * @type {SharedValue<number>}
   */
  amplitude: SharedValue<number>;
  /**
   * Maximum amplitude the wave is gonna reach in initial x.
   */
  maxAmplitude: SharedValue<number>;
  /**
   * Current frequency value in latest frame the wave is updated at.
   * @type {SharedValue<number>}
   */
  frequency: SharedValue<number>;
  /**
   * Current speed value in latest frame the wave is updated at.
   * @type {SharedValue<number>}
   */
  speed: SharedValue<number>;
  /**
   * What source caused this wave
   */
  source: WaveSource;
  prevSpeed: number;
  lastForceTime: SharedValue<number>;
  forceSmoothingFactor: number;
  dimensions: { width: number; height: number };
  props: SharedValue<IWaveSystemProps>;
}

/**
 * Initial config to create a functioning wave in sea.
 */
export type WaveConfig = {
  /**
   * Should be updated when update called?
   */
  isFlowing: boolean;
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
   * Minimum amplitude value. If amplitude value reaches this value or less than it, the wave will be expired and not drawn anymore.
   * @default 5
   * @type {number | undefined}
   */
  minimumAmplitude?: number;
};

export type IWaveSystemProps = Pick<
  IWave,
  | 'initialConfig'
  | 'amplitude'
  | 'phase'
  | 'time'
  | 'maxAmplitude'
  | 'frequency'
  | 'speed'
  | 'source'
  | 'isFlowing'
  | 'dimensions'
  | 'x'
  | 'prevSpeed'
  | 'lastForceTime'
  | 'forceSmoothingFactor'
>;
