/**
 * FLOW phase generators: Chute (fixed 3-wide gap) & Chicane (rhythmic 3-wide slalom).
 * All exports are worklet-safe (no module-level defaults in worklet params).
 */

import { gapsFromRow, rowFromGaps, type SwimmerRow } from './swimmerGrid';

export const FLOW_GAP_WIDTH = 3;

/** Rows of Chute before switching to Chicane within a FLOW macro segment. */
export const FLOW_CHUTE_ROWS_BEFORE_CHICANE = 10;

/**
 * Chicane: how many consecutive rows reuse the same 3-wide gap before the center shifts.
 * Higher = more vertical "runway" in the same corridor (full brick rows, water still reads continuous).
 * 2 felt too pinchy at higher water speeds; 3+ gives time to commit before the lateral step.
 */
export const CHICANE_DEFAULT_BLOCK_N = 3;

export type ChicaneState = {
  /** Center column index of the 3-wide gap (passable at center-1, center, center+1). */
  center: number;
  /** Rows emitted at current `center` since last shift (0 .. n-1). */
  rowsInBlock: number;
  /** Horizontal step sign (+2 / -2) when shifting. */
  direction: 1 | -1;
};

/** Valid center range so gap columns stay in [0, columnCount-1]. */
export function flowGapCenterBounds(columnCount: number): { lo: number; hi: number } {
  'worklet';
  const lo = 1;
  const hi = Math.max(lo, columnCount - 2);
  return { lo, hi };
}

export function clampGapCenter(center: number, columnCount: number): number {
  'worklet';
  const { lo, hi } = flowGapCenterBounds(columnCount);
  return Math.max(lo, Math.min(hi, Math.round(center)));
}

/**
 * Center index of a length-3 contiguous gap run, or middle of first qualifying run.
 */
export function extractTripleGapCenter(row: SwimmerRow, columnCount: number): number | null {
  'worklet';
  const gaps = gapsFromRow(row);
  if (gaps.length < 3) return null;
  for (let i = 0; i <= gaps.length - 3; i++) {
    const a = gaps[i];
    const b = gaps[i + 1];
    const c = gaps[i + 2];
    if (b === a + 1 && c === b + 1) {
      return b;
    }
  }
  return gaps[Math.floor(gaps.length / 2)] ?? null;
}

/** Build a row with exactly three passable columns around `center`. */
export function rowFromGapCenter(center: number, columnCount: number): SwimmerRow {
  'worklet';
  const c = clampGapCenter(center, columnCount);
  return rowFromGaps([c - 1, c, c + 1], columnCount);
}

/**
 * The Chute — fixed W=3 gap: copy the previous row bit-for-bit (same gap placement).
 * If there is no previous row, seed a centered chute at column floor(columnCount/2).
 */
export function flowChuteNextRow(
  lastGeneratedRow: SwimmerRow | null,
  columnCount: number
): SwimmerRow {
  'worklet';
  if (!lastGeneratedRow || lastGeneratedRow.length === 0) {
    const seed = Math.floor(columnCount / 2);
    return rowFromGapCenter(seed, columnCount);
  }
  const out: SwimmerRow = new Array(lastGeneratedRow.length) as SwimmerRow;
  for (let i = 0; i < lastGeneratedRow.length; i++) {
    out[i] = lastGeneratedRow[i];
  }
  return out;
}

export function createChicaneStateFromEntryCenter(
  entryCenter: number,
  columnCount: number,
  initialDirection: 1 | -1 = 1
): ChicaneState {
  'worklet';
  return {
    center: clampGapCenter(entryCenter, columnCount),
    rowsInBlock: 0,
    direction: initialDirection,
  };
}

/**
 * The Chicane — 3-wide gap; every `n` emitted rows, shift center by ±2 with wall bounce.
 * `lastGeneratedRow` is reserved for seam alignment extensions; seam vs previous row is ensured by the caller.
 */
export function flowChicaneNextRow(
  _lastGeneratedRow: SwimmerRow | null,
  state: ChicaneState,
  columnCount: number,
  blockRowCount?: number
): { row: SwimmerRow; state: ChicaneState } {
  'worklet';
  const n = blockRowCount ?? 2;
  const { lo, hi } = flowGapCenterBounds(columnCount);

  let center = clampGapCenter(state.center, columnCount);
  let rowsInBlock = state.rowsInBlock;
  let direction = state.direction;

  const row = rowFromGapCenter(center, columnCount);

  rowsInBlock += 1;
  if (rowsInBlock >= n) {
    rowsInBlock = 0;
    let next = center + direction * 2;
    if (next < lo || next > hi) {
      direction = (direction === 1 ? -1 : 1) as 1 | -1;
      next = center + direction * 2;
    }
    center = Math.max(lo, Math.min(hi, next));
  }

  return {
    row,
    state: { center, rowsInBlock, direction },
  };
}
