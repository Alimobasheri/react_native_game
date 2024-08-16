import {
  DEFAULT_AMPLITUDE_MULTIPLIER,
  DEFAULT_FREQUEMCY_MULTIPLIER,
  DEFAULT_MINIMUM_AMPLITUDE,
  DEFAULT_PHASE_STEP,
  DEFAULT_TIME_STEP,
} from '@/constants/waterConfigs';
import { IWave, WaveConfig } from './types';
import { WaveSource } from '../Sea/types';
import { ICanvasDimensions } from '@/containers/ReactNativeSkiaGameEngine';

export class Wave implements IWave {
  protected _initialConfig: WaveConfig;
  protected _dimensions: ICanvasDimensions;
  protected _source: WaveSource;
  protected _x: number;
  protected _phase: number = -Math.PI / 2;
  protected _time: number = 0;
  protected _amplitude: number;
  protected _maxAmplitude: number;
  protected _frequency: number;
  protected _speed: number = 1;
  protected _phaseStep: number = DEFAULT_PHASE_STEP;
  protected _timeStep: number = DEFAULT_TIME_STEP;
  protected _minimumAmplitude: number = DEFAULT_MINIMUM_AMPLITUDE;
  protected _amplitudeMultiplier: number = DEFAULT_AMPLITUDE_MULTIPLIER;
  protected _frequencyMultiplier: number = DEFAULT_FREQUEMCY_MULTIPLIER;
  protected _initialForce: number; // New property for initial force
  protected _velocity: number = 0; // New property for wave velocity
  protected _acceleration: number = 0; // New property for wave acceleration
  protected _gravity: number = 0.98; // Gravity constant
  protected _friction: number = 0.2; // Friction constant
  protected _phaseValueUpdater = (
    prevPhase: number,
    deltaTime: number
  ): number => {
    return prevPhase + (deltaTime / 100) * this._phaseStep;
  };
  protected _timeValueUpdater = (
    prevTime: number,
    deltaTime: number
  ): number => {
    const timeChange = deltaTime / 100;
    return prevTime + timeChange;
  };
  protected _initialAmplitudeMultiplier: number = 0.99;
  protected _finalAmplitudeMultiplier: number = 0.98;
  protected _decayDuration: number = 5;
  protected _calculateAmplitudeMultiplier = (elapsedTime: number): number => {
    const peakDuration = this._decayDuration / 4;
    const totalDuration = this._decayDuration;
    const endValue = 0.96;

    if (elapsedTime >= totalDuration) {
      return endValue;
    }

    let t: number;
    if (elapsedTime <= peakDuration) {
      // Normalize for peak phase
      t = elapsedTime / peakDuration;
    } else {
      // Normalize for decay phase
      t = (elapsedTime - peakDuration) / (totalDuration - peakDuration);
    }

    // Adjust control points for smoother transition
    const p0 = 1; // Start value
    const p1 = 4; // Control point 1
    const p2 = 10; // Control point 2 (peak value)
    const p3 = elapsedTime <= peakDuration ? 10 : endValue; // Control point for decay phase

    // Use a cubic Bezier curve for both phases
    const currentMultiplier =
      (1 - t) ** 3 * p0 +
      3 * (1 - t) ** 2 * t * p1 +
      3 * (1 - t) * t ** 2 * p2 +
      t ** 3 * p3;

    return currentMultiplier;
  };

  // New method to calculate the amplitude rise and decay with friction and interpolation
  // New method to calculate the amplitude rise and decay with friction, interpolation, and initial force
  protected _calculateAmplitude(elapsedTime: number): number {
    const riseTime = 1 / this._speed; // Time it takes to reach peak amplitude, adjusted by force
    const totalDuration = 5; // Total duration of the wave
    const friction = 0.01; // Friction coefficient

    if (elapsedTime < riseTime) {
      // Rising phase
      return (
        this._maxAmplitude * Math.sin((Math.PI / 2) * (elapsedTime / riseTime))
      );
    } else {
      // Decay phase with interpolation and force adjustment
      const decayTime = elapsedTime - riseTime;
      const adjustedDecayFactor = Math.exp(
        (-friction * decayTime) / this._speed
      );
      return this._amplitude * adjustedDecayFactor;
    }
  }

  protected _amplitudeValueUpdater = (
    prevAmplitude: number,
    deltaTime: number
  ): number => {
    const elapsedTime = this._time + deltaTime / 100;
    return this._calculateAmplitude(elapsedTime);
  };
  protected _frequencyValueUpdater = (
    prevFrequency: number,
    currentFrame: number
  ) => prevFrequency * this._frequencyMultiplier;

