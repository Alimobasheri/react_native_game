import { multipathGapWidthParamsFromTotalRows } from '@/config/gapDifficultyRamp';
import { generateMultiPathGapsDeterministic } from '@/Game/path/proceduralGaps';
import { groupGapsToRanges } from '@/Game/water/gapRanges';

describe('multipathGapWidthParamsFromTotalRows (fraction-based)', () => {
  it('keeps 9-column flow readable (early vs late)', () => {
    const rowLength = 9;
    const seed = 0;

    const early = multipathGapWidthParamsFromTotalRows(0, rowLength, seed);
    expect(early.minW).toBeLessThanOrEqual(3);
    expect(early.maxW).toBeLessThanOrEqual(5);

    const late = multipathGapWidthParamsFromTotalRows(2400, rowLength, seed);
    expect(late.minW).toBeLessThanOrEqual(2);
    expect(late.maxW).toBeLessThanOrEqual(3);
  });

  it('does not degenerate on 15 columns', () => {
    const rowLength = 15;
    const seed = 0;
    const early = multipathGapWidthParamsFromTotalRows(0, rowLength, seed);
    expect(early.minW).toBeGreaterThanOrEqual(3);
    expect(early.maxW).toBeGreaterThanOrEqual(4);
  });
});

describe('generateMultiPathGapsDeterministic', () => {
  it('row 0 on 9 columns is not an overly wide highway', () => {
    const rowLength = 9;
    const gaps = generateMultiPathGapsDeterministic(
      [],
      rowLength,
      0,
      0,
      'flow',
      0,
      0
    );
    expect(gaps.length).toBeLessThanOrEqual(4);
  });

  it('occasionally produces multiple ranges on 9 columns for some seeds', () => {
    const rowLength = 9;
    let sawMulti = false;

    for (let pathRunId = 0; pathRunId < 40 && !sawMulti; pathRunId++) {
      let prev: number[] = [];
      for (let rowIndex = 0; rowIndex < 60; rowIndex++) {
        const gaps = generateMultiPathGapsDeterministic(
          prev,
          rowLength,
          rowIndex,
          pathRunId,
          'flow',
          rowIndex,
          rowIndex
        );
        const ranges = groupGapsToRanges(gaps, rowLength);
        if (ranges.length >= 2) {
          sawMulti = true;
          break;
        }
        prev = gaps;
      }
    }

    expect(sawMulti).toBe(true);
  });
});

