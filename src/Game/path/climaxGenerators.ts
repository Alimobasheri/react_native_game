/**
 * CLIMAX phase generators: Pinball (2-wide drift + hop) & False Wall (cavern → squeeze).
 * Worklet-safe.
 */

import { FALSE_WALL_MIN_CAVERN_ROWS_BEFORE_SQUEEZE, FALSE_WALL_MIN_PHASE_ROWS_SINGLE_SEGMENT } from '@/Layout';
import { intMod, mixU32 } from './deterministicMix';
import { gapsFromRow, rowFromGaps, type SwimmerRow } from './swimmerGrid';

/**
 * Legacy fixed pinball cycle length (3 drift rows + hop). Kept for docs / ramp hints; real cycles are
 * `state.driftCount + 1` from {@link createClimaxPinballRollState}.
 */
export const CLIMAX_PINBALL_CYCLE_LEN = 4;

/** Rows of Pinball before False Wall (two full cycles). */
export const CLIMAX_PINBALL_SEGMENT_ROWS = 8;

/** Default false-wall phase row count (one micro-segment at minimum runway length). */
export const CLIMAX_FALSE_WALL_ROWS = FALSE_WALL_MIN_PHASE_ROWS_SINGLE_SEGMENT;

/** Cavern open band (inclusive) for 15-column layout. */
export const CLIMAX_FALSE_CAVERN_LO = 2;
export const CLIMAX_FALSE_CAVERN_HI = 12;

export type ClimaxPinballState = {
  stepMod: number;
  /** Cycle base column for the first drift row (after a hop, becomes the landed 2-wide left). */
  anchorLeft: number;
  /** Last emitted 2-wide left (drives overlap-safe drift). */
  wanderLeft: number;
  /** Number of drift rows before the hop row (>= 1). */
  driftCount: number;
  /** Salt for {@link climaxPinballDriftDeltaFromSeed}. */
  patternSeed: number;
  /** Signed hop offset before seam repair vs previous drift column. */
  hopMag: number;
};

function intervalsOverlap(a0: number, a1: number, b0: number, b1: number): boolean {
  'worklet';
  return a0 <= b1 && b0 <= a1;
}

/** Clamp left so [left, left+1] ⊆ [0, columnCount-1]. */
export function climaxClampTwoWideLeft(left: number, columnCount: number): number {
  'worklet';
  const maxL = Math.max(0, columnCount - 2);
  return Math.max(0, Math.min(maxL, Math.round(left)));
}

/**
 * Nudge a 2-wide gap at `rawLeft` until it overlaps previous gap [prevLeft, prevLeft+1], or fallback to prevLeft.
 */
export function climaxPinballRepairHopOverlap(
  rawLeft: number,
  prevLeft: number,
  columnCount: number
): number {
  'worklet';
  const p0 = climaxClampTwoWideLeft(prevLeft, columnCount);
  const p1 = p0 + 1;
  let L = climaxClampTwoWideLeft(rawLeft, columnCount);
  if (intervalsOverlap(L, L + 1, p0, p1)) return L;
  for (let d = 1; d <= columnCount; d++) {
    for (const sgn of [-1, 1]) {
      const cand = climaxClampTwoWideLeft(rawLeft + sgn * d, columnCount);
      if (intervalsOverlap(cand, cand + 1, p0, p1)) return cand;
    }
  }
  return p0;
}

/**
 * Per-drift-step lateral move in columns: −1, 0, or +1 (keeps row-to-row seam overlap for a 2-wide gap).
 */
export function climaxPinballDriftDeltaFromSeed(patternSeed: number, driftStepIndex: number): number {
  'worklet';
  return intMod(mixU32(patternSeed >>> 0, driftStepIndex >>> 0, 0x64727431), 3) - 1;
}

/**
 * Pinball — 2-wide gap: `driftCount` rows walk with {@link climaxPinballDriftDeltaFromSeed}, then one hop row
 * (`hopMag` + repair). Cycles repeat with anchor reset to the post-hop column.
 */
