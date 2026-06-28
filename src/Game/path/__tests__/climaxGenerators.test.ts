import { runProgressionTuning } from '@/config/runProgression';
import { validateSeam } from '@/Game/path/pacingDirector';
import { mixU32 } from '@/Game/path/deterministicMix';
import {
  CLIMAX_FALSE_CAVERN_HI,
  CLIMAX_FALSE_CAVERN_LO,
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
  climaxSignatureTransferBridgeRow,
  createClimaxPinballRollState,
  createSignaturePinballHopState,
} from '@/Game/path/climaxGenerators';
import {
  FALSE_WALL_MIN_CAVERN_ROWS_BEFORE_SQUEEZE,
  FALSE_WALL_MIN_PHASE_ROWS_SINGLE_SEGMENT,
} from '@/Layout';
import { gapsFromRow, rowFromGaps, unionMinimalSeam } from '@/Game/path/swimmerGrid';
import { TEST_COLS } from '@/Game/path/__tests__/testGrid';

const MIN_CAVERN = FALSE_WALL_MIN_CAVERN_ROWS_BEFORE_SQUEEZE;
const MIN_PHASE = FALSE_WALL_MIN_PHASE_ROWS_SINGLE_SEGMENT;
const CAVERN_LO = Math.max(0, Math.min(CLIMAX_FALSE_CAVERN_LO, TEST_COLS - 1));
const CAVERN_HI = Math.min(Math.max(CAVERN_LO, CLIMAX_FALSE_CAVERN_HI), TEST_COLS - 1);

describe('climaxPinballRepairHopOverlap', () => {
  it('always returns a 2-wide interval overlapping prev 2-wide', () => {
    for (let prev = 0; prev <= TEST_COLS - 2; prev++) {
      for (let raw = -20; raw <= 20; raw++) {
        const left = climaxPinballRepairHopOverlap(raw, prev, TEST_COLS);
        expect(left).toBeGreaterThanOrEqual(0);
        expect(left).toBeLessThanOrEqual(TEST_COLS - 2);
        const overlap = left <= prev + 1 && prev <= left + 1;
        expect(overlap).toBe(true);
      }
    }
  });
});

describe('climaxPinballStep', () => {
  it('matches +1 drift then overlap-repaired hop on production grid', () => {
    let state = {
      stepMod: 0,
      anchorLeft: 2,
      wanderLeft: 2,
      driftCount: 2,
      patternSeed: 27,
      hopMag: -4,
    };
    const lefts: number[] = [];
    for (let i = 0; i < 3; i++) {
      const { row, state: next } = climaxPinballStep(state, TEST_COLS);
      state = next;
      const g = gapsFromRow(row);
      expect(g.length).toBe(2);
      expect(g[1]).toBe(g[0] + 1);
      lefts.push(g[0]);
    }
    expect(lefts[0]).toBe(2);
    expect(lefts[1]).toBe(3);
    const hop = lefts[2];
    expect(hop <= lefts[1] + 1 && lefts[1] <= hop + 1).toBe(true);
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
  it(`opens cavern band for cavern rows (first segment, R=${MIN_PHASE})`, () => {
    const salt = 0;
    for (let sub = 0; sub < MIN_CAVERN; sub++) {
      const row = climaxFalseWallRow(sub, TEST_COLS, MIN_PHASE, salt);
      for (let c = CAVERN_LO; c <= CAVERN_HI; c++) {
        expect(row[c]).toBe(0);
      }
      expect(row[0]).toBe(1);
      expect(row[1]).toBe(1);
    }
  });

  it(`squeeze row at end (R=${MIN_PHASE})`, () => {
    const leftSalt = 0;
    const rightSalt = 2;
    const leftSqueeze = climaxFalseWallRow(MIN_PHASE - 1, TEST_COLS, MIN_PHASE, leftSalt);
    const rightSqueeze = climaxFalseWallRow(MIN_PHASE - 1, TEST_COLS, MIN_PHASE, rightSalt);
    expect(gapsFromRow(leftSqueeze).length).toBe(1);
    expect(gapsFromRow(rightSqueeze).length).toBe(1);
    expect(gapsFromRow(leftSqueeze)[0]).not.toBe(gapsFromRow(rightSqueeze)[0]);
  });

  it('extra rows add cavern depth with one segment', () => {
    const total = 10;
    const salt = 0;
    for (let sub = 0; sub < total - 1; sub++) {
      const row = climaxFalseWallRow(sub, TEST_COLS, total, salt);
      for (let c = CAVERN_LO; c <= CAVERN_HI; c++) {
        expect(row[c]).toBe(0);
      }
    }
    expect(gapsFromRow(climaxFalseWallRow(total - 1, TEST_COLS, total, salt))).toEqual([1]);
  });

  it('multi-segment schedule includes a full-width gap bridge when K >= 2', () => {
    const R = 17;
    const salt = 0;
    expect(climaxFalseWallSegmentCount(R)).toBeGreaterThanOrEqual(2);
    const full = climaxFalseWallFullWidthGapRow(TEST_COLS);
    expect(gapsFromRow(full).length).toBe(TEST_COLS);
    let foundBridge = false;
    for (let sub = 0; sub < R; sub++) {
      if (gapsFromRow(climaxFalseWallRow(sub, TEST_COLS, R, salt)).length === TEST_COLS) {
        foundBridge = true;
        break;
      }
    }
    expect(foundBridge).toBe(true);
  });
});

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
      const anchor = seg % (TEST_COLS - 1);
      simulateClimaxSegment({
        columnCount: TEST_COLS,
        pathRunId: seg,
        rowIndexBase: seg * 17,
        prevGaps: [Math.min(anchor, TEST_COLS - 1)],
      });
    }
  });

  it('handles empty prev gaps and extreme anchors', () => {
    for (let seg = 0; seg < 200; seg++) {
      simulateClimaxSegment({
        columnCount: TEST_COLS,
        pathRunId: seg + 9000,
        rowIndexBase: seg,
        prevGaps: [],
      });
    }
    for (let col = 0; col < TEST_COLS; col++) {
      simulateClimaxSegment({
        columnCount: TEST_COLS,
        pathRunId: col,
        rowIndexBase: col * 3,
        prevGaps: [col],
      });
    }
  });
});

