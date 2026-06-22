import {
  sampleIdleSurfaceOffset,
  sampleIdleSurfaceProfile,
} from '@/Game/water/surfaceProfile';
import { swimmerWaterLightingTuning } from '@/config/swimmerWaterLightingTuning';

describe('surfaceProfile', () => {
  it('keeps idle wave amplitude within configured cap', () => {
    const samples = 48;
    for (let i = 0; i < samples; i++) {
      const x = i / (samples - 1);
      const offset = sampleIdleSurfaceOffset(x, 12.5);
      expect(Math.abs(offset)).toBeLessThanOrEqual(
        swimmerWaterLightingTuning.idleMaxCombinedAmplitude + 1e-6
      );
    }
  });

  it('produces a smooth profile without sharp spikes', () => {
    const heights = sampleIdleSurfaceProfile(32, 4.2);
    for (let i = 1; i < heights.length - 1; i++) {
      const left = heights[i - 1];
      const center = heights[i];
      const right = heights[i + 1];
      const neighborAvg = (left + right) * 0.5;
      expect(Math.abs(center - neighborAvg)).toBeLessThan(0.0025);
    }
  });

  it('stays stable across a long idle cycle window', () => {
    const start = sampleIdleSurfaceOffset(0.42, 0);
    const mid = sampleIdleSurfaceOffset(0.42, 18.5);
    const end = sampleIdleSurfaceOffset(0.42, 37);
    expect(Math.abs(start - mid)).toBeLessThan(
      swimmerWaterLightingTuning.idleMaxCombinedAmplitude * 2
    );
    expect(Math.abs(mid - end)).toBeLessThan(
      swimmerWaterLightingTuning.idleMaxCombinedAmplitude * 2
    );
  });
});
