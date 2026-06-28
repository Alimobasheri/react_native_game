import { runProgressionTuning } from '@/config/runProgression';
import { generateMultiPathGapsDeterministic } from '@/Game/path/proceduralGaps';
import { validateSeam } from '@/Game/path/pacingDirector';
import { finalizeGapsForObstacleRow, rowFromGaps } from '@/Game/path/swimmerGrid';
import { TEST_COLS } from '@/Game/path/__tests__/testGrid';

function simulateEarlyForkOpeningRows(
  rowCount: number,
  pathRunId = 42
): number[][] {
  const gapRows: number[][] = [];
  let prevGaps: number[] | undefined;

  for (let stream = 0; stream < rowCount; stream++) {
    let gaps = generateMultiPathGapsDeterministic(
      prevGaps ?? [],
      TEST_COLS,
      stream,
      pathRunId,
      'flow',
      stream,
      stream
    );
    gaps = finalizeGapsForObstacleRow(prevGaps ?? null, gaps, TEST_COLS);
    gapRows.push(gaps);
    prevGaps = gaps;
  }
  return gapRows;
}

describe('earlyFork opening multipath simulation', () => {
  const rowCount = runProgressionTuning.OPENING_ARCHETYPE_MAX_ROWS;

  it('produces valid vertical seams for full opening budget', () => {
    const rows = simulateEarlyForkOpeningRows(rowCount);
    expect(rows).toHaveLength(rowCount);
    for (let i = 1; i < rows.length; i++) {
      expect(
        validateSeam(rowFromGaps(rows[i - 1]!, TEST_COLS), rowFromGaps(rows[i]!, TEST_COLS))
      ).toBe(true);
    }
  });

  it('shows multipath fork read on at least one row', () => {
    const rows = simulateEarlyForkOpeningRows(rowCount, 777);
    const hasForkRead = rows.some((gaps) => gaps.length >= 2);
    expect(hasForkRead).toBe(true);
  });

  it('every row has at least one passable gap column', () => {
    const rows = simulateEarlyForkOpeningRows(rowCount);
    for (const gaps of rows) {
      expect(gaps.length).toBeGreaterThan(0);
    }
  });
});
