import { LAYOUT_CONSTANTS } from '@/Layout';
import { OBSTACLE_PREV_RUN_REACH_SLOP_COLUMNS } from '@/config/obstaclePacing';

/** Passable cell (gap). */
export type SwimmerCellOpen = 0;
/** Solid obstacle cell. */
export type SwimmerCellSolid = 1;
export type SwimmerCell = SwimmerCellOpen | SwimmerCellSolid;

/** One horizontal band: index = column 0..columns-1. */
export type SwimmerRow = SwimmerCell[];

export const SWIMMER_COLUMNS = LAYOUT_CONSTANTS.COLUMNS;

/** Build a row bitmask from explicit gap column indices (passable columns). */
export function rowFromGaps(gaps: readonly number[], columnCount: number): SwimmerRow {
  'worklet';
  const row: SwimmerRow = new Array(columnCount) as SwimmerRow;
  for (let c = 0; c < columnCount; c++) {
    row[c] = 1;
  }
  for (let i = 0; i < gaps.length; i++) {
    const g = gaps[i];
    if (g >= 0 && g < columnCount) {
      row[g] = 0;
    }
  }
  return row;
}

/** Column indices where the row is passable (0). */
export function gapsFromRow(row: readonly SwimmerCell[]): number[] {
  'worklet';
  const gaps: number[] = [];
  for (let c = 0; c < row.length; c++) {
    if (row[c] === 0) gaps.push(c);
  }
  return gaps;
}

/**
 * Seam rule: ∃ column c where both rows are open (0).
 * Required for vertical survivability between consecutive bands.
 */
export function hasVerticalSeam(
  lowerRow: readonly SwimmerCell[],
  upperRow: readonly SwimmerCell[]
): boolean {
  'worklet';
  const n = Math.min(lowerRow.length, upperRow.length);
  for (let c = 0; c < n; c++) {
    if (lowerRow[c] === 0 && upperRow[c] === 0) return true;
  }
  return false;
}

/** Repair: ensure at least one prev gap column appears in next gaps (minimal fix). */
export function unionMinimalSeam(
  prevGaps: readonly number[],
  nextGaps: number[],
  columnCount: number
): number[] {
  'worklet';
  const nextSet = new Set(nextGaps);
  for (let i = 0; i < prevGaps.length; i++) {
    const g = prevGaps[i];
    if (g >= 0 && g < columnCount && nextSet.has(g)) {
      return nextGaps;
    }
  }
  if (prevGaps.length === 0) return nextGaps;
  const anchor = prevGaps[0];
  if (anchor >= 0 && anchor < columnCount && !nextSet.has(anchor)) {
    const merged = nextGaps.slice();
    merged.push(anchor);
    merged.sort((a, b) => a - b);
    return merged;
  }
  return nextGaps;
}

/** Valid unique sorted gap indices in [0, columnCount - 1]. */
export function normalizeGapColumns(
  gaps: readonly number[] | undefined,
  columnCount: number
): number[] {
  'worklet';
  if (!gaps || gaps.length === 0 || columnCount <= 0) return [];
  const set = new Set<number>();
  for (let i = 0; i < gaps.length; i++) {
    const c = Math.round(gaps[i] as number);
    if (Number.isFinite(c) && c >= 0 && c < columnCount) {
      set.add(c);
    }
  }
  return [...set].sort((a, b) => a - b);
}

/** Contiguous gap runs on sorted unique column indices. */
function connectedGapRunsFromSorted(sorted: readonly number[]): { lo: number; hi: number }[] {
  'worklet';
  if (!sorted.length) return [];
  const runs: { lo: number; hi: number }[] = [];
  let lo = sorted[0];
  let hi = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    const v = sorted[i];
    if (v === hi + 1) hi = v;
    else {
      runs.push({ lo, hi });
      lo = v;
      hi = v;
    }
  }
  runs.push({ lo, hi });
  return runs;
}

/**
 * For every contiguous passable run on the previous row, ensure the next row has at least one
 * gap column within **±OBSTACLE_PREV_RUN_REACH_SLOP_COLUMNS** of that run (see `obstaclePacing.ts`).
 * Without this, a global vertical seam can exist while a second gap "island" is still a dead end.
 */
export function repairGapsEachPrevRunNearNext(
  prevGaps: readonly number[],
  nextGaps: readonly number[],
  columnCount: number
): number[] {
  'worklet';
  const prev = normalizeGapColumns(prevGaps, columnCount);
  let next = normalizeGapColumns(nextGaps, columnCount);
  if (!prev.length) return next;
  if (!next.length) {
    next = [Math.max(0, Math.min(columnCount - 1, Math.floor(columnCount / 2)))];
  }
  const nextSet = new Set(next);
  const runs = connectedGapRunsFromSorted(prev);
  const slack = OBSTACLE_PREV_RUN_REACH_SLOP_COLUMNS;
  for (let r = 0; r < runs.length; r++) {
    const { lo, hi } = runs[r];
    const eLo = Math.max(0, lo - slack);
    const eHi = Math.min(columnCount - 1, hi + slack);
    let ok = false;
    for (let c = eLo; c <= eHi; c++) {
      if (nextSet.has(c)) {
        ok = true;
        break;
      }
    }
    if (!ok) {
      const add = Math.min(eHi, Math.max(eLo, Math.round((lo + hi) * 0.5)));
      nextSet.add(add);
    }
  }
  return normalizeGapColumns([...nextSet], columnCount);
}

/**
 * After {@link unionMinimalSeam}, guarantee ∃ column open in both bands (strict repair).
 * Use when generators must never ship a dead vertical cut vs `prevGaps`.
 */
export function repairGapsVerticalSeamIfNeeded(
  prevGaps: readonly number[],
  gaps: number[],
  columnCount: number
): number[] {
  'worklet';
  const prev = normalizeGapColumns(prevGaps, columnCount);
  let next = normalizeGapColumns(gaps, columnCount);
  if (!prev.length) return next;
  if (!next.length) {
    next = [Math.max(0, Math.min(columnCount - 1, Math.floor(columnCount / 2)))];
  }
  let merged = unionMinimalSeam(prev, next, columnCount);
  merged = normalizeGapColumns(merged, columnCount);
  const prevRow = rowFromGaps(prev, columnCount);
  if (hasVerticalSeam(prevRow, rowFromGaps(merged, columnCount))) {
    return merged;
  }
  const set = new Set(merged);
  for (let i = 0; i < prev.length; i++) {
    set.add(prev[i]);
  }
  return normalizeGapColumns([...set], columnCount);
}

/**
 * Last line of defense: clamp/dedupe gaps, ensure ≥1 passable column, then seam to `prevGaps` when any exist.
 */
export function finalizeGapsForObstacleRow(
  prevGaps: readonly number[] | undefined,
  gaps: readonly number[] | undefined,
  columnCount: number
): number[] {
  'worklet';
  let g = normalizeGapColumns(gaps, columnCount);
  if (g.length === 0) {
    g = [Math.max(0, Math.min(columnCount - 1, Math.floor(columnCount / 2)))];
  }
  const prev = normalizeGapColumns(prevGaps, columnCount);
  if (prev.length) {
    g = repairGapsVerticalSeamIfNeeded(prev, g, columnCount);
    g = repairGapsEachPrevRunNearNext(prev, g, columnCount);
  }
  return g;
}
