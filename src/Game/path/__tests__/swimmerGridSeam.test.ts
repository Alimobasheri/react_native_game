import {
  hasVerticalSeam,
  repairGapsVerticalSeamIfNeeded,
  repairGapsEachPrevRunNearNext,
  finalizeGapsForObstacleRow,
  rowFromGaps,
} from '@/Game/path/swimmerGrid';
import { TEST_COLS } from '@/Game/path/__tests__/testGrid';

describe('repairGapsVerticalSeamIfNeeded', () => {
  it('opens a seam when prev gaps only touch margin and next is interior-only', () => {
    const prevGaps = [TEST_COLS - 1];
    const nextGaps = Array.from({ length: TEST_COLS - 2 }, (_, i) => i + 1);
    const merged = repairGapsVerticalSeamIfNeeded(prevGaps, nextGaps, TEST_COLS);
    expect(hasVerticalSeam(rowFromGaps(prevGaps, TEST_COLS), rowFromGaps(merged, TEST_COLS))).toBe(
      true
    );
    expect(merged.includes(TEST_COLS - 1)).toBe(true);
  });

  it('is a no-op when seam already exists', () => {
    const prev = [3, 4, 5];
    const next = [2, 3, 4, 5, 6];
    const merged = repairGapsVerticalSeamIfNeeded(prev, next, TEST_COLS);
    expect(merged.length).toBe(next.length);
    expect(hasVerticalSeam(rowFromGaps(prev, TEST_COLS), rowFromGaps(merged, TEST_COLS))).toBe(
      true
    );
  });
});

describe('repairGapsEachPrevRunNearNext', () => {
  it('forces a next-row gap on the same column as a singleton prev run (not only near it)', () => {
    const prev = [5];
    const next = [3];
    const merged = repairGapsEachPrevRunNearNext(prev, next, 9);
    expect(merged).toContain(5);
  });

  it('adds a gap inside a prev island when next row only lines up with a different island', () => {
    const prev = [1, 2, 3, 5, 6];
    const next = [5, 6];
    const merged = repairGapsEachPrevRunNearNext(prev, next, TEST_COLS);
    expect(merged.includes(5) || merged.includes(6)).toBe(true);
    let okLeft = false;
    for (let c = 0; c <= 4; c++) {
      if (merged.includes(c)) {
        okLeft = true;
        break;
      }
    }
    expect(okLeft).toBe(true);
  });

  it('does not treat a next gap one column past the run end as serving that run', () => {
    const prev = [5, 6];
    const next = [7];
    const merged = repairGapsEachPrevRunNearNext(prev, next, 10);
    expect(merged.includes(5) || merged.includes(6)).toBe(true);
  });
});

describe('finalizeGapsForObstacleRow', () => {
  it('drops out-of-range indices then ensures a seam vs prev', () => {
    const prev = [2];
    const raw = [-1, 99, 2.4, 2];
    const g = finalizeGapsForObstacleRow(prev, raw, TEST_COLS);
    expect(g).toContain(2);
    expect(hasVerticalSeam(rowFromGaps(prev, TEST_COLS), rowFromGaps(g, TEST_COLS))).toBe(true);
  });

  it('uses center fallback when all gap indices are invalid', () => {
    const g = finalizeGapsForObstacleRow(undefined, [-5, 200], TEST_COLS);
    expect(g.length).toBeGreaterThan(0);
    expect(g[0]).toBeGreaterThanOrEqual(0);
    expect(g[0]).toBeLessThan(TEST_COLS);
  });

  it('keeps each prev gap island with a next-row gap in the same column interval [lo, hi]', () => {
    const COLS9 = 9;
    const prev = [1, 2, 6, 7];
    const raw = [6, 7];
    const g = finalizeGapsForObstacleRow(prev, raw, COLS9);
    expect(hasVerticalSeam(rowFromGaps(prev, COLS9), rowFromGaps(g, COLS9))).toBe(true);
    const runs = [
      [1, 2],
      [6, 7],
    ] as const;
    for (const [lo, hi] of runs) {
      let inRun = false;
      for (let c = lo; c <= hi; c++) {
        if (g.includes(c)) {
          inRun = true;
          break;
        }
      }
      expect(inRun).toBe(true);
    }
  });
});
