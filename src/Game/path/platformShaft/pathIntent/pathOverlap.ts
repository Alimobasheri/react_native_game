/**
 * Path continuity helpers — SH-005 on wide static gaps.
 * Worklet-safe.
 */

import type { PathRowIntent } from '@/Game/path/platformShaft/pathIntent/types';

export const countGapOverlap = (a: readonly number[], b: readonly number[]): number => {
  'worklet';
  const setB = new Set(b);
  let count = 0;
  for (let i = 0; i < a.length; i++) {
    if (setB.has(a[i])) count++;
  }
  return count;
};

export const pathRowsOverlapOk = (
  prev: PathRowIntent | undefined,
  curr: PathRowIntent,
  minOverlapCols: number
): boolean => {
  'worklet';
  if (!prev) return true;
  return countGapOverlap(prev.wideGaps, curr.wideGaps) >= minOverlapCols;
};

export const validatePathOverlap = (
  rows: readonly PathRowIntent[],
  minOverlapCols: number
): boolean => {
  'worklet';
  for (let i = 1; i < rows.length; i++) {
    if (!pathRowsOverlapOk(rows[i - 1], rows[i], minOverlapCols)) {
      return false;
    }
  }
  return true;
};
