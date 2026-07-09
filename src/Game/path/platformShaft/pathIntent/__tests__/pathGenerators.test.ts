import { platformShaftTuning } from '@/config/platformShaftTuning';
import {
  composePathChicane,
  pathRowsToRestRowDefs,
  wideGapColsForDifficulty,
} from '@/Game/path/platformShaft/pathIntent/pathGenerators';
import { validatePathOverlap } from '@/Game/path/platformShaft/pathIntent/pathOverlap';
import { minGapWidthCols } from '@/Game/path/platformShaft/primitives';
import { TEST_COLS } from '@/Game/path/__tests__/testGrid';

describe('composePathChicane', () => {
  const columns = TEST_COLS;

  it('uses 6-column grid with wide gaps at easy difficulty', () => {
    expect(columns).toBe(6);
    const wide = wideGapColsForDifficulty(0);
    expect(wide).toBe(platformShaftTuning.WIDE_GAP_COLS_EASY);
    const result = composePathChicane({ seed: 42, difficulty01: 0, columns, rowCount: 40 });
    expect(result.pathRows.length).toBe(40);
    expect(result.meta.recipeId).toBe('pathChicanePreview');
    for (let i = 0; i < result.pathRows.length; i++) {
      expect(result.pathRows[i]!.wideGaps.length).toBeGreaterThanOrEqual(wide);
      expect(result.pathRows[i]!.narrowGaps.length).toBe(1);
    }
  });

  it('maintains SH-005 overlap on wide gaps row-to-row', () => {
    const result = composePathChicane({ seed: 7, difficulty01: 0.3, columns, rowCount: 40 });
    expect(validatePathOverlap(result.pathRows, 1)).toBe(true);
  });

  it('path center drifts over chicane segment', () => {
    const result = composePathChicane({
      seed: 0,
      difficulty01: 0,
      columns,
      rowCount: 40,
      applyCeilingPins: false,
    });
    const centers = result.pathRows.map((r) => r.pathCenterCol);
    const min = Math.min(...centers);
    const max = Math.max(...centers);
    expect(max - min).toBeGreaterThan(0);
  });

  it('authors shaftSide from path position for each row', () => {
    const result = composePathChicane({
      seed: 42,
      difficulty01: 0.2,
      columns,
      rowCount: 40,
      applyCeilingPins: false,
    });
    const mid = (columns - 1) / 2;

    let sawLeft = false;
    let sawRight = false;
    for (const row of result.pathRows) {
      expect(row.shaftSide).toBeDefined();
      const expected = row.pathCenterCol >= mid ? 'left' : 'right';
      expect(row.shaftSide).toBe(expected);
      if (row.shaftSide === 'left') sawLeft = true;
      if (row.shaftSide === 'right') sawRight = true;
    }

    expect(sawLeft).toBe(true);
    expect(sawRight).toBe(true);
  });

  it('ceiling pins can inject static blocks with fixed seed', () => {
    const withPins = composePathChicane({
      seed: 12345,
      difficulty01: 0,
      columns,
      rowCount: 40,
      applyCeilingPins: true,
    });
    const pinnedRows = withPins.pathRows.filter((r) => (r.staticBlocks?.length ?? 0) > 0);
    expect(pinnedRows.length).toBeGreaterThan(0);
  });

  it('rest row defs preserve wide playable gaps', () => {
    const result = composePathChicane({ seed: 1, columns, rowCount: 10 });
    const defs = pathRowsToRestRowDefs(result.pathRows, columns);
    expect(defs.length).toBe(10);
    for (let i = 0; i < defs.length; i++) {
      expect(minGapWidthCols(defs[i]!.gaps)).toBeGreaterThanOrEqual(3);
    }
  });
});