describe('climaxClampTwoWideLeft', () => {
  it('clamps to valid 2-wide window', () => {
    expect(climaxClampTwoWideLeft(-99, TEST_COLS)).toBe(0);
    expect(climaxClampTwoWideLeft(99, TEST_COLS)).toBe(TEST_COLS - 2);
  });
});

describe('createSignaturePinballHopState', () => {
  it('runs 4 rhythm cycles with fixed drift pattern on production grid', () => {
    const state0 = createSignaturePinballHopState([], TEST_COLS, 42);
    expect(state0.driftCount).toBe(2);
    expect(state0.signatureDriftPattern).toEqual([0, 1]);
    let state = state0;
    const budget =
      runProgressionTuning.SIGNATURE_PINBALL_HOP_CYCLES *
      (runProgressionTuning.SIGNATURE_PINBALL_DRIFT_ROWS +
        runProgressionTuning.SIGNATURE_PINBALL_BRIDGE_ROWS +
        1);
    for (let i = 0; i < budget; i++) {
      const { state: next } = climaxPinballStep(state, TEST_COLS);
      state = next;
    }
    expect(state.stepMod).toBe(0);
  });

  it('drifts +1 on second drift row, sliding chute (not full width), then SNAP hops', () => {
    let state = createSignaturePinballHopState([], TEST_COLS, 99);
    const lefts: number[] = [];
    const gapCounts: number[] = [];
    const budget =
      runProgressionTuning.SIGNATURE_PINBALL_HOP_CYCLES *
      (runProgressionTuning.SIGNATURE_PINBALL_DRIFT_ROWS +
        runProgressionTuning.SIGNATURE_PINBALL_BRIDGE_ROWS +
        1);
    for (let i = 0; i < budget; i++) {
      const { row, state: next } = climaxPinballStep(state, TEST_COLS);
      state = next;
      const gaps = gapsFromRow(row);
      lefts.push(gaps[0] ?? -1);
      gapCounts.push(gaps.length);
    }
    expect(lefts[1]).toBe(lefts[0] + 1);
    expect(gapCounts[2]).toBeLessThan(TEST_COLS);
    expect(gapCounts[2]).toBeGreaterThanOrEqual(3);
    const firstHopLeft = lefts[4];
    expect(firstHopLeft === 0 || firstHopLeft === TEST_COLS - 2).toBe(true);
    expect(new Set(lefts).size).toBeGreaterThanOrEqual(3);
  });
});

describe('climaxSignatureTransferBridgeRow', () => {
  it('slides a partial-width chute between drift and hop lanes', () => {
    const fromLeft = 6;
    const toLeft = 0;
    const row0 = climaxSignatureTransferBridgeRow(fromLeft, toLeft, 0, 2, TEST_COLS);
    const row1 = climaxSignatureTransferBridgeRow(fromLeft, toLeft, 1, 2, TEST_COLS);
    const g0 = gapsFromRow(row0);
    const g1 = gapsFromRow(row1);
    expect(g0.length).toBe(runProgressionTuning.SIGNATURE_BRIDGE_CHUTE_WIDTH);
    expect(g0.length).toBeLessThan(TEST_COLS);
    expect(g0.some((c) => c === 6 || c === 7)).toBe(true);
    expect(g1.some((c) => c === 0 || c === 1)).toBe(true);
  });
});

describe('climaxPinballInitialAnchor', () => {
  it('centers pinball on the widest gap run (not only the leftmost pair)', () => {
    expect(climaxPinballInitialAnchor([2, 3], TEST_COLS)).toBe(2);
  });

  it('when all gaps are singles, anchors near the centroid of gaps', () => {
    const anchor = climaxPinballInitialAnchor([1, 5], TEST_COLS);
    expect(anchor).toBeGreaterThanOrEqual(1);
    expect(anchor).toBeLessThanOrEqual(TEST_COLS - 2);
  });

  it('with one 3-wide island, anchors on that island', () => {
    expect(climaxPinballInitialAnchor([1, 2, 3], TEST_COLS)).toBe(1);
  });
});
