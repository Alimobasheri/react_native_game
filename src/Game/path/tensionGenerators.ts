/**
 * TENSION phase generators: Funnel (symmetric squeeze) & Paradox Split (asymmetric fork).
 * Worklet-safe: numeric defaults inlined where needed.
 */

import { rowFromGaps, type SwimmerRow } from './swimmerGrid';

/** Funnel: default row count for tests / docs; live game uses `pathSegmentTensionFunnelDurationRows` in `gapDifficultyRamp.ts`. */
export const TENSION_FUNNEL_DURATION_ROWS = 6;

/** Starting gap width at funnel row 0. */
export const TENSION_FUNNEL_START_WIDTH = 5;

/**
 * Symmetric inclusive bounds for a gap of width W around integer center C.
 * Uses left = C - floor(W/2), right = C + ceil(W/2) - 1 so even W matches exactly.
 */
export function tensionFunnelInclusiveBounds(
  center: number,
  width: number
): { left: number; right: number } {
  'worklet';
  const W = Math.max(1, Math.round(width));
  const c = Math.round(center);
  const left = c - Math.floor(W / 2);
  const right = c + Math.ceil(W / 2) - 1;
  return { left, right };
}

/** Gap width W at funnel step `stepIndex` (row 0 → W=5, then −1 per row until 1, then holds). */
export function tensionFunnelWidthAtStep(stepIndex: number): number {
  'worklet';
  const raw = Math.max(0, Math.floor(stepIndex));
  return Math.max(
    1,
    TENSION_FUNNEL_START_WIDTH -
    Math.min(raw, TENSION_FUNNEL_START_WIDTH - 1)
  );
}

/**
 * The Funnel — linear squeeze over `durationRows` (default 6): W starts at 5, decrements by 1
 * each row until W = 1, then holds at 1 for the final row(s).
 */
export function tensionFunnelRow(
  stepIndex: number,
  center: number,
  columnCount: number,
  _durationRows?: number
): SwimmerRow {
  'worklet';
  const W = tensionFunnelWidthAtStep(stepIndex);
  let { left, right } = tensionFunnelInclusiveBounds(center, W);
  left = Math.max(0, Math.min(columnCount - 1, left));
  right = Math.max(0, Math.min(columnCount - 1, right));
  if (right < left) {
    const t = left;
    left = right;
    right = t;
  }
  const gapList: number[] = [];
  for (let c = left; c <= right; c++) {
    gapList.push(c);
  }
  return rowFromGaps(gapList, columnCount);
}

/**
 * Center of previous row's gap span (for anchoring funnel / paradox).
 */
export function tensionGapCenterFromPrevGaps(gaps: number[], columnCount: number): number {
  'worklet';
  if (!gaps || gaps.length === 0) {
    return Math.floor(columnCount / 2);
  }
  let mn = columnCount;
  let mx = -1;
  for (let i = 0; i < gaps.length; i++) {
    const g = gaps[i];
    if (g >= 0 && g < columnCount) {
      if (g < mn) mn = g;
      if (g > mx) mx = g;
    }
  }
  if (mx < 0) return Math.floor(columnCount / 2);
  return Math.round((mn + mx) / 2);
}

/**
 * Raw paradox fork columns (hard + easy) before optional horizontal nudge for seam vs `prevPassable`.
 */
export function tensionParadoxBaseGapColumns(
  priorCentralColumn: number,
  columnCount: number
): number[] {
  'worklet';
  const C = Math.max(0, Math.min(columnCount - 1, Math.round(priorCentralColumn)));
  const leftHard = C - 3;
  const easyLeft = C + 2;
  const easyMid = C + 3;
  const easyRight = C + 4;
  const cols: number[] = [];
  if (leftHard >= 0 && leftHard < columnCount) cols.push(leftHard);
  if (easyLeft >= 0 && easyLeft < columnCount) cols.push(easyLeft);
  if (easyMid >= 0 && easyMid < columnCount) cols.push(easyMid);
  if (easyRight >= 0 && easyRight < columnCount) cols.push(easyRight);
  if (cols.length === 0) {
    const fallbacks = [leftHard, easyLeft, easyMid, easyRight, C];
    for (let i = 0; i < fallbacks.length; i++) {
      const c = fallbacks[i];
      if (c >= 0 && c < columnCount) {
        cols.push(c);
        break;
      }
    }
  }
  if (cols.length === 0) {
    cols.push(Math.max(0, Math.min(columnCount - 1, C)));
  }
  return cols.sort((a, b) => a - b);
}

