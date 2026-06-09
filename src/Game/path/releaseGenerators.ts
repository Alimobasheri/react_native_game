/**
 * RELEASE phase — Cathartic Rest Zone: side walls only, full interior channel (worklet-safe).
 */

import { rowFromGaps, type SwimmerRow } from './swimmerGrid';

/** Deterministic wide-open strip length (matches 55-row macro RELEASE span). */
export const RELEASE_REST_ZONE_ROWS = 10;

/** Gaps for columns `1 .. columnCount-2` (interior only; edges stay solid). */
export function releaseCatharticRestZoneGaps(columnCount: number): number[] {
  'worklet';
  const gaps: number[] = [];
  for (let c = 1; c <= columnCount - 2; c++) {
    gaps.push(c);
  }
  return gaps;
}

export function releaseCatharticRestZoneRow(columnCount: number): SwimmerRow {
  'worklet';
  return rowFromGaps(releaseCatharticRestZoneGaps(columnCount), columnCount);
}

/** Layout check: exactly two solids at edges, full interior open. */
export function releaseRestZoneRowIsValid(row: readonly SwimmerRow[], columnCount: number): boolean {
  'worklet';
  if (row.length !== columnCount || columnCount < 3) return false;
  if (row[0] !== 1 || row[columnCount - 1] !== 1) return false;
  for (let c = 1; c <= columnCount - 2; c++) {
    if (row[c] !== 0) return false;
  }
  return true;
}

export function releaseRestZoneInteriorWidth(columnCount: number): number {
  'worklet';
  return Math.max(0, columnCount - 2);
}