export function climaxPinballStep(
  state: ClimaxPinballState,
  columnCount: number
): { row: SwimmerRow; state: ClimaxPinballState } {
  'worklet';
  const wanderIn =
    typeof state.wanderLeft === 'number' && Number.isFinite(state.wanderLeft)
      ? state.wanderLeft
      : state.anchorLeft;
  const wander = climaxClampTwoWideLeft(wanderIn, columnCount);
  const rawDrift = Number(state.driftCount);
  const driftCount = Number.isFinite(rawDrift)
    ? Math.max(1, Math.min(8, Math.floor(rawDrift)))
    : 3;
  const patternSeed =
    typeof state.patternSeed === 'number' && Number.isFinite(state.patternSeed)
      ? state.patternSeed
      : 27;
  const hopMag =
    typeof state.hopMag === 'number' && Number.isFinite(state.hopMag) ? state.hopMag : -5;
  const anchor = climaxClampTwoWideLeft(state.anchorLeft, columnCount);
  const cycleLen = driftCount + 1;
  const sm = ((state.stepMod % cycleLen) + cycleLen) % cycleLen;

  let left: number;
  let nextWander: number;

  if (sm < driftCount) {
    if (sm === 0) {
      left = anchor;
      nextWander = left;
    } else {
      const d = climaxPinballDriftDeltaFromSeed(patternSeed, sm - 1);
      nextWander = climaxClampTwoWideLeft(wander + d, columnCount);
      left = nextWander;
    }
  } else {
    const prevLeft = wander;
    const rawHop = prevLeft + hopMag;
    left = climaxPinballRepairHopOverlap(rawHop, prevLeft, columnCount);
    nextWander = left;
  }

  const row = rowFromGaps([left, left + 1], columnCount);
  const nextMod = (sm + 1) % cycleLen;
  const nextAnchor = nextMod === 0 ? left : anchor;
  const nextW = nextMod === 0 ? left : nextWander;

  return {
    row,
    state: {
      stepMod: nextMod,
      anchorLeft: nextAnchor,
      wanderLeft: nextW,
      driftCount,
      patternSeed,
      hopMag,
    },
  };
}

/** Contiguous inclusive runs from sorted unique gap columns. */
function gapRunsFromSorted(sortedUnique: readonly number[]): { lo: number; hi: number }[] {
  'worklet';
  const runs: { lo: number; hi: number }[] = [];
  if (!sortedUnique.length) return runs;
  let lo = sortedUnique[0];
  let hi = sortedUnique[0];
  for (let i = 1; i < sortedUnique.length; i++) {
    const v = sortedUnique[i];
    if (v === hi + 1) {
      hi = v;
    } else {
      runs.push({ lo, hi });
      lo = v;
      hi = v;
    }
  }
  runs.push({ lo, hi });
  return runs;
}

function twoWideLeftInRun(pick: { lo: number; hi: number }, columnCount: number, slotSalt: number): number {
  'worklet';
  if (pick.hi >= pick.lo + 1) {
    const numPos = pick.hi - pick.lo;
    const slot = intMod(slotSalt >>> 0, Math.max(1, numPos));
    return climaxClampTwoWideLeft(pick.lo + slot, columnCount);
  }
  return climaxClampTwoWideLeft(pick.lo - 1, columnCount);
}

/**
 * Initial 2-wide pinball anchor from previous gaps + deterministic variety salt (tie-breaks, jitter, random lane).
 */