function prevPassableSet(
  prevPassableColumns: readonly number[] | undefined,
  columnCount: number
): Set<number> {
  'worklet';
  const s = new Set<number>();
  if (!prevPassableColumns || prevPassableColumns.length === 0) return s;
  for (let i = 0; i < prevPassableColumns.length; i++) {
    const g = Math.round(prevPassableColumns[i] as number);
    if (Number.isFinite(g) && g >= 0 && g < columnCount) {
      s.add(g);
    }
  }
  return s;
}

function paradoxGapsOverlapPrev(gaps: readonly number[], prev: Set<number>): boolean {
  'worklet';
  for (let i = 0; i < gaps.length; i++) {
    if (prev.has(gaps[i])) return true;
  }
  return false;
}

/**
 * After funnel ends width-1 at column C, the vanilla fork opens C−3 and C+2..C+4 with C solid — no shared
 * column with the previous row. Shift the whole fork horizontally by the smallest |s| so some passable
 * column matches `prevPassableColumns` (gameplay seam without relying on post-merge widening).
 */
export function nudgeParadoxGapsToTouchPrev(
  baseGapColumns: readonly number[],
  prevPassableColumns: readonly number[] | undefined,
  columnCount: number
): number[] {
  'worklet';
  const base = [...baseGapColumns].sort((a, b) => a - b);
  const prev = prevPassableSet(prevPassableColumns, columnCount);
  if (!prev.size || paradoxGapsOverlapPrev(base, prev)) {
    return base;
  }
  let best: number[] | null = null;
  let bestScore = Number.POSITIVE_INFINITY; // |s| primary, then fewer lost columns
  for (let s = -columnCount; s <= columnCount; s++) {
    const seen = new Set<number>();
    const shifted: number[] = [];
    for (let i = 0; i < base.length; i++) {
      const g = base[i] + s;
      if (g >= 0 && g < columnCount && !seen.has(g)) {
        seen.add(g);
        shifted.push(g);
      }
    }
    shifted.sort((a, b) => a - b);
    if (!paradoxGapsOverlapPrev(shifted, prev)) continue;
    const score = Math.abs(s) * 1000 - shifted.length; // prefer smaller |s|, then more columns
    if (score < bestScore) {
      bestScore = score;
      best = shifted;
    }
  }
  return best ?? base;
}

/**
 * The Paradox Split — fork from conceptual center C of the funnel:
 * - Hard route: width 1 at column C - 3
 * - Easy route: width 3 centered on column C + 3 → open at C+2, C+3, C+4
 * C is solid between the two tracks in the **base** pattern; when `prevPassableColumns` is passed (e.g.
 * funnel exit), the pattern is shifted horizontally so at least one column stays open vs the previous row.
 */
export function tensionParadoxSplitRow(
  priorCentralColumn: number,
  columnCount: number,
  prevPassableColumns?: readonly number[]
): SwimmerRow {
  'worklet';
  const base = tensionParadoxBaseGapColumns(priorCentralColumn, columnCount);
  const cols = nudgeParadoxGapsToTouchPrev(base, prevPassableColumns, columnCount);
  return rowFromGaps(cols, columnCount);
}

/** True iff column `center` is solid (1) in the paradox split row built for prior center `center`. */
export function tensionParadoxHasWallAtPriorCenter(
  priorCentralColumn: number,
  columnCount: number
): boolean {
  'worklet';
  const row = tensionParadoxSplitRow(priorCentralColumn, columnCount, undefined);
  const C = Math.max(0, Math.min(columnCount - 1, Math.round(priorCentralColumn)));
  return row[C] === 1;
}
