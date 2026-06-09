import {
  hasVerticalSeam,
  repairGapsVerticalSeamIfNeeded,
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
});