export function climaxPinballInitialAnchor(
  prevGaps: number[],
  columnCount: number,
  varietySalt: number = 0x0010_0000
): number {
  'worklet';
  const maxL = Math.max(0, columnCount - 2);
  const mid = Math.floor(columnCount / 2) - 1;
  const jitter = intMod(mixU32(varietySalt >>> 0, columnCount >>> 0, 0x70696e31), 5) - 2;

  if (!prevGaps || prevGaps.length === 0) {
    const mode = intMod(varietySalt >>> 16, 4);
    if (mode === 3 && maxL >= 0) {
      return climaxClampTwoWideLeft(intMod(mixU32(varietySalt, 0x61, 0x6e), maxL + 1), columnCount);
    }
    return climaxClampTwoWideLeft(mid + jitter, columnCount);
  }
  const set = new Set<number>();
  for (let i = 0; i < prevGaps.length; i++) {
    const g = prevGaps[i];
    if (g >= 0 && g < columnCount) {
      set.add(Math.round(g));
    }
  }
  const sorted = [...set].sort((a, b) => a - b);
  if (sorted.length === 0) {
    return climaxClampTwoWideLeft(mid + jitter, columnCount);
  }
  if (sorted.length === 1) {
    return climaxClampTwoWideLeft(sorted[0] - 1 + intMod(varietySalt >>> 8, 3) - 1, columnCount);
  }

  const runs = gapRunsFromSorted(sorted);
  const mean = sorted.reduce((acc, v) => acc + v, 0) / sorted.length;

  let bestLen = -1;
  let bestDist = Number.POSITIVE_INFINITY;
  const EPS = 1e-5;

  for (let r = 0; r < runs.length; r++) {
    const { lo: rlo, hi: rhi } = runs[r];
    const len = rhi - rlo + 1;
    const midR = (rlo + rhi) * 0.5;
    const dist = Math.abs(midR - mean);
    if (len > bestLen) {
      bestLen = len;
      bestDist = dist;
    } else if (len === bestLen && dist < bestDist - EPS) {
      bestDist = dist;
    }
  }

  const candIdx: number[] = [];
  for (let r = 0; r < runs.length; r++) {
    const { lo: rlo, hi: rhi } = runs[r];
    const len = rhi - rlo + 1;
    const midR = (rlo + rhi) * 0.5;
    const dist = Math.abs(midR - mean);
    if (len === bestLen && Math.abs(dist - bestDist) <= EPS) {
      candIdx.push(r);
    }
  }
  if (candIdx.length === 0) {
    candIdx.push(0);
  }
  const runPick = candIdx[intMod(varietySalt >>> 20, candIdx.length)];
  const pick = runs[runPick];
  const smartLeft = twoWideLeftInRun(pick, columnCount, varietySalt >>> 4);

  const mode = intMod(varietySalt >>> 24, 8);
  if (mode >= 6 && maxL >= 0) {
    return climaxClampTwoWideLeft(intMod(mixU32(varietySalt, 0x72, 0x64), maxL + 1), columnCount);
  }
  if (mode === 5) {
    const gPick = sorted[intMod(varietySalt >>> 12, sorted.length)];
    return climaxClampTwoWideLeft(gPick - 1 + intMod(varietySalt >>> 6, 3) - 1, columnCount);
  }
  return smartLeft;
}

function pinballHopMagFromSalt(salt: number): number {
  'worklet';
  const hopPick = intMod(mixU32(salt >>> 0, 0x70, 0x68), 14);
  const hopTable = [-9, -8, -7, -6, -5, 5, 6, 7, 8, 9, -10, -4, 4, 10];
  return hopTable[hopPick] ?? -6;
}

/**
 * Roll a new pinball segment state: anchor placement, drift row count (2–6), tap rhythm (−1/0/+1 per row),
 * and hop magnitude (signed, then seam-repaired).
 */
export function createClimaxPinballRollState(
  prevGaps: number[],
  columnCount: number,
  salt: number
): ClimaxPinballState {
  'worklet';
  const driftCount = 2 + intMod(mixU32(salt >>> 0, 0x70, 0x6e), 5);
  const patternSeed = mixU32(salt >>> 0, 0x70, 0x62);
  const hopMag = pinballHopMagFromSalt(salt);
  const anchorSalt = mixU32(salt >>> 0, 0x70, 0x61);
  const anchorLeft = climaxPinballInitialAnchor(prevGaps, columnCount, anchorSalt);
  const w0 = climaxClampTwoWideLeft(anchorLeft, columnCount);
  return {
    stepMod: 0,
    anchorLeft: w0,
    wanderLeft: w0,
    driftCount,
    patternSeed,
    hopMag,
  };
}

/** Full-width passable row (all columns) — bridge between false-wall micro-segments. */
export function climaxFalseWallFullWidthGapRow(columnCount: number): SwimmerRow {
  'worklet';
  const gaps: number[] = [];
  for (let c = 0; c < columnCount; c++) {
    gaps.push(c);
  }
  return rowFromGaps(gaps, columnCount);
}

