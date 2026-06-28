import { runProgressionTuning } from '@/config/runProgression';
import { getPacingCycleState } from '@/Game/path/pacingDirector';
import {
  createSignaturePinballHopState,
  climaxPinballStep,
} from '@/Game/path/climaxGenerators';
import { createFixedFirstRunBlueprint } from '@/Game/path/runBlueprint';
import { resolvePacingRunContext } from '@/Game/path/cyclePersonality';
import {
  macroCycleIndex1Based,
  resolveSignaturePattern,
  signaturePinballRowBudget,
} from '@/Game/path/signatureCadence';
import { validateSeam } from '@/Game/path/pacingDirector';
import { gapsFromRow, rowFromGaps, finalizeGapsForObstacleRow } from '@/Game/path/swimmerGrid';
import { TEST_COLS } from '@/Game/path/__tests__/testGrid';

function cycle2ClimaxStartRow(pacingCtx?: ReturnType<typeof resolvePacingRunContext>): number {
  const L1 = getPacingCycleState(0, pacingCtx).cycleTotalRows;
  const layout2 = getPacingCycleState(L1, pacingCtx);
  return L1 + layout2.flowRows + layout2.tensionRows;
}

describe('signature pinballHop routing simulation', () => {
  it('emits 20 signature rows at cycle 2 CLIMAX with vertical seam every step', () => {
    const bp = createFixedFirstRunBlueprint(42, 1);
    const pacingCtx = resolvePacingRunContext(bp, 1);
    const climaxStart = cycle2ClimaxStartRow(pacingCtx);
    expect(macroCycleIndex1Based(climaxStart, pacingCtx)).toBe(2);
    expect(resolveSignaturePattern(
      {
        runSeed: pacingCtx!.blueprintRunSeed,
        signaturePatternPool: pacingCtx!.signaturePatternPool,
        firstSignatureAtCycle: pacingCtx!.firstSignatureAtCycle,
        signatureEveryNCycles: pacingCtx!.signatureEveryNCycles,
      },
      2
    )).toBe('pinballHop');

    const budget = signaturePinballRowBudget();
    expect(budget).toBe(20);

    let prevGaps = [3, 4];
    let prevRow = rowFromGaps(prevGaps, TEST_COLS);
    let state = createSignaturePinballHopState(prevGaps, TEST_COLS, 0xabc);
    const lefts: number[] = [];

    for (let i = 0; i < budget; i++) {
      const { row, state: next } = climaxPinballStep(state, TEST_COLS);
      state = next;
      const rawGaps = gapsFromRow(row);
      const gaps = finalizeGapsForObstacleRow(prevGaps, rawGaps, TEST_COLS);
      const patched = rowFromGaps(gaps, TEST_COLS);
      expect(validateSeam(prevRow, patched)).toBe(true);
      lefts.push(gaps[0] ?? -1);
      prevRow = patched;
      prevGaps = gaps;
    }

    expect(lefts.length).toBe(budget);
    expect(new Set(lefts).size).toBeGreaterThanOrEqual(3);
    const firstHopLeft = lefts[4];
    expect(firstHopLeft === 0 || firstHopLeft === TEST_COLS - 2).toBe(true);
    expect(state.signatureDriftPattern).toEqual(
      runProgressionTuning.SIGNATURE_PINBALL_DRIFT_PATTERN
    );
  });
});
