import { gapDifficultyRampTuning, pacingCycleLayoutFromCycleStart } from '@/config/gapDifficultyRamp';
import {
  applyCyclePersonality,
  resolveCycleLayout,
  resolvePacingRunContext,
} from '@/Game/path/cyclePersonality';
import { createFixedFirstRunBlueprint, rollRunBlueprint } from '@/Game/path/runBlueprint';

describe('resolvePacingRunContext', () => {
  it('forces runSeed 0 for attempt 1 but keeps blueprintRunSeed for signature', () => {
    const bp = createFixedFirstRunBlueprint(42, 1);
    const ctx = resolvePacingRunContext(bp, 1);
    expect(ctx?.runSeed).toBe(0);
    expect(ctx?.blueprintRunSeed).toBe(bp.runSeed);
    expect(ctx?.signaturePatternPool).toEqual(['pinballHop']);
    expect(ctx?.cyclePersonality).toBe('flowHeavy');
    expect(ctx?.climaxPreference).toBe('mixed');
  });

  it('uses blueprint runSeed for attempt >= 2', () => {
    const bp = rollRunBlueprint({ sessionSeed: 99, runAttemptIndex: 2 });
    const ctx = resolvePacingRunContext(bp, 2);
    expect(ctx?.runSeed).toBe(bp.runSeed);
    expect(ctx?.runSeed).not.toBe(0);
  });

  it('returns undefined when blueprint is missing', () => {
    expect(resolvePacingRunContext(undefined, 1)).toBeUndefined();
  });
});

describe('applyCyclePersonality', () => {
  const base = pacingCycleLayoutFromCycleStart(0, 0);

  it('flowHeavy increases FLOW and decreases TENSION on cycle 1', () => {
    const adjusted = applyCyclePersonality(base, 'flowHeavy', 0, 12345);
    expect(adjusted.flowRows).toBeGreaterThan(base.flowRows);
    expect(adjusted.tensionRows).toBeLessThan(base.tensionRows);
    expect(adjusted.climaxRows).toBe(base.climaxRows);
    expect(adjusted.releaseRows).toBe(base.releaseRows);
  });

  it('tensionEarly shortens FLOW on cycle 1', () => {
    const adjusted = applyCyclePersonality(base, 'tensionEarly', 0, 777);
    expect(adjusted.flowRows).toBeLessThan(base.flowRows);
  });

  it('shortRelease clamps RELEASE to hard minimum on cycle 1', () => {
    const adjusted = applyCyclePersonality(base, 'shortRelease', 0, 1);
    expect(adjusted.releaseRows).toBe(gapDifficultyRampTuning.RELEASE_PHASE_ROWS_HARD_MIN);
  });

  it('climaxForward leaves row budgets unchanged', () => {
    const adjusted = applyCyclePersonality(base, 'climaxForward', 0, 1);
    expect(adjusted).toEqual(base);
  });

  it('does not adjust cycle 2+ layouts', () => {
    const layoutCycle2 = pacingCycleLayoutFromCycleStart(120, 999);
    const adjusted = applyCyclePersonality(layoutCycle2, 'flowHeavy', 120, 999);
    expect(adjusted).toEqual(layoutCycle2);
  });

  it('is deterministic for the same runSeed', () => {
    const a = applyCyclePersonality(base, 'flowHeavy', 0, 0xbeef);
    const b = applyCyclePersonality(base, 'flowHeavy', 0, 0xbeef);
    expect(a).toEqual(b);
  });
});

describe('resolveCycleLayout', () => {
  it('differs from baseline when flowHeavy ctx is present on cycle 0', () => {
    const baseline = pacingCycleLayoutFromCycleStart(0, 0);
    const withCtx = resolveCycleLayout(0, {
      runSeed: 555,
      cyclePersonality: 'flowHeavy',
      climaxPreference: 'mixed',
    });
    expect(withCtx.flowRows).toBeGreaterThan(baseline.flowRows);
  });

  it('matches baseline layout for cycle 2 start regardless of ctx', () => {
    const cursor = 100;
    const baseline = pacingCycleLayoutFromCycleStart(cursor, 0);
    const withCtx = resolveCycleLayout(cursor, {
      runSeed: 555,
      cyclePersonality: 'flowHeavy',
      climaxPreference: 'pinball',
    });
    expect(withCtx).toEqual(baseline);
  });

  it('runSeed affects cycle 0 picks when attempt >= 2', () => {
    const a = pacingCycleLayoutFromCycleStart(0, 111);
    const b = pacingCycleLayoutFromCycleStart(0, 222);
    expect(a).not.toEqual(b);
  });

  it('runSeed 0 on attempt 1 yields identical cycle 0 layout across sessions', () => {
    const a = resolveCycleLayout(0, {
      runSeed: 0,
      cyclePersonality: 'flowHeavy',
      climaxPreference: 'mixed',
    });
    const b = resolveCycleLayout(0, {
      runSeed: 0,
      cyclePersonality: 'flowHeavy',
      climaxPreference: 'mixed',
    });
    expect(a).toEqual(b);
  });
});
