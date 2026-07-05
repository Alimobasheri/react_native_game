import { composePressIntroShaft } from '@/Game/path/platformShaft/composePressIntroShaft';
import {
  gridSpanFromPlatformSlab,
  rowSpanOf,
  validateGridSpan,
} from '@/Game/grid/gridSpan';
import { TEST_COLS } from '@/Game/path/__tests__/testGrid';

describe('gridSpan', () => {
  it('gridSpanFromPlatformSlab maps hazard bounds', () => {
    const result = composePressIntroShaft({ seed: 42, difficulty01: 0.4, columns: TEST_COLS });
    const hazard = result.hazards[0];
    const span = gridSpanFromPlatformSlab(hazard);
    expect(span.rowStart).toBe(hazard.bounds.rowStart);
    expect(span.rowEnd).toBe(hazard.bounds.rowEnd);
    expect(span.colStart).toBe(hazard.bounds.colStart);
    expect(span.colEnd).toBe(hazard.bounds.colEnd);
  });

  it('rowSpanOf returns inclusive row count', () => {
    expect(rowSpanOf({ rowStart: 3, rowEnd: 5, colStart: 1, colEnd: 1 })).toBe(3);
    expect(rowSpanOf({ rowStart: 8, rowEnd: 8, colStart: 4, colEnd: 4 })).toBe(1);
  });

  it('validateGridSpan rejects inverted and OOB spans', () => {
    expect(validateGridSpan({ rowStart: 5, rowEnd: 3, colStart: 0, colEnd: 0 }, 6)).toBe(
      'rowEnd < rowStart'
    );
    expect(validateGridSpan({ rowStart: 0, rowEnd: 1, colStart: 6, colEnd: 6 }, 6)).toBe(
      'column out of bounds'
    );
    expect(validateGridSpan({ rowStart: 0, rowEnd: 2, colStart: 1, colEnd: 2 }, 6)).toBeNull();
  });
});
