import { composePathChicaneShaft } from '@/Game/path/platformShaft/composePathChicaneShaft';
import { composePathChicane } from '@/Game/path/platformShaft/pathIntent/pathGenerators';
import { effectiveGapsAtFullPress, minGapWidthCols, pressWallCol } from '@/Game/path/platformShaft/primitives';
import { platformShaftTuning } from '@/config/platformShaftTuning';
import { TEST_COLS } from '@/Game/path/__tests__/testGrid';

describe('composePathChicaneShaft', () => {
  it('dense hazards after runway; ≥1-col at full press; no seal into opposite blocks', () => {
    const result = composePathChicaneShaft({ seed: 42, difficulty01: 0.2, columns: TEST_COLS });
    const path = composePathChicane({
      seed: 42,
      difficulty01: 0.2,
      columns: TEST_COLS,
    });
    expect(result.rows.length).toBe(40);
    expect(result.hazards.length).toBeGreaterThanOrEqual(20);
    expect(result.hazards.length).toBeLessThanOrEqual(32);
    expect(result.hazards[0]!.bounds.rowStart).toBeGreaterThanOrEqual(
      platformShaftTuning.PATH_SHAFT_START_ROW
    );

    for (const hz of result.hazards) {
      const wallCol = pressWallCol(TEST_COLS, hz.side);
      expect(hz.side).toBe(path.pathRows[hz.bounds.rowStart]!.shaftSide);
      expect(hz.bounds.colStart).toBe(wallCol);
      expect(hz.bounds.colEnd).toBe(wallCol);
      expect(hz.params.animStartRow!).toBeLessThanOrEqual(hz.bounds.rowStart);
    }

    for (let i = 0; i < result.rows.length; i++) {
      const hz = result.hazards.find(
        (h) => i >= h.bounds.rowStart && i <= h.bounds.rowEnd
      );
      if (!hz) continue;
      const baseGaps = result.rows[i]!.gaps;
      const baseBlocks = result.rows[i]!.blocks ?? [];
      const wallCol = pressWallCol(TEST_COLS, hz.side);
      const full = effectiveGapsAtFullPress(baseGaps, hz, i, TEST_COLS);
      expect(minGapWidthCols(full)).toBeGreaterThanOrEqual(1);
      expect(baseGaps).toContain(wallCol);
      expect(baseBlocks).not.toContain(wallCol);
    }
  });
});
