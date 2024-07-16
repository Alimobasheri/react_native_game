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
  protected _phase: number = 0;
  protected _time: number = 0;
  protected _amplitude: number;
  protected _frequency: number;
  protected _phaseStep: number = DEFAULT_PHASE_STEP;
  protected _timeStep: number = DEFAULT_TIME_STEP;
  protected _minimumAmplitude: number = DEFAULT_MINIMUM_AMPLITUDE;
  protected _amplitudeMultiplier: number = DEFAULT_AMPLITUDE_MULTIPLIER;
  protected _frequencyMultiplier: number = DEFAULT_FREQUEMCY_MULTIPLIER;
  protected _phaseValueUpdater = (
    prevPhase: number,
    currentFrame: number
  ): number => prevPhase + this._phaseStep;
  protected _timeValueUpdater = (
    prevTime: number,
    currentFrame: number
  ): number => prevTime + this._timeStep;
  protected _amplitudeValueUpdater = (
    prevAmplitude: number,
    currentFrame: number
  ): number => prevAmplitude * this._amplitudeMultiplier;
  protected _frequencyValueUpdater = (
    prevFrequency: number,
    currentFrame: number
  ) => prevFrequency * this._frequencyMultiplier;

  constructor(config: WaveConfig) {
    this._initialConfig = config;
    this._x = config.x;
    this._amplitude = config.initialAmplitude;
    this._frequency = config.initialFrequency;
    this._phase = config.initialPhase ?? 0;
    this._time = config.initialTime ?? 0;
    this._source = config.source;

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

  update(currentFrame: number = 0) {
    this._phase = this._phaseValueUpdater(this._phase, currentFrame);
    this._time = this._timeValueUpdater(this._time, currentFrame);
    this._amplitude = this._amplitudeValueUpdater(
      this._amplitude,
      currentFrame
    );
    this._frequency = this._frequencyValueUpdater(
      this._frequency,
      currentFrame
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
      this.amplitude *
      decayFactor *
      Math.cos(distance * this.frequency + this.phase);
    return surface;
  }
  getDistanceFromSurfaceAtPosition(x: number, y: number) {
    return y - this.getSurfaceAtPosition(x);
  }
  getSlopeAtPosition(x: number): number {
    const distance = x - this.x;
    const decayFactor = this.getDecayFactorAtDistance(distance);
    const waveSlope =
      this.amplitude *
      decayFactor *
      this.frequency *
      Math.cos(distance * this.frequency + this.phase);
    return waveSlope;
  }
}
