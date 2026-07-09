/**
 * Ceiling approach release — N wide rows BEFORE each ceiling pin (not on/after pin).
 * Corridor-shift release — wide runway before path center jumps (segment tail escape).
 * Worklet-safe.
 */

import type { PathRowIntent } from '@/Game/path/platformShaft/pathIntent/types';
import type { PlatformSide } from '@/Game/path/platformShaft/types';
import { platformShaftTuning } from '@/config/platformShaftTuning';

export const shaftSideForPathRow = (
  row: Pick<PathRowIntent, 'wideGaps' | 'narrowGaps' | 'shaftSide'>
): PlatformSide => {
  'worklet';
  if (row.shaftSide === 'left' || row.shaftSide === 'right') {
    return row.shaftSide;
  }
  const narrowMid = (Math.min(...row.narrowGaps) + Math.max(...row.narrowGaps)) / 2;
  const wideMid = (Math.min(...row.wideGaps) + Math.max(...row.wideGaps)) / 2;
  return narrowMid >= wideMid ? 'left' : 'right';
};

export const isCeilingPinRow = (row: PathRowIntent): boolean => {
  'worklet';
  return !!(row.staticBlocks && row.staticBlocks.length > 0);
};

export const ceilingPinIndices = (pathRows: readonly PathRowIntent[]): number[] => {
  'worklet';
  const out: number[] = [];
  for (let i = 0; i < pathRows.length; i++) {
    if (isCeilingPinRow(pathRows[i]!)) out.push(i);
  }
  return out;
};

/** Pin blocks on the push side (exclude outer wall cols 0 and columns-1). */
export const countPinPushBlocks = (pinRow: PathRowIntent, columns: number): number => {
  'worklet';
  const blocks = pinRow.staticBlocks ?? [];
  let count = 0;
  for (let i = 0; i < blocks.length; i++) {
    const col = blocks[i]!;
    if (col > 0 && col < columns - 1) {
      count++;
    }
  }
  return count;
};

/**
 * Wide-gap runway length before a ceiling pin — scales with push-side block count.
 * 2-block pin → 4 rows (2 cols/block); each extra push block adds 2 rows.
 */
export const ceilingApproachLeadRowsForPin = (
  pinRow: PathRowIntent,
  columns: number,
  minLeadRows?: number
): number => {
  'worklet';
  const pushBlocks = countPinPushBlocks(pinRow, columns);
  const perBlock = platformShaftTuning.CEILING_APPROACH_ROWS_PER_PIN_BLOCK;
  const minRows = minLeadRows ?? platformShaftTuning.CEILING_PIN_LEAD_ROWS;
  return Math.max(minRows, pushBlocks * perBlock);
};

/**
 * Rank 1..leadRows for rows strictly BEFORE a ceiling pin (pin row excluded).
 * 0 = not an approach release row.
 */
export const ceilingApproachReleaseRank = (
  localIndex: number,
  pathRows: readonly PathRowIntent[],
  shaftStart: number,
  defaultLeadRows: number,
  columns: number
): number => {
  'worklet';
  const pins = ceilingPinIndices(pathRows);
  let bestRank = 0;
  for (let p = 0; p < pins.length; p++) {
    const pinIdx = pins[p]!;
    const leadRows = ceilingApproachLeadRowsForPin(
      pathRows[pinIdx]!,
      columns,
      defaultLeadRows
    );
    const leadStart = Math.max(shaftStart, pinIdx - leadRows);
    if (localIndex >= leadStart && localIndex < pinIdx) {
      const rank = localIndex - leadStart + 1;
      if (rank > bestRank) {
        bestRank = rank;
      }
    }
  }
  return bestRank;
};

/**
 * Wide runway before path center shifts (segment tail / chicane bounce).
 * Rank 1..leadRows for rows strictly before the shift row.
 */
export const corridorShiftApproachReleaseRank = (
  localIndex: number,
  pathRows: readonly PathRowIntent[],
  shaftStart: number,
  leadRows: number
): number => {
  'worklet';
  let bestRank = 0;
  for (let shiftIdx = 1; shiftIdx < pathRows.length; shiftIdx++) {
    const prev = pathRows[shiftIdx - 1]!;
    const curr = pathRows[shiftIdx]!;
    if (curr.pathCenterCol === prev.pathCenterCol) {
      continue;
    }
    if (isCeilingPinRow(curr)) {
      continue;
    }
    const leadStart = Math.max(shaftStart, shiftIdx - leadRows);
    if (localIndex >= leadStart && localIndex < shiftIdx) {
      const rank = localIndex - leadStart + 1;
      if (rank > bestRank) {
        bestRank = rank;
      }
    }
  }
  return bestRank;
};

/** Last N approach rows before pin/shift: full wide corridor, zero steel. */
export const isPureApproachEscapeRow = (
  localIndex: number,
  pathRows: readonly PathRowIntent[],
  shaftStart: number,
  columns: number,
  defaultLeadRows: number
): boolean => {
  'worklet';
  const pureTail = platformShaftTuning.CEILING_APPROACH_PURE_ESCAPE_ROWS;
  const pins = ceilingPinIndices(pathRows);
  for (let p = 0; p < pins.length; p++) {
    const pinIdx = pins[p]!;
    const leadRows = ceilingApproachLeadRowsForPin(
      pathRows[pinIdx]!,
      columns,
      defaultLeadRows
    );
    const pureStart = Math.max(shaftStart, pinIdx - Math.min(pureTail, leadRows));
    if (localIndex >= pureStart && localIndex < pinIdx) {
      return true;
    }
  }
  const shiftLead = platformShaftTuning.SEGMENT_CORRIDOR_SHIFT_LEAD_ROWS;
  for (let shiftIdx = 1; shiftIdx < pathRows.length; shiftIdx++) {
    const prev = pathRows[shiftIdx - 1]!;
    const curr = pathRows[shiftIdx]!;
    if (curr.pathCenterCol === prev.pathCenterCol || isCeilingPinRow(curr)) {
      continue;
    }
    const pureStart = Math.max(shaftStart, shiftIdx - Math.min(pureTail, shiftLead));
    if (localIndex >= pureStart && localIndex < shiftIdx) {
      return true;
    }
  }
  return false;
};

export const defaultCeilingApproachRows = (): number => {
  'worklet';
  return platformShaftTuning.CEILING_PIN_LEAD_ROWS;
};

export const defaultCorridorShiftApproachRows = (): number => {
  'worklet';
  return platformShaftTuning.SEGMENT_CORRIDOR_SHIFT_LEAD_ROWS;
};

export const defaultCeilingApproachMinOpenCols = (): number => {
  'worklet';
  return platformShaftTuning.CEILING_APPROACH_MIN_OPEN_COLS;
};
