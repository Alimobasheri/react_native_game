import {
  pickBiasCenter,
  pickFastChicaneRowCap,
  resolveOpeningFlowParams,
} from '@/Game/path/openingArchetype';
import { runProgressionTuning } from '@/config/runProgression';

describe('pickBiasCenter', () => {
  it('left bias on 8 cols stays in centers 1–2', () => {
    for (let seed = 0; seed < 200; seed++) {
      const c = pickBiasCenter('left', seed, 8);
      expect(c).toBeGreaterThanOrEqual(1);
      expect(c).toBeLessThanOrEqual(2);
    }
  });

  it('right bias on 8 cols stays in centers 5–6', () => {
    for (let seed = 0; seed < 200; seed++) {
      const c = pickBiasCenter('right', seed, 8);
      expect(c).toBeGreaterThanOrEqual(5);
      expect(c).toBeLessThanOrEqual(6);
    }
  });

  it('left bias on 9 cols stays in centers 1–2', () => {
    for (let seed = 0; seed < 200; seed++) {
      const c = pickBiasCenter('left', seed, 9);
      expect(c).toBeGreaterThanOrEqual(1);
      expect(c).toBeLessThanOrEqual(2);
    }
  });

  it('right bias on 9 cols stays in centers 6–7', () => {
    for (let seed = 0; seed < 200; seed++) {
      const c = pickBiasCenter('right', seed, 9);
      expect(c).toBeGreaterThanOrEqual(6);
      expect(c).toBeLessThanOrEqual(7);
    }
  });

  it('is deterministic for the same runSeed', () => {
    expect(pickBiasCenter('left', 42, 8)).toBe(pickBiasCenter('left', 42, 8));
    expect(pickBiasCenter('right', 99, 9)).toBe(pickBiasCenter('right', 99, 9));
  });
});

describe('pickFastChicaneRowCap', () => {
  it('always returns 3–5', () => {
    for (let seed = 0; seed < 500; seed++) {
      const cap = pickFastChicaneRowCap(seed);
      expect(cap).toBeGreaterThanOrEqual(runProgressionTuning.FAST_CHICANE_CHUTE_ROWS_MIN);
      expect(cap).toBeLessThanOrEqual(runProgressionTuning.FAST_CHICANE_CHUTE_ROWS_MAX);
    }
  });

  it('is deterministic for the same runSeed', () => {
    expect(pickFastChicaneRowCap(12345)).toBe(pickFastChicaneRowCap(12345));
  });
});

describe('resolveOpeningFlowParams', () => {
  it('warmChute has no overrides', () => {
    expect(resolveOpeningFlowParams('warmChute', 1, 8)).toEqual({});
  });

  it('leftBias provides seedCenter only', () => {
    const p = resolveOpeningFlowParams('leftBias', 7, 8);
    expect(p.seedCenter).toBeGreaterThanOrEqual(1);
    expect(p.seedCenter).toBeLessThanOrEqual(2);
    expect(p.chuteRowsTargetOverride).toBeUndefined();
  });

  it('rightBias provides seedCenter only', () => {
    const p = resolveOpeningFlowParams('rightBias', 7, 9);
    expect(p.seedCenter).toBeGreaterThanOrEqual(6);
    expect(p.seedCenter).toBeLessThanOrEqual(7);
    expect(p.chuteRowsTargetOverride).toBeUndefined();
  });

  it('fastChicane provides chuteRowsTargetOverride only', () => {
    const p = resolveOpeningFlowParams('fastChicane', 99, 8);
    expect(p.seedCenter).toBeUndefined();
    expect(p.chuteRowsTargetOverride).toBeGreaterThanOrEqual(3);
    expect(p.chuteRowsTargetOverride).toBeLessThanOrEqual(5);
  });

  it('breather caps chute to full opening budget', () => {
    const p = resolveOpeningFlowParams('breather', 1, 8);
    expect(p.chuteRowsTargetOverride).toBe(
      runProgressionTuning.BREATHER_CHUTE_ROWS_OVERRIDE
    );
    expect(p.seedCenter).toBeUndefined();
  });
});
