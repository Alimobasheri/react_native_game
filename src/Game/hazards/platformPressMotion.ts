/**
 * Platform press motion — mirrors scripts/stage-design-lab/hazard-sim.js simPlatform.
 * Worklet-safe: plain numbers + Math only.
 */

import {
  blockColsFromSlab,
  platformSlabExtents,
} from '@/Game/path/platformShaft/primitives';
import type {
  PlatformSlabHazard,
  PressEase,
} from '@/Game/path/platformShaft/types';

const clamp01 = (t: number): number => {
  'worklet';
  return Math.max(0, Math.min(1, t));
};

const pressEaseLinear = (t: number): number => {
  'worklet';
  return t;
};

const pressEaseIn = (t: number): number => {
  'worklet';
  return t * t * t;
};

const pressEaseOut = (t: number): number => {
  'worklet';
  return 1 - Math.pow(1 - t, 3);
};

const pressEaseInOut = (t: number): number => {
  'worklet';
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

export const applyPressEase = (t: number, kind?: PressEase): number => {
  'worklet';
  const clamped = clamp01(t);
  const ease = kind ?? 'ease-out';
  if (ease === 'linear') return pressEaseLinear(clamped);
  if (ease === 'ease-in') return pressEaseIn(clamped);
  if (ease === 'ease-in-out') return pressEaseInOut(clamped);
  return pressEaseOut(clamped);
};

export type PlatformPressSimResult = {
  pressT: number;
  pressExtent: number;
  slabStart: number;
  slabEnd: number;
  blockCols: number[];
  colStart: number;
  colEnd: number;
};

/** Resolve press duration in seconds — row-clock preferred when rows + rowDurationSec set. */
export const resolvePressDurationSec = (
  hazard: PlatformSlabHazard,
  rowDurationSec?: number
): number => {
  'worklet';
  const p = hazard.params;
  const rows = p.pressDurationRows;
  if (
    rows != null &&
    Number.isFinite(rows) &&
    rowDurationSec != null &&
    Number.isFinite(rowDurationSec) &&
    rowDurationSec > 0
  ) {
    return Math.max(0.05, rows * rowDurationSec);
  }
  return Math.max(0.05, p.pressDurationSec ?? 0.8);
};

export const pressExtentAtLocalSec = (
  hazard: PlatformSlabHazard,
  localSec: number,
  rowDurationSec?: number
): { pressT: number; pressExtent: number } => {
  'worklet';
  const p = hazard.params;
  const pressCols = Math.max(0, p.pressCols ?? 1);
  const pressDuration = resolvePressDurationSec(hazard, rowDurationSec);
  let pressT = 0;
  if (localSec > 0) {
    pressT = applyPressEase(
      Math.min(1, localSec / pressDuration),
      p.pressEase ?? 'ease-out'
    );
  }
  return { pressT, pressExtent: pressCols * pressT };
};

export const simPlatformPress = (
  hazard: PlatformSlabHazard,
  columns: number,
  localSec: number,
  rowIndex: number,
  rowDurationSec?: number
): PlatformPressSimResult | null => {
  'worklet';
  const b = hazard.bounds;
  if (!b || rowIndex < b.rowStart || rowIndex > b.rowEnd) {
    return null;
  }
  const pressDir =
    hazard.params.pressDirection ?? (hazard.side === 'left' ? 'right' : 'left');
  const { pressT, pressExtent } = pressExtentAtLocalSec(hazard, localSec, rowDurationSec);
  const { slabStart, slabEnd } = platformSlabExtents(
    b,
    pressDir,
    pressExtent,
    columns
  );
  const blockCols = blockColsFromSlab(slabStart, slabEnd, columns);
  const colStart = Math.max(0, Math.floor(slabStart));
  const colEnd = Math.min(columns - 1, Math.max(colStart, Math.ceil(slabEnd) - 1));
  return {
    pressT,
    pressExtent,
    slabStart,
    slabEnd,
    blockCols,
    colStart,
    colEnd,
  };
};

/** Fraction of a grid column the press slab must cover before that gap col blocks collision. */
const COLLISION_GAP_CLOSE_OVERLAP = 0.999;

export const gapColumnOverlap = (
  slabStart: number,
  slabEnd: number,
  col: number
): number => {
  'worklet';
  return Math.min(slabEnd, col + 1) - Math.max(slabStart, col);
};

/**
 * Gap columns that narrow swimmer collision — not lab occupancy / render telegraph.
 * At pressExtent 0 the anchor wall is visible steel but corridor gaps stay open (no invisible pin).
 */
export const gapColsClosedByPressForCollision = (
  baseGaps: readonly number[],
  sim: Pick<PlatformPressSimResult, 'slabStart' | 'slabEnd' | 'pressExtent'>
): number[] => {
  'worklet';
  if (sim.pressExtent <= 1e-3) {
    return [];
  }
  const closed: number[] = [];
  for (let i = 0; i < baseGaps.length; i++) {
    const col = baseGaps[i];
    if (gapColumnOverlap(sim.slabStart, sim.slabEnd, col) >= COLLISION_GAP_CLOSE_OVERLAP) {
      closed.push(col);
    }
  }
  return closed;
};

export const effectiveGapsAtPressPhase = (
  baseGaps: readonly number[],
  hazard: PlatformSlabHazard,
  rowIndex: number,
  columns: number,
  localSec: number,
  rowDurationSec?: number
): number[] => {
  'worklet';
  const sim = simPlatformPress(hazard, columns, localSec, rowIndex, rowDurationSec);
  if (!sim) {
    return baseGaps.slice();
  }
  // Telegraph-only frame: show steel visually, but do not narrow passage/collision yet.
  if (sim.pressExtent <= 1e-3) {
    return baseGaps.slice();
  }
  const gapSet = new Set(baseGaps);
  for (let i = 0; i < sim.blockCols.length; i++) {
    gapSet.delete(sim.blockCols[i]);
  }
  const result: number[] = [];
  gapSet.forEach((c) => result.push(c));
  result.sort((a, b) => a - b);
  return result;
};

export const hazardAnimStartRow = (
  hazard: PlatformSlabHazard,
  totalRows: number
): number => {
  'worklet';
  const p = hazard.params;
  const b = hazard.bounds;
  const platformRow = b.rowStart;
  if (p.animStartRow != null && Number.isFinite(p.animStartRow)) {
    return Math.max(0, Math.min(Math.round(p.animStartRow), Math.max(0, totalRows - 1)));
  }
  return platformRow;
};

export const hazardAnimLocalSecFromBeatRow = (
  hazard: PlatformSlabHazard,
  waterBeatRowIndex: number,
  rowDurationSec: number,
  totalRows: number
): number => {
  'worklet';
  const startRow = hazardAnimStartRow(hazard, totalRows);
  if (waterBeatRowIndex < startRow) {
    return 0;
  }
  return Math.max(0, (waterBeatRowIndex - startRow) * rowDurationSec);
};
