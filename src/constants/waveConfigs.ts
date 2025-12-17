/**
 * Configuration for wave decay behavior
 * Decay rates are per second (values < 1.0 mean decay, values > 1.0 mean growth)
 */

export const WAVE_DECAY_CONFIG = {
  /**
   * Amplitude decay rate per second
   * 0.5 means amplitude decays by 50% per second (very fast)
   * 0.9 means amplitude decays by 10% per second (slow)
   */
  amplitudeDecayRate: 0.5,

  /**
   * Frequency decay rate per second
   * How quickly frequency approaches the flow wave frequency
   */
  frequencyDecayRate: 0.75,

  /**
   * Speed decay rate per second
   * How quickly speed approaches the flow wave speed
   */
  speedDecayRate: 0.75,

  /**
   * Minimum amplitude threshold for wave removal
   * Waves below this value will be removed
   */
  minAmplitudeThreshold: 0.01,

  /**
   * Amplitude proximity threshold (as percentage of flow amplitude)
   * If wave amplitude is within this percentage of flow amplitude, it can be removed
   * 0.1 = 10% of flow amplitude
   */
  amplitudeProximityThreshold: 0.1,

  /**
   * Frequency proximity threshold
   * If wave frequency is within this value of flow frequency, it can be removed
   */
  frequencyProximityThreshold: 0.5,

  /**
   * Speed proximity threshold
   * If wave speed is within this value of flow speed, it can be removed
   */
  speedProximityThreshold: 0.01,
} as const;
