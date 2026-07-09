/**
 * Gap-shift runway — same invariant as chicane / directed paths:
 * ~1 column lateral move per GAP_SHIFT_ROWS_PER_COL wide rows before the path
 * center or pin geometry changes. Hazards decorate; they must not violate this.
 */

import { platformShaftTuning } from '@/config/platformShaftTuning';
import { topologyFromGaps } from '@/Game/feedback/gapTopology';
import { restGapsFromPathRow } from '@/Game/path/platformShaft/pathIntent/ceilingPinPolicy';
import type { PathRowIntent } from '@/Game/path/platformShaft/pathIntent/types';

const centerConstraintAtRow = (
  pathRows: readonly PathRowIntent[],
  rowIndex: number,
  columns: number
): boolean => {
  'worklet';
  if (rowIndex <= 0) return false;
  const prev = topologyFromGaps(
    restGapsFromPathRow(pathRows[rowIndex - 1]!, columns),
    columns
  );
  const cur = topologyFromGaps(
    restGapsFromPathRow(pathRows[rowIndex]!, columns),
    columns
  );
  if (Math.abs(cur.center - prev.center) > 0.01) return true;
  const pr = pathRows[rowIndex]!;
  return Boolean(pr.staticBlocks && pr.staticBlocks.length > 0);
};

/** Next row where rest gap center or pin geometry changes. */
export const nextCenterConstraintRow = (
  pathRows: readonly PathRowIntent[],
  fromRow: number,
  columns: number
): number => {
  'worklet';
  for (let j = fromRow + 1; j < pathRows.length; j++) {
    if (centerConstraintAtRow(pathRows, j, columns)) return j;
  }
  return pathRows.length - 1;
};

export const restCenterAtRow = (
  pathRows: readonly PathRowIntent[],
  rowIndex: number,
  columns: number
): number => {
  'worklet';
  return topologyFromGaps(
    restGapsFromPathRow(pathRows[rowIndex]!, columns),
    columns
  ).center;
};

/**
 * True when achievable gap-center cannot reach the next constraint in remaining rows
 * at ~1 col per `rowsPerColShift` wide rows.
 */
export const gapShiftBudgetExceeded = (
  pathRows: readonly PathRowIntent[],
  rowIndex: number,
  achievableCenter: number,
  columns: number,
  rowsPerColShift: number = platformShaftTuning.GAP_SHIFT_ROWS_PER_COL
): boolean => {
  'worklet';
  const constraintRow = nextCenterConstraintRow(pathRows, rowIndex, columns);
  const targetCenter = restCenterAtRow(pathRows, constraintRow, columns);
  const rowsUntil = Math.max(1, constraintRow - rowIndex);
  const driftNeeded = Math.abs(targetCenter - achievableCenter);
  return driftNeeded > rowsUntil / rowsPerColShift + 1e-3;
};

/** Advance achievable center one runway row toward `targetCenter`. */
export const advanceGapCenterOnRunway = (
  achievableCenter: number,
  targetCenter: number,
  rowsPerColShift: number = platformShaftTuning.GAP_SHIFT_ROWS_PER_COL
): number => {
  'worklet';
  const delta = targetCenter - achievableCenter;
  if (Math.abs(delta) < 1e-3) return achievableCenter;
  const step = Math.sign(delta) * Math.min(Math.abs(delta), 1 / rowsPerColShift);
  return achievableCenter + step;
};
