/**
 * Procedural ceiling pins — section breaks between shaft groups (v2 spec §3.6).
 * Worklet-safe.
 */

import { mixU32, unitFloatFromU32 } from '@/Game/path/deterministicMix';
import { blocksFromGaps, gapColsFromWidth } from '@/Game/path/platformShaft/primitives';
import type { CeilingPinContext, PathRowIntent } from '@/Game/path/platformShaft/pathIntent/types';

export const ceilingPinRoll = (seed: number, row: number): number => {
  'worklet';
  return unitFloatFromU32(mixU32(seed >>> 0, row >>> 0, 0xce1a9e17));
};

export const blockColsOnSide = (
  columns: number,
  side: 'left' | 'right',
  count: number
): number[] => {
  'worklet';
  const n = Math.max(1, Math.min(count, columns));
  const blocks: number[] = [];
  if (side === 'left') {
    for (let c = 0; c < n && c < columns; c++) blocks.push(c);
  } else {
    for (let c = columns - 1; c >= 0 && blocks.length < n; c--) blocks.push(c);
  }
  return blocks.sort((a, b) => a - b);
};

/** Pin cols on the side the path is pushing toward. */
export const ceilingPinBlocksForPush = (
  columns: number,
  pushDirection: -1 | 0 | 1
): number[] => {
  'worklet';
  if (pushDirection === 0) return [];
  if (pushDirection === 1) {
    return blockColsOnSide(columns, 'right', 2);
  }
  return blockColsOnSide(columns, 'left', 2);
};

export const mergeStaticBlocks = (
  wideGaps: readonly number[],
  pinBlocks: readonly number[],
  columns: number
): number[] => {
  'worklet';
  const gapSet = new Set(wideGaps);
  const merged = new Set<number>();
  for (let c = 0; c < columns; c++) {
    if (!gapSet.has(c)) merged.add(c);
  }
  for (let i = 0; i < pinBlocks.length; i++) {
    merged.add(pinBlocks[i]);
  }
  const result: number[] = [];
  merged.forEach((c) => result.push(c));
  result.sort((a, b) => a - b);
  return result;
};

export type ApplyCeilingPinResult = {
  row: PathRowIntent;
  sectionId: number;
  pinned: boolean;
};

/**
 * Maybe inject ceiling pin after a chicane shift (pushDirection ≠ 0).
 * Bumps sectionId when pin lands.
 */
export const applyCeilingPinPolicy = (
  row: PathRowIntent,
  ctx: CeilingPinContext
): ApplyCeilingPinResult => {
  'worklet';
  let sectionId = ctx.sectionId;
  if (ctx.pushDirection === 0) {
    return { row, sectionId, pinned: false };
  }
  const roll = ceilingPinRoll(ctx.seed, row.row);
  if (roll >= ctx.pinChance) {
    return { row, sectionId, pinned: false };
  }
  const pinBlocks = ceilingPinBlocksForPush(ctx.columns, ctx.pushDirection);
  if (!pinBlocks.length) {
    return { row, sectionId, pinned: false };
  }
  sectionId += 1;
  const staticBlocks = mergeStaticBlocks(row.wideGaps, pinBlocks, ctx.columns);
  return {
    row: { ...row, staticBlocks, sectionId },
    sectionId,
    pinned: true,
  };
};

/** Rest row blocks = complement of wide gaps + optional static pin cols. */
export const restBlocksFromPathRow = (row: PathRowIntent, columns: number): number[] => {
  'worklet';
  if (row.staticBlocks?.length) {
    return row.staticBlocks.slice();
  }
  return blocksFromGaps(columns, row.wideGaps);
};

/** Gaps for spawn — wide corridor; pins remove cols from gaps. */
export const restGapsFromPathRow = (row: PathRowIntent, columns: number): number[] => {
  'worklet';
  if (!row.staticBlocks?.length) {
    return row.wideGaps.slice();
  }
  const blockSet = new Set(row.staticBlocks);
  const gaps: number[] = [];
  for (let c = 0; c < columns; c++) {
    if (!blockSet.has(c)) gaps.push(c);
  }
  return gaps;
};

export const narrowGapsAtCenter = (
  columns: number,
  pathCenterCol: number,
  narrowWidth: number
): number[] => {
  'worklet';
  return gapColsFromWidth(columns, narrowWidth, pathCenterCol);
};
