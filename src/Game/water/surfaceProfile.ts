import { swimmerWaterLightingTuning } from '@/config/swimmerWaterLightingTuning';
import type { SwimmerWaterLightingTuning } from '@/config/swimmerWaterLightingTuning';

const TWO_PI = Math.PI * 2;

/**
 * Procedural idle surface offset in container UV space (0 = bottom, 1 = top).
 * Mirrors the GLSL `computeIdleSurfaceOffset` used by the water shader.
 */
export function sampleIdleSurfaceOffset(
  xNorm: number,
  timeSec: number,
  tuning: SwimmerWaterLightingTuning = swimmerWaterLightingTuning
): number {
  'worklet';
  const x = Math.max(0, Math.min(1, xNorm));
  const mainWave =
    Math.sin(x * tuning.idleWaveSpatialFreq * TWO_PI + timeSec * tuning.idleWaveSpeed) *
    tuning.idleWaveAmplitude;
  const secondaryWave =
    Math.sin(
      x * tuning.secondaryWaveSpatialFreq * TWO_PI -
        timeSec * tuning.secondaryWaveSpeed +
        1.7
    ) * tuning.secondaryWaveAmplitude;
  const breathing =
    Math.sin(timeSec * tuning.idleBreathingSpeed) * tuning.idleBreathingAmount;
  const combined = mainWave + secondaryWave + breathing;
  return Math.max(
    -tuning.idleMaxCombinedAmplitude,
    Math.min(tuning.idleMaxCombinedAmplitude, combined)
  );
}

/** Sample surface height at evenly spaced points for smoothing validation. */
export function sampleIdleSurfaceProfile(
  sampleCount: number,
  timeSec: number,
  tuning: SwimmerWaterLightingTuning = swimmerWaterLightingTuning
): number[] {
  'worklet';
  const count = Math.max(2, Math.floor(sampleCount));
  const heights: number[] = [];
  for (let i = 0; i < count; i++) {
    const x = i / (count - 1);
    heights.push(sampleIdleSurfaceOffset(x, timeSec, tuning));
  }
  return heights;
}
