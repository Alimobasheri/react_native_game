import {
  pathSegmentClimaxFalseWallSoloRows,
  pathSegmentClimaxFalseWallTotalRows,
  pathSegmentClimaxPinballSegmentRows,
} from '@/config/gapDifficultyRamp';
import { runProgressionTuning } from '@/config/runProgression';

describe('climaxPreference segment sizing', () => {
  const stream = 0;
  const varianceU32 = 0x1234;
  const climaxBudget = 40;

  it('solo false wall is ~4x base segment, clamped to climax budget minus tail', () => {
    const base = pathSegmentClimaxFalseWallTotalRows(stream, varianceU32, climaxBudget);
    const solo = pathSegmentClimaxFalseWallSoloRows(stream, varianceU32, climaxBudget);
    const expectedCap = climaxBudget - runProgressionTuning.CLIMAX_FALSE_WALL_SOLO_TAIL_ROWS;
    expect(solo).toBe(Math.min(base * runProgressionTuning.CLIMAX_FALSE_WALL_SOLO_MULTIPLIER, expectedCap));
    expect(solo).toBeGreaterThan(base);
  });

  it('chained false wall after pinball uses remaining budget, not solo multiplier', () => {
    const pinCap = pathSegmentClimaxPinballSegmentRows(stream, varianceU32, climaxBudget);
    const chained = pathSegmentClimaxFalseWallTotalRows(
      stream,
      varianceU32,
      climaxBudget,
      pinCap
    );
    const solo = pathSegmentClimaxFalseWallSoloRows(stream, varianceU32, climaxBudget);
    expect(chained).toBeLessThan(solo);
    expect(chained).toBeLessThanOrEqual(climaxBudget - pinCap);
  });

  it('pinball segment fits within climax budget with tail room', () => {
    const pinCap = pathSegmentClimaxPinballSegmentRows(stream, varianceU32, climaxBudget);
    expect(pinCap).toBeLessThan(climaxBudget);
  });
});
