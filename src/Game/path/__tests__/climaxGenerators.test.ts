import { validateSeam } from '@/Game/path/pacingDirector';
import { mixU32 } from '@/Game/path/deterministicMix';
import {
  CLIMAX_FALSE_WALL_ROWS,
  CLIMAX_PINBALL_SEGMENT_ROWS,
  climaxClampTwoWideLeft,
  climaxFalseWallFullWidthGapRow,
  climaxFalseWallRow,
  climaxFalseWallSegmentCount,
  climaxPinballDriftDeltaFromSeed,
  climaxPinballInitialAnchor,
  climaxPinballRepairHopOverlap,
  climaxPinballStep,
  climaxRowHasGap,
  createClimaxPinballRollState,
} from '@/Game/path/climaxGenerators';
import {
  FALSE_WALL_MIN_CAVERN_ROWS_BEFORE_SQUEEZE,
  FALSE_WALL_MIN_PHASE_ROWS_SINGLE_SEGMENT,
} from '@/Layout';
import { gapsFromRow, rowFromGaps, unionMinimalSeam } from '@/Game/path/swimmerGrid';

const COLS = 15;
const MIN_CAVERN = FALSE_WALL_MIN_CAVERN_ROWS_BEFORE_SQUEEZE;
const MIN_PHASE = FALSE_WALL_MIN_PHASE_ROWS_SINGLE_SEGMENT;

describe('climaxPinballRepairHopOverlap', () => {
  it('always returns a 2-wide interval overlapping prev 2-wide', () => {
    for (let prev = 0; prev <= COLS - 2; prev++) {
      for (let raw = -20; raw <= 20; raw++) {
        const left = climaxPinballRepairHopOverlap(raw, prev, COLS);
        expect(left).toBeGreaterThanOrEqual(0);
        expect(left).toBeLessThanOrEqual(COLS - 2);
        const overlap =
          left <= prev + 1 && prev <= left + 1;
        expect(overlap).toBe(true);
      }
    }
  });
});

describe('climaxPinballStep', () => {
  it('matches legacy +1,+1 drift then hop when patternSeed yields +1,+1 and hopMag -5', () => {
    let state = {
      stepMod: 0,
      anchorLeft: 5,
      wanderLeft: 5,
      driftCount: 3,
      patternSeed: 27,
      hopMag: -5,
    };
    const lefts: number[] = [];
    for (let i = 0; i < 4; i++) {
      const { row, state: next } = climaxPinballStep(state, COLS);
      state = next;
      const g = gapsFromRow(row);
      expect(g.length).toBe(2);
      expect(g[1]).toBe(g[0] + 1);
      lefts.push(g[0]);
    }
    expect(lefts[0]).toBe(5);
    expect(lefts[1]).toBe(6);
    expect(lefts[2]).toBe(7);
    const hop = lefts[3];
    expect(hop <= lefts[2] + 1 && lefts[2] <= hop + 1).toBe(true);
  });

  it('drift deltas are always in {-1,0,+1}', () => {
    for (let ps = 0; ps < 200; ps++) {
      for (let j = 0; j < 12; j++) {
        const d = climaxPinballDriftDeltaFromSeed(ps, j);
        expect([-1, 0, 1]).toContain(d);
      }
    }
  });
});

describe('climaxFalseWallRow', () => {
  it(`opens columns 2..12 for cavern rows (first segment, R=${MIN_PHASE})`, () => {
    const salt = 0;
    for (let sub = 0; sub < MIN_CAVERN; sub++) {
      const row = climaxFalseWallRow(sub, COLS, MIN_PHASE, salt);
      for (let c = 2; c <= 12; c++) {
        expect(row[c]).toBe(0);
      }
      expect(row[0]).toBe(1);
      expect(row[1]).toBe(1);
      expect(row[13]).toBe(1);
      expect(row[14]).toBe(1);
    }
  });

  it(`squeeze row at end (R=${MIN_PHASE})`, () => {
    const leftSqueeze = climaxFalseWallRow(MIN_PHASE - 1, COLS, MIN_PHASE, 0);
    expect(gapsFromRow(leftSqueeze)).toEqual([1]);
    const rightSqueeze = climaxFalseWallRow(MIN_PHASE - 1, COLS, MIN_PHASE, 2);
    expect(gapsFromRow(rightSqueeze)).toEqual([13]);
  });

  it('extra rows add cavern depth with one segment', () => {
    const total = 10;
    const salt = 0;
    for (let sub = 0; sub < total - 1; sub++) {
      const row = climaxFalseWallRow(sub, COLS, total, salt);
      for (let c = 2; c <= 12; c++) {
        expect(row[c]).toBe(0);
      }
    }
    expect(gapsFromRow(climaxFalseWallRow(total - 1, COLS, total, salt))).toEqual([1]);
  });

  it('R=17 yields two segments and a full-width gap bridge', () => {
    const R = 17;
    const salt = 0;
    expect(climaxFalseWallSegmentCount(R)).toBe(2);
    const full = climaxFalseWallFullWidthGapRow(COLS);
    expect(gapsFromRow(full).length).toBe(COLS);
    expect(gapsFromRow(climaxFalseWallRow(8, COLS, R, salt))).toEqual(gapsFromRow(full));
    expect(gapsFromRow(climaxFalseWallRow(7, COLS, R, salt))).toEqual([13]);
    expect(gapsFromRow(climaxFalseWallRow(16, COLS, R, salt))).toEqual([1]);
  });
});

