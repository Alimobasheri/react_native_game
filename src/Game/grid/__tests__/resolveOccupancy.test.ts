import { composePressIntroShaft } from '@/Game/path/platformShaft/composePressIntroShaft';
import {
  resolvePlatformSlabOccupancy,
  unionBlockedCols,
} from '@/Game/grid/resolveOccupancy';
import { effectiveGapsAtPressPhase } from '@/Game/hazards/platformPressMotion';
import { TEST_COLS, asPlatformSlabHazard } from '@/Game/path/__tests__/testGrid';

describe('resolveOccupancy', () => {
  const result = composePressIntroShaft({ seed: 42, difficulty01: 0.4, columns: TEST_COLS });
  const hazard = asPlatformSlabHazard(result.hazards[0]);
  const rowIndex = hazard.bounds.rowStart;
  const baseGaps = result.rows[rowIndex].gaps;
  const duration = hazard.params.pressDurationSec ?? 1.4;

  it('returns null outside hazard band', () => {
    expect(
      resolvePlatformSlabOccupancy({
        baseGaps,
        hazard,
        beatRow: rowIndex - 1,
        localSec: 1,
        columns: TEST_COLS,
      })
    ).toBeNull();
  });

  it('matches effectiveGapsAtPressPhase at full press', () => {
    const occ = resolvePlatformSlabOccupancy({
      baseGaps,
      hazard,
      beatRow: rowIndex,
      localSec: duration * 2,
      columns: TEST_COLS,
    });
    const expected = effectiveGapsAtPressPhase(
      baseGaps,
      hazard,
      rowIndex,
      TEST_COLS,
      duration * 2
    );
    expect(occ?.effectiveGaps).toEqual(expected);
  });

  it('unionBlockedCols deduplicates', () => {
    expect(unionBlockedCols([1, 2], [2, 3])).toEqual([1, 2, 3]);
  });
});