function climaxFalseWallCavernRow(columnCount: number): SwimmerRow {
  'worklet';
  const gaps: number[] = [];
  const lo = Math.max(0, Math.min(CLIMAX_FALSE_CAVERN_LO, columnCount - 1));
  const hi = Math.min(
    Math.max(lo, CLIMAX_FALSE_CAVERN_HI),
    columnCount - 1
  );
  for (let c = lo; c <= hi; c++) {
    gaps.push(c);
  }
  return rowFromGaps(gaps, columnCount);
}

function climaxFalseWallSqueezeColumn(columnCount: number, squeezeAtRight: boolean): number {
  'worklet';
  if (squeezeAtRight) {
    const target = Math.max(2, columnCount - 2);
    return Math.min(target, Math.max(0, columnCount - 1));
  }
  return Math.min(1, Math.max(0, columnCount - 1));
}

function climaxFalseWallSchedule(totalRows: number): { K: number; cavernPerSeg: number[] } {
  'worklet';
  const minC = FALSE_WALL_MIN_CAVERN_ROWS_BEFORE_SQUEEZE;
  const R = Math.max(1, Math.floor(totalRows));
  if (R < minC + 1) {
    return { K: 1, cavernPerSeg: [Math.max(0, R - 1)] };
  }
  const denom = minC + 2;
  let K = Math.max(1, Math.floor((R + 1) / denom));
  while (K > 1 && R - 2 * K + 1 < K * minC) {
    K--;
  }
  const cavernTotal = R - 2 * K + 1;
  const extra = Math.max(0, cavernTotal - K * minC);
  const add = Math.floor(extra / K);
  const rem = extra % K;
  const cavernPerSeg: number[] = [];
  for (let i = 0; i < K; i++) {
    cavernPerSeg.push(minC + add + (i < rem ? 1 : 0));
  }
  return { K, cavernPerSeg };
}

/**
 * How many cavern→squeeze **micro-segments** fit in `totalRows`, each with at least
 * {@link FALSE_WALL_MIN_CAVERN_ROWS_BEFORE_SQUEEZE} cavern rows before its squeeze, plus one full-width
 * gap row between consecutive segments.
 */
export function climaxFalseWallSegmentCount(totalRows: number): number {
  'worklet';
  return climaxFalseWallSchedule(totalRows).K;
}

/**
 * False Wall phase: **K** short cavern→squeeze blocks separated by **full-width** gap rows (rapid
 * left↔right handoffs as K grows). `layoutSalt` fixes which margin the first squeeze uses; later
 * segments alternate.
 *
 * @param layoutSalt deterministic seed (e.g. `mixU32(pathRunId, stream, 0x666c7741)`).
 */
export function climaxFalseWallRow(
  subRow: number,
  columnCount: number,
  totalRows: number = CLIMAX_FALSE_WALL_ROWS,
  layoutSalt: number = 0
): SwimmerRow {
  'worklet';
  const R = Math.max(1, Math.floor(totalRows));
  const sr = Math.max(0, Math.min(R - 1, Math.floor(subRow)));
  const { K, cavernPerSeg } = climaxFalseWallSchedule(R);
  const startRight = (mixU32(layoutSalt >>> 0, R >>> 0, 0x666c7740) & 1) === 1;

  let sub = 0;
  for (let seg = 0; seg < K; seg++) {
    const cavernN = cavernPerSeg[seg] ?? FALSE_WALL_MIN_CAVERN_ROWS_BEFORE_SQUEEZE;
    const squeezeAtRight = seg % 2 === 0 ? startRight : !startRight;

    for (let i = 0; i < cavernN; i++) {
      if (sub === sr) {
        return climaxFalseWallCavernRow(columnCount);
      }
      sub++;
    }
    if (sub === sr) {
      const col = climaxFalseWallSqueezeColumn(columnCount, squeezeAtRight);
      return rowFromGaps([col], columnCount);
    }
    sub++;
    if (seg < K - 1) {
      if (sub === sr) {
        return climaxFalseWallFullWidthGapRow(columnCount);
      }
      sub++;
    }
  }

  return climaxFalseWallCavernRow(columnCount);
}

/** Row has at least one passable cell (not a full solid wall). */
export function climaxRowHasGap(row: SwimmerRow): boolean {
  'worklet';
  return gapsFromRow(row).length > 0;
}