/**
 * Mirrors ObstacleSystem CLIMAX branch: Pinball (8) → False Wall (min phase rows), with seam union vs previous row.
 */
function simulateClimaxSegment(args: {
  columnCount: number;
  pathRunId: number;
  rowIndexBase: number;
  prevGaps: number[];
}): void {
  const { columnCount, pathRunId, rowIndexBase } = args;
  const initialPrev = [...args.prevGaps];
  if (!initialPrev.length) {
    initialPrev.push(climaxPinballInitialAnchor([], columnCount));
  }
  const prevGaps: number[] = [...initialPrev];
  let prevRow = rowFromGaps(prevGaps, columnCount);
  let pinState = createClimaxPinballRollState(
    initialPrev,
    columnCount,
    mixU32(pathRunId >>> 0, rowIndexBase >>> 0, 0x70696e62)
  );

  for (let i = 0; i < CLIMAX_PINBALL_SEGMENT_ROWS; i++) {
    const { row, state } = climaxPinballStep(pinState, columnCount);
    pinState = state;
    let gaps = gapsFromRow(row);
    if (prevGaps.length) {
      gaps = unionMinimalSeam(prevGaps, gaps, columnCount);
    }
    expect(climaxRowHasGap(rowFromGaps(gaps, columnCount))).toBe(true);
    expect(validateSeam(prevRow, rowFromGaps(gaps, columnCount))).toBe(true);
    prevRow = rowFromGaps(gaps, columnCount);
    prevGaps.length = 0;
    prevGaps.push(...gaps);
  }

  for (let sub = 0; sub < CLIMAX_FALSE_WALL_ROWS; sub++) {
    const fwSalt = mixU32(pathRunId >>> 0, rowIndexBase >>> 0, 0x666c7741);
    const row = climaxFalseWallRow(sub, columnCount, CLIMAX_FALSE_WALL_ROWS, fwSalt);
    let gaps = gapsFromRow(row);
    gaps = unionMinimalSeam(prevGaps, gaps, columnCount);
    const patched = rowFromGaps(gaps, columnCount);
    expect(climaxRowHasGap(patched)).toBe(true);
    expect(validateSeam(prevRow, patched)).toBe(true);
    prevRow = patched;
    prevGaps.length = 0;
    prevGaps.push(...gaps);
  }
}

describe('CLIMAX segment stress (1000 iterations)', () => {
  it('never loses seam or full-wall rows for Pinball + False Wall at margins', () => {
    for (let seg = 0; seg < 1000; seg++) {
      const anchor = seg % 12;
      const prevGaps = [Math.min(anchor, COLS - 1)];
      simulateClimaxSegment({
        columnCount: COLS,
        pathRunId: seg,
        rowIndexBase: seg * 17,
        prevGaps: [...prevGaps],
      });
    }
  });

  it('handles empty prev gaps and extreme anchors', () => {
    for (let seg = 0; seg < 200; seg++) {
      simulateClimaxSegment({
        columnCount: COLS,
        pathRunId: seg + 9000,
        rowIndexBase: seg,
        prevGaps: [],
      });
    }
    for (let col = 0; col < COLS; col++) {
      simulateClimaxSegment({
        columnCount: COLS,
        pathRunId: col,
        rowIndexBase: col * 3,
        prevGaps: [col],
      });
    }
  });
});

describe('climaxClampTwoWideLeft', () => {
  it('clamps to valid 2-wide window', () => {
    expect(climaxClampTwoWideLeft(-99, COLS)).toBe(0);
    expect(climaxClampTwoWideLeft(99, COLS)).toBe(COLS - 2);
  });
});

describe('climaxPinballInitialAnchor', () => {
  it('centers pinball on the widest gap run (not only the leftmost pair)', () => {
    expect(climaxPinballInitialAnchor([2, 3, 10], COLS)).toBe(2);
  });

  it('when all gaps are singles, anchors near the centroid of gaps', () => {
    expect(climaxPinballInitialAnchor([1, 5, 9], COLS)).toBe(4);
  });

  it('with two equal-width islands, default salt picks right island anchor 10', () => {
    expect(climaxPinballInitialAnchor([1, 2, 3, 10, 11, 12], COLS)).toBe(10);
  });

  it('with two equal-width islands, salt can pick the left island', () => {
    expect(climaxPinballInitialAnchor([1, 2, 3, 10, 11, 12], COLS, 0)).toBe(1);
  });
});
