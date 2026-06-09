/**
 * CLIMAX phase generators: Pinball (2-wide zig-zag + violent hop) & False Wall (cavern → squeeze).
 * Worklet-safe.
 */

import { gapsFromRow, rowFromGaps, type SwimmerRow } from './swimmerGrid';

/** 2-wide gap: +1 for 3 rows, violent hop on 4th; cycle repeats. */
export const CLIMAX_PINBALL_CYCLE_LEN = 4;

/** Rows of Pinball before False Wall (two full cycles). */
export const CLIMAX_PINBALL_SEGMENT_ROWS = 8;

/** False Wall: 3 cavern rows + 1 squeeze row. */
export const CLIMAX_FALSE_WALL_ROWS = 4;

/** Cavern open band (inclusive) for 15-column layout. */
export const CLIMAX_FALSE_CAVERN_LO = 2;
export const CLIMAX_FALSE_CAVERN_HI = 12;

export type ClimaxPinballState = {
  stepMod: number;
  /** Left column index of the 2-wide gap at the current cycle origin (step 0). */
  anchorLeft: number;
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
 * The Pinball — 2-wide gap: steps 0..2 shift +1 each row from anchor; step 3 hops by -5 with seam repair.
 */
export function climaxPinballStep(
  state: ClimaxPinballState,
  columnCount: number
): { row: SwimmerRow; state: ClimaxPinballState } {
  'worklet';
  const anchor = climaxClampTwoWideLeft(state.anchorLeft, columnCount);
  const sm = ((state.stepMod % CLIMAX_PINBALL_CYCLE_LEN) + CLIMAX_PINBALL_CYCLE_LEN) % CLIMAX_PINBALL_CYCLE_LEN;

  let left: number;
  if (sm < 3) {
    left = climaxClampTwoWideLeft(anchor + sm, columnCount);
  } else {
    const prevLeft = climaxClampTwoWideLeft(anchor + 2, columnCount);
    const rawHop = prevLeft - 5;
    left = climaxPinballRepairHopOverlap(rawHop, prevLeft, columnCount);
  }

  const row = rowFromGaps([left, left + 1], columnCount);
  const nextMod = (sm + 1) % CLIMAX_PINBALL_CYCLE_LEN;
  const nextAnchor = nextMod === 0 ? left : anchor;
  return {
    row,
    state: { stepMod: nextMod, anchorLeft: nextAnchor },
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

/** Initial Pinball 2-wide anchor: align with the strongest previous passable band, not only the leftmost pair. */
export function climaxPinballInitialAnchor(prevGaps: number[], columnCount: number): number {
  'worklet';
  if (!prevGaps || prevGaps.length === 0) {
    return climaxClampTwoWideLeft(Math.floor(columnCount / 2) - 1, columnCount);
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
    return climaxClampTwoWideLeft(Math.floor(columnCount / 2) - 1, columnCount);
  }
  if (sorted.length === 1) {
    return climaxClampTwoWideLeft(sorted[0] - 1, columnCount);
  }

  const runs = gapRunsFromSorted(sorted);
  const mean = sorted.reduce((acc, v) => acc + v, 0) / sorted.length;

  let bestIdx = 0;
  let bestLen = -1;
  let bestDist = Number.POSITIVE_INFINITY;
  let bestLo = -1;

  for (let r = 0; r < runs.length; r++) {
    const { lo: rlo, hi: rhi } = runs[r];
    const len = rhi - rlo + 1;
    const mid = (rlo + rhi) * 0.5;
    const dist = Math.abs(mid - mean);
    if (len > bestLen) {
      bestLen = len;
      bestDist = dist;
      bestLo = rlo;
      bestIdx = r;
    } else if (len === bestLen) {
      if (dist < bestDist - 0.0001) {
        bestDist = dist;
        bestLo = rlo;
        bestIdx = r;
      } else if (Math.abs(dist - bestDist) <= 0.0001 && rlo > bestLo) {
        // Tie on width and distance to mean: prefer the rightmost run (multipath islands are often balanced);
        // avoids always locking onto the left island after free multipath.
        bestLo = rlo;
        bestIdx = r;
      }
    }
  }

  const pick = runs[bestIdx];
  if (pick.hi >= pick.lo + 1) {
    return climaxClampTwoWideLeft(
      pick.lo + Math.floor((pick.hi - pick.lo - 1) / 2),
      columnCount
    );
  }
  return climaxClampTwoWideLeft(pick.lo - 1, columnCount);
}

/**
 * The False Wall — rows 0..2: open cavern columns [2,12]; row 3: single gap at margin 1 or 13.
 */
export function climaxFalseWallRow(
  subRow: number,
  columnCount: number,
  squeezeAtRight: boolean
): SwimmerRow {
  'worklet';
  const sr = Math.max(0, Math.floor(subRow));
  if (sr < 3) {
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
  const col = squeezeAtRight
    ? Math.min(13, Math.max(0, columnCount - 1))
    : Math.min(1, Math.max(0, columnCount - 1));
  return rowFromGaps([col], columnCount);
}

/** Row has at least one passable cell (not a full solid wall). */
export function climaxRowHasGap(row: SwimmerRow): boolean {
  'worklet';
  return gapsFromRow(row).length > 0;
}