  constructor(config: WaveConfig) {
    this._initialConfig = config;
    this._dimensions = config.dimensions;

    this._x = config.x;
    this._maxAmplitude = config.initialAmplitude;
    this._amplitude =
      config.source === WaveSource.FLOW ? config.initialAmplitude : 0.006;

    this._frequency = config.initialFrequency;
    // this._phase = config.initialPhase ?? 0;
    this._time = config.initialTime ?? 0;
    this._speed = config.speed ?? 0.01;
    this._source = config.source;

    // New property for force
    this._initialForce = config.initialForce ?? 1;
    this._acceleration = config.initialForce ?? 0;
    this._velocity = config.speed ?? 0; // Initial velocity based on the force

    this._amplitudeMultiplier =
      config.amplitudeMultiplier ?? this._amplitudeMultiplier;
    this._frequencyMultiplier =
      config.frequencyMultiplier ?? this._frequencyMultiplier;

    if (typeof config.phaseValueUpdater === 'function') {
      this._phaseValueUpdater = config.phaseValueUpdater;
    }
    if (typeof config.timeValueUpdater === 'function') {
      this._timeValueUpdater = config.timeValueUpdater;
    }
    if (typeof config.amplitudeValueUpdater === 'function') {
      this._amplitudeValueUpdater = config.amplitudeValueUpdater;
    }
    if (typeof config.frequencyValueUpdater === 'function') {
      this._frequencyValueUpdater = config.frequencyValueUpdater;
    }
  }

  get initialConfig(): WaveConfig {
    return this._initialConfig;
  }
  get x(): number {
    return this._x;
  }
  get phase(): number {
    return this._phase;
  }
  get time(): number {
    return this._time;
  }
  get amplitude(): number {
    return this._amplitude;
  }
  get frequency(): number {
    return this._frequency;
  }

  get speed(): number {
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
    this._time += deltaSeconds;

    if (this._source === WaveSource.FLOW) return;

    // // Update acceleration due to gravity and friction
    // this._acceleration -= -this._gravity * deltaSeconds;
    // this._velocity += this._acceleration * deltaSeconds;
    // this._velocity *= 1 - this._friction;

    // Initial quick rise phase for amplitude
    const riseTime = 0.2; // 1 second for quick rise
    const initialDecayFactor = 0.9; // Quick decay factor for initial rise
    const smoothDecayFactor = 0.92; // Smooth decay factor for gradual decay

    if (this._time < riseTime) {
      const progress = this._time / riseTime;
      this._amplitude = 1 + this._maxAmplitude * Math.pow(progress, 3);
    } else {
      const smoothDecayFactor = 0.98; // Adjust this value to control the speed of decay
      this._amplitude *= smoothDecayFactor;
    }

    if (this._time > riseTime / 3 && this._frequency < 60) {
      // Smooth frequency update
      const frequencyDecayFactor = 1.005; // A decay factor for smoother frequency changes
      this._frequency = this._frequency * frequencyDecayFactor;
    }
    if (this._time > riseTime / 3 && this._speed < 1.1) {
      this._speed *= 1.005;
    }
  }

  isExpired(): boolean {
    return this._amplitude < 1;
  }
  /**
   * Retrieves the decay factor at a given distance.
   * A wave decays at a rate of 0.01 per pixel.
   * @param {number} distance - the distance for which to calculate the decay factor
   * @return {number} the calculated decay factor
   */
  protected getDecayFactorAtDistance(distance: number): number {
    return Math.exp(-10 * Math.abs(distance));
  }
  smoothstep(edge0: number, edge1: number, x: number): number {
    let t = (x - edge0) / (edge1 - edge0);

    t = Math.max(0, Math.min(1, t));

    return t * t * (3 - 2 * t);
  }
  getSurfaceAtPosition(x: number): number {
    if (!this._dimensions) return 0;
    let xPosition = x / (this._dimensions.width || 1);

    xPosition = xPosition + this._time * this._speed * 0.4;
    let distance = xPosition - this._x / (this._dimensions.width || 1);
    let decayFactor = 1;
    if (this._source !== WaveSource.FLOW)
      decayFactor = this.getDecayFactorAtDistance(distance);
    let phase = 0;
    if (this._source !== WaveSource.FLOW) phase = this._phase;
    const surface =
      -this.amplitude *
      0.05 *
      decayFactor *
      Math.sin(distance * this.frequency * 0.5 + 0.5);
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
    const distance = x - this.x;
    const decayFactor = this.getDecayFactorAtDistance(distance);
    const waveSlope =
      -this.amplitude *
      decayFactor *
      this.frequency *
      Math.cos(distance * this.frequency + this.phase);
    return waveSlope;
  }
}
