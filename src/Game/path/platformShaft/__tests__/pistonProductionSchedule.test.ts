import { pistonHazardTuning } from '@/config/pistonHazardTuning';
import { gapDifficultyRampTuning } from '@/config/gapDifficultyRamp';
import {
  decidePistonProductionInsert,
  isPistonEligibleMacroPhase,
  pistonInsertWeight01,
} from '@/Game/path/platformShaft/pistonProductionSchedule';

describe('pistonProductionSchedule', () => {
  it('weight is 0 below difficulty threshold', () => {
    expect(pistonInsertWeight01(0)).toBe(0);
    expect(pistonInsertWeight01(pistonHazardTuning.MIN_DIFFICULTY_01 - 0.01)).toBe(
      0
    );
  });

  it('weight rises after threshold', () => {
    const mid = pistonInsertWeight01(0.7);
    const high = pistonInsertWeight01(1);
    expect(mid).toBeGreaterThan(0);
    expect(high).toBeGreaterThanOrEqual(mid);
  });

  it('rejects insert before difficulty threshold', () => {
    const decision = decidePistonProductionInsert({
      totalRowsGenerated: 1,
      runSeed: 42,
      lastInsertTotalRows: -1,
    });
    expect(decision.insert).toBe(false);
  });

  it('guarantees a floor piston after the first live-path delay', () => {
    const before = decidePistonProductionInsert({
      totalRowsGenerated: 1,
      runSeed: 42,
      lastInsertTotalRows: -1,
      gameplayElapsedSeconds:
        pistonHazardTuning.FIRST_PRODUCTION_INSERT_DELAY_SEC - 0.01,
    });
    const due = decidePistonProductionInsert({
      totalRowsGenerated: 1,
      runSeed: 42,
      lastInsertTotalRows: -1,
      gameplayElapsedSeconds:
        pistonHazardTuning.FIRST_PRODUCTION_INSERT_DELAY_SEC,
    });

    expect(before.insert).toBe(false);
    expect(due).toEqual({ insert: true, recipe: 'pistonFloor' });
  });

  it('is deterministic for same seed and row', () => {
    const rows = Math.ceil(
      gapDifficultyRampTuning.ROWS_FOR_FULL_RAMP *
        pistonHazardTuning.MIN_DIFFICULTY_01
    ) + 20;
    const a = decidePistonProductionInsert({
      totalRowsGenerated: rows,
      runSeed: 99,
      lastInsertTotalRows: -1,
    });
    const b = decidePistonProductionInsert({
      totalRowsGenerated: rows,
      runSeed: 99,
      lastInsertTotalRows: -1,
    });
    expect(a).toEqual(b);
  });

  it('FLOW is eligible; RELEASE is not', () => {
    expect(isPistonEligibleMacroPhase('FLOW', 0)).toBe(true);
    expect(isPistonEligibleMacroPhase('RELEASE', 0)).toBe(false);
    expect(isPistonEligibleMacroPhase('CLIMAX', 0)).toBe(false);
  });

  it('respects cooldown between inserts', () => {
    const rows = Math.ceil(
      gapDifficultyRampTuning.ROWS_FOR_FULL_RAMP *
        pistonHazardTuning.MIN_DIFFICULTY_01
    ) + 50;
    // Force many seeds; at least verify cooldown blocks when last insert is recent.
    const blocked = decidePistonProductionInsert({
      totalRowsGenerated: rows,
      runSeed: 1,
      lastInsertTotalRows: rows - 5,
      minRowsBetweenInserts: 40,
    });
    expect(blocked.insert).toBe(false);
  });
});
