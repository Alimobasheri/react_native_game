import {
  hasVerticalSeam,
  repairGapsVerticalSeamIfNeeded,
  repairGapsEachPrevRunNearNext,
  finalizeGapsForObstacleRow,
  rowFromGaps,
} from '@/Game/path/swimmerGrid';

const COLS = 15;

describe('repairGapsVerticalSeamIfNeeded', () => {
  it('opens a seam when prev gaps only touch margin and next is interior-only', () => {
    const prevGaps = [14];
    const nextGaps = Array.from({ length: 13 }, (_, i) => i + 1);
    const merged = repairGapsVerticalSeamIfNeeded(prevGaps, nextGaps, COLS);
    expect(hasVerticalSeam(rowFromGaps(prevGaps, COLS), rowFromGaps(merged, COLS))).toBe(true);
    expect(merged.includes(14)).toBe(true);
  });

  it('is a no-op when seam already exists', () => {
    const prev = [5, 6, 7];
    const next = [3, 4, 5, 6, 7, 8];
    const merged = repairGapsVerticalSeamIfNeeded(prev, next, COLS);
    expect(merged.length).toBe(next.length);
    expect(hasVerticalSeam(rowFromGaps(prev, COLS), rowFromGaps(merged, COLS))).toBe(true);
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
    const prev = [1, 2, 3, 7, 8];
    const next = [7, 8];
    const merged = repairGapsEachPrevRunNearNext(prev, next, COLS);
    expect(merged.includes(7) || merged.includes(8)).toBe(true);
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
    const g = finalizeGapsForObstacleRow(prev, raw, COLS);
    expect(g).toContain(2);
    expect(hasVerticalSeam(rowFromGaps(prev, COLS), rowFromGaps(g, COLS))).toBe(true);
  });

  it('uses center fallback when all gap indices are invalid', () => {
    const g = finalizeGapsForObstacleRow(undefined, [-5, 200], COLS);
    expect(g.length).toBeGreaterThan(0);
    expect(g[0]).toBeGreaterThanOrEqual(0);
    expect(g[0]).toBeLessThan(COLS);
  });

  it('keeps each prev gap island with a next-row gap in the same column interval [lo, hi]', () => {
    const COLS9 = 9;
    const prev = [1, 2, 6, 7];
    const raw = [6, 7];
    const g = finalizeGapsForObstacleRow(prev, raw, COLS9);
    expect(hasVerticalSeam(rowFromGaps(prev, COLS9), rowFromGaps(g, COLS9))).toBe(true);
    const runs = [[1, 2], [6, 7]] as const;
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
