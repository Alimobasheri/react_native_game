import { IWave, WaveConfig } from './types';
import { WaveSource } from '../Sea/types';
import { ICanvasDimensions } from '@/containers/ReactNativeSkiaGameEngine';
import { makeMutable, runOnJS, SharedValue } from 'react-native-reanimated';

export class Wave implements IWave {
  protected _initialConfig: WaveConfig;
  protected _isFlowing: boolean;
  protected _dimensions: ICanvasDimensions;
  protected _source: WaveSource;
  protected _x: SharedValue<number>;
  protected _phase: SharedValue<number> = makeMutable(-Math.PI / 2);
  protected _time: SharedValue<number>;
  protected _amplitude: SharedValue<number>;
  protected _maxAmplitude: SharedValue<number>;
  protected _frequency: SharedValue<number>;
  protected _speed: SharedValue<number>;
  protected _prevSpeed: number = 0;

  constructor(config: WaveConfig) {
    this._initialConfig = config;
    this._isFlowing = config.isFlowing;
    this._dimensions = config.dimensions;

    this._x = makeMutable(config.x);
    this._maxAmplitude = makeMutable(config.initialAmplitude);
    this._amplitude = makeMutable(
      config.source === WaveSource.FLOW ? config.initialAmplitude : 0.006
    );

    this._frequency = makeMutable(config.initialFrequency);
    // this._phase = config.initialPhase ?? 0;
    this._time = makeMutable(config.initialTime ?? 0);
    this._speed = makeMutable(config.speed ?? 0.01);
    this._source = config.source;
  }

  get initialConfig(): WaveConfig {
    return this._initialConfig;
  }
  get isFlowing(): boolean {
    return this._isFlowing;
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
  update(
    {
      time,
      source,
      amplitude,
      maxAmplitude,
      frequency,
      speed,
      isFlowing,
    }: Partial<IWave>,
    deltaTime?: number,
    onExpired?: () => void
  ) {
    'worklet';
    if (!deltaTime) return;
    if (
      !isFlowing ||
      !time ||
      !amplitude ||
      !maxAmplitude ||
      !frequency ||
      !speed ||
      !source
    )
      return;

    // Convert deltaTime to seconds
    const deltaSeconds = deltaTime / 1000;

    // Update time
    time.value += deltaSeconds;

    if (source === WaveSource.FLOW) return;

    // Initial quick rise phase for amplitude
    const riseTime = 0.2; // 1 second for quick rise
    const initialDecayFactor = 0.9; // Quick decay factor for initial rise
    const smoothDecayFactor = 0.92; // Smooth decay factor for gradual decay

    if (time.value < riseTime) {
      const progress = time.value / riseTime;
      amplitude.value = 1 + maxAmplitude.value * Math.pow(progress, 3);
    } else {
      const smoothDecayFactor = 0.98; // Adjust this value to control the speed of decay
      amplitude.value *= smoothDecayFactor;
    }

    if (time.value > riseTime / 3 && frequency.value < 60) {
      // Smooth frequency update
      const frequencyDecayFactor = 1.01; // A decay factor for smoother frequency changes
      frequency.value = frequency.value * frequencyDecayFactor;
    }
    if (time.value > riseTime / 3 && speed.value < 1.1) {
      this._prevSpeed = speed.value;
      speed.value *= 1.01;
    }
    if (onExpired) {
      if (amplitude.value < 1 && source === WaveSource.TOUCH)
        runOnJS(onExpired)();
    }
  }

  reset(config: WaveConfig) {
    this._initialConfig = config;
    this._isFlowing = config.isFlowing;
    this._dimensions = config.dimensions;

    this._x.value = config.x;
    this._maxAmplitude.value = config.initialAmplitude;
    this._amplitude.value =
      config.source === WaveSource.FLOW ? config.initialAmplitude : 0.006;

    this._frequency.value = config.initialFrequency;
    // this._phase = config.initialPhase ?? 0;
    this._time.value = config.initialTime ?? 0;
    this._speed.value = config.speed ?? 0.01;
    this._source = config.source;
  }

  isExpired(): boolean {
    'worklet';
    if (this.source !== WaveSource.FLOW && this._amplitude.value < 1) {
    }
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
