import { IWave, WaveConfig } from './types';
import { WaveSource } from '../Sea/types';
import { ICanvasDimensions } from '@/containers/ReactNativeSkiaGameEngine';
import { SharedValue } from 'react-native-reanimated';

export class Wave implements IWave {
  protected _initialConfig: WaveConfig;
  protected _dimensions: ICanvasDimensions;
  protected _source: WaveSource;
  protected _x: SharedValue<number>;
  protected _phase: SharedValue<number>;
  protected _time: SharedValue<number>;
  protected _amplitude: SharedValue<number>;
  protected _maxAmplitude: SharedValue<number>;
  protected _frequency: SharedValue<number>;
  protected _speed: SharedValue<number>;
  protected _prevSpeed: number = 0;

  constructor(config: WaveConfig) {
    this._initialConfig = config;
    this._dimensions = config.dimensions;

    this._x = config.x;
    this._maxAmplitude = config.initialAmplitude;
    this._amplitude = config.initialAmplitude;

    this._phase = config.initialPhase;

    this._frequency = config.initialFrequency;
    // this._phase = config.initialPhase ?? 0;
    this._time = config.initialTime;
    this._speed = config.speed;
    this._source = config.source;
  }

  get initialConfig(): WaveConfig {
    return this._initialConfig;
  }
  get x() {
    return this._x;
  }
  get phase() {
    return this._phase;
  }
  get time() {
    return this._time;
  }
  get amplitude() {
    return this._amplitude;
  }

  get maxAmplitude() {
    return this._maxAmplitude;
  }
  get frequency() {
    return this._frequency;
  }

  get speed() {
    return this._speed;
  }

  get source(): WaveSource {
    return this._source;
  }

  // Modified update method to simulate physics
  update(deltaTime?: number) {
    if (!deltaTime) return;

    // Convert deltaTime to seconds
    const deltaSeconds = deltaTime / 1000;

    // Update time
    this._time.value += deltaSeconds;

    if (this._source === WaveSource.FLOW) return;

    // Initial quick rise phase for amplitude
    const riseTime = 0.2; // 1 second for quick rise
    const initialDecayFactor = 0.9; // Quick decay factor for initial rise
    const smoothDecayFactor = 0.92; // Smooth decay factor for gradual decay

    if (this._time.value < riseTime) {
      const progress = this._time.value / riseTime;
      this._amplitude.value =
        1 + this._maxAmplitude.value * Math.pow(progress, 3);
    } else {
      const smoothDecayFactor = 0.98; // Adjust this value to control the speed of decay
      this._amplitude.value *= smoothDecayFactor;
    }

    if (this._time.value > riseTime / 3 && this._frequency.value < 60) {
      // Smooth frequency update
      const frequencyDecayFactor = 1.01; // A decay factor for smoother frequency changes
      this._frequency.value = this._frequency.value * frequencyDecayFactor;
    }
    if (this._time.value > riseTime / 3 && this._speed.value < 1.1) {
      this._prevSpeed = this._speed.value;
      this._speed.value *= 1.01;
    }
  }

  isExpired(): boolean {
    return this._amplitude.value < 1;
  }

  getXAcceleration(): number {
    return this._speed.value - this._prevSpeed;
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
    let xPosition = x / (this._dimensions.width || 1);

    xPosition = xPosition + this._time.value * this._speed.value * 0.4;
    let distance = xPosition - this._x.value / (this._dimensions.width || 1);
    return distance;
  }
  getSurfaceAtPosition(x: number): number {
    if (!this._dimensions) return 0;

    let distance = this.getDistance(x);
    let decayFactor = 1;
    if (this._source !== WaveSource.FLOW)
      decayFactor = this.getDecayFactorAtDistance(distance);
    let phase = 0;
    if (this._source !== WaveSource.FLOW) phase = this._phase.value;
    const surface =
      -this._amplitude *
      0.05 *
      decayFactor *
      Math.sin(distance * this._frequency.value * 0.5 + 0.5);
    return surface * (this._dimensions.height || 1);
  }
  getUniformsForShader() {
    return {
      amplitude: this._amplitude,
      frequency: this._frequency,
      phase: this._phase,
      x: this._x,
    };
  }
  getDistanceFromSurfaceAtPosition(x: number, y: number) {
    return y - this.getSurfaceAtPosition(x);
  }
  getSlopeAtPosition(x: number): number {
    const distance = x - this._x.value;
    const decayFactor = this.getDecayFactorAtDistance(distance);
    const waveSlope =
      -this.amplitude *
      decayFactor *
      this._frequency.value *
      Math.cos(distance * this.frequency.value + this.phase.value);
    return waveSlope;
  }
}
