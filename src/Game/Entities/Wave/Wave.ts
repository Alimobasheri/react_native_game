import {
  DEFAULT_AMPLITUDE_MULTIPLIER,
  DEFAULT_FREQUEMCY_MULTIPLIER,
  DEFAULT_MINIMUM_AMPLITUDE,
  DEFAULT_PHASE_STEP,
  DEFAULT_TIME_STEP,
} from "@/constants/waterConfigs";
import { IWave, WaveConfig } from "./types";
import { WaveSource } from "../Sea/types";

export class Wave implements IWave {
  protected _initialConfig: WaveConfig;
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
  protected _friction: number = 0.1; // Friction constant
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
    this._x = config.x;
    this._maxAmplitude = config.initialAmplitude;
    this._amplitude = config.initialAmplitude / 20;
    this._frequency = config.initialFrequency;
    // this._phase = config.initialPhase ?? 0;
    this._time = config.initialTime ?? 0;
    this._speed = config.speed ?? 1;
    this._source = config.source;

    // New property for force
    this._initialForce = config.initialForce ?? 1;
    this._velocity = this._initialForce; // Initial velocity based on the force

    this._amplitudeMultiplier =
      config.amplitudeMultiplier ?? this._amplitudeMultiplier;
    this._frequencyMultiplier =
      config.frequencyMultiplier ?? this._frequencyMultiplier;

    if (typeof config.phaseValueUpdater === "function") {
      this._phaseValueUpdater = config.phaseValueUpdater;
    }
    if (typeof config.timeValueUpdater === "function") {
      this._timeValueUpdater = config.timeValueUpdater;
    }
    if (typeof config.amplitudeValueUpdater === "function") {
      this._amplitudeValueUpdater = config.amplitudeValueUpdater;
    }
    if (typeof config.frequencyValueUpdater === "function") {
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

  get source(): WaveSource {
    return this._source;
  }

  // Modified update method to simulate physics
  update(deltaTime: number) {
    // Update acceleration with gravity and friction
    this._acceleration =
      -(this._gravity * Math.exp(this._amplitude * 0.01)) - this._friction;

    // Update velocity with acceleration
    this._velocity += (this._acceleration * deltaTime) / 100;

    // Update amplitude with velocity
    this._amplitude += (this._velocity * deltaTime) / 100;

    this._phase = this._phaseValueUpdater(this._phase, deltaTime);
    this._time = this._timeValueUpdater(this._time, deltaTime);
    this._frequency = Math.min(
      0.08,
      this._frequencyValueUpdater(this._frequency, deltaTime)
    );
  }
  isExpired(): boolean {
    return this._amplitude < this._minimumAmplitude;
  }
  /**
   * Retrieves the decay factor at a given distance.
   * A wave decays at a rate of 0.01 per pixel.
   * @param {number} distance - the distance for which to calculate the decay factor
   * @return {number} the calculated decay factor
   */
  protected getDecayFactorAtDistance(distance: number): number {
    return Math.exp(-0.01 * Math.abs(distance));
  }
  getSurfaceAtPosition(x: number): number {
    const distance = x - this._x;
    const decayFactor = this.getDecayFactorAtDistance(distance);
    const surface =
      -this.amplitude *
      decayFactor *
      Math.cos((x - this._x) * this.frequency + this.phase);
    return surface;
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
