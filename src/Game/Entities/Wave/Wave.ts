import { IWave, IWaveSystemProps, WaveConfig } from './types';
import { WaveSource } from '../Sea/types';
import { ICanvasDimensions } from '@/containers/ReactNativeSkiaGameEngine';
import {
  makeMutable,
  runOnJS,
  runOnUI,
  SharedValue,
} from 'react-native-reanimated';

export class Wave implements IWave {
  initialConfig: WaveConfig;
  isFlowing: SharedValue<boolean>;
  dimensions: { width: number; height: number };
  source: WaveSource;
  x: SharedValue<number>;
  phase: SharedValue<number> = makeMutable(-Math.PI / 2);
  time: SharedValue<number>;
  amplitude: SharedValue<number>;
  maxAmplitude: SharedValue<number>;
  frequency: SharedValue<number>;
  speed: SharedValue<number>;
  prevSpeed: number = 0;
  lastForceTime: SharedValue<number>;
  forceSmoothingFactor = 0.2;
  props: SharedValue<IWaveSystemProps>;

  constructor(config: WaveConfig) {
    this.initialConfig = config;
    this.isFlowing = makeMutable(config.isFlowing);
    this.dimensions = config.dimensions;

    this.x = makeMutable(config.x);
    this.maxAmplitude = makeMutable(config.initialAmplitude);
    this.amplitude = makeMutable(
      config.source === WaveSource.FLOW ? config.initialAmplitude : 0.006
    );

    this.frequency = makeMutable(config.initialFrequency);
    // this.phase = config.initialPhase ?? 0;
    this.time = makeMutable(config.initialTime ?? 0);
    this.speed = makeMutable(config.speed ?? 0.01);
    this.source = config.source;
    this.lastForceTime = makeMutable(0);
    this.props = makeMutable({
      initialConfig: this.initialConfig,
      isFlowing: this.isFlowing,
      x: this.x,
      phase: this.phase,
      time: this.time,
      amplitude: this.amplitude,
      maxAmplitude: this.maxAmplitude,
      frequency: this.frequency,
      speed: this.speed,
      source: this.source,
      prevSpeed: this.prevSpeed,
      lastForceTime: this.lastForceTime,
      forceSmoothingFactor: this.forceSmoothingFactor,
      dimensions: this.dimensions,
    });
  }
  getXAcceleration(): number {
    return this.speed.value - this.prevSpeed;
  }
  /**
   * Retrieves the decay factor at a given distance.
   * A wave decays at a rate of 0.01 per pixel.
   * @param {number} distance - the distance for which to calculate the decay factor
   * @return {number} the calculated decay factor
   */
  getDecayFactorAtDistance(distance: number): number {
    return Math.exp(-8 * Math.abs(distance));
  }
  smoothstep(edge0: number, edge1: number, x: number): number {
    let t = (x - edge0) / (edge1 - edge0);

    t = Math.max(0, Math.min(1, t));

    return t * t * (3 - 2 * t);
  }

  getDistance(x: number): number {
    let xPosition = x / (this.dimensions.width || 1);

    xPosition = xPosition + this.time.value * this.speed.value * 0.4;
    let distance = xPosition - this.x.value / (this.dimensions.width || 1);
    return distance;
  }
  getSurfaceAtPosition(x: number): number {
    if (!this.dimensions) return 0;

    let distance = this.getDistance(x);
    let decayFactor = 1;
    if (this.source !== WaveSource.FLOW)
      decayFactor = this.getDecayFactorAtDistance(distance);
    let phase = 0;
    if (this.source !== WaveSource.FLOW) phase = this.phase.value;
    const surface =
      -this.amplitude.value *
      0.05 *
      decayFactor *
      Math.sin(distance * this.frequency.value * 0.5 + 0.5);
    return surface * (this.dimensions.height || 1);
  }
  getUniformsForShader() {
    return {
      amplitude: this.amplitude,
      frequency: this.frequency,
      phase: this.phase,
      x: this.x,
    };
  }
  getDistanceFromSurfaceAtPosition(x: number, y: number) {
    return y - this.getSurfaceAtPosition(x);
  }
  getSlopeAtPosition(x: number): number {
    const distance = x - this.x.value;
    const decayFactor = this.getDecayFactorAtDistance(distance);
    const waveSlope =
      -this.amplitude *
      decayFactor *
      this.frequency.value *
      Math.cos(distance * this.frequency.value + this.phase.value);
    return waveSlope;
  }
}
