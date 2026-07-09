/**
 * Row-clock press timing — scroll-speed invariant beat alignment (v2 spec §3.2).
 * Worklet-safe.
 */

import { platformShaftTuning } from '@/config/platformShaftTuning';
import { lerpNum } from '@/Game/path/platformShaft/primitives';

export const rowDurationSecFromSpeed = (
  blockHeight: number,
  raisingSpeed: number
): number => {
  'worklet';
  if (raisingSpeed <= 0) return 0.1;
  return blockHeight / raisingSpeed;
};

export const clearanceRowsFromSwimmer = (
  swimmerHeight: number,
  blockHeight: number,
  marginRows?: number
): number => {
  'worklet';
  const margin = marginRows ?? platformShaftTuning.CLEARANCE_MARGIN_ROWS;
  const bh = Math.max(1, blockHeight);
  return Math.max(1, Math.ceil(swimmerHeight / bh) + margin);
};

export const pressStartRowFromShaft = (
  shaftRow: number,
  telegraphRows: number
): number => {
  'worklet';
  return Math.max(0, shaftRow - Math.max(0, Math.round(telegraphRows)));
};

export const pressFullRowFromClearance = (
  shaftRow: number,
  clearanceRows: number
): number => {
  'worklet';
  return shaftRow + Math.max(0, Math.round(clearanceRows));
};

export const pressDurationRowsFromTiming = (
  pressStartRow: number,
  pressFullRow: number
): number => {
  'worklet';
  return Math.max(1, pressFullRow - pressStartRow);
};

export const pressDurationSecFromRows = (
  pressDurationRows: number,
  rowDurationSec: number
): number => {
  'worklet';
  return Math.max(0.05, pressDurationRows * rowDurationSec);
};

export const telegraphRowsForDifficulty = (difficulty01: number): number => {
  'worklet';
  const d = Math.max(0, Math.min(1, difficulty01));
  const t = platformShaftTuning;
  return Math.round(lerpNum(t.TELEGRAPH_ROWS_EASY, t.TELEGRAPH_ROWS_HARD, d));
};

export type RowClockPressTiming = {
  pressStartRow: number;
  pressFullRow: number;
  pressDurationRows: number;
  telegraphRows: number;
  clearanceRows: number;
};

export type ComputeRowClockPressTimingParams = {
  shaftRow: number;
  difficulty01?: number;
  swimmerHeight: number;
  blockHeight: number;
  speedMul?: number;
  telegraphRowsOverride?: number;
  clearanceMarginRows?: number;
};

/** Barely-clear row-clock bundle for one shaft row (P3 deriveShafts). */
export const computeRowClockPressTiming = (
  params: ComputeRowClockPressTimingParams
): RowClockPressTiming => {
  'worklet';
  const difficulty01 = Math.max(0, Math.min(1, params.difficulty01 ?? 0.2));
  const speedMul = params.speedMul ?? platformShaftTuning.SPEED_TIER_NORM;
  const telegraphRows =
    params.telegraphRowsOverride ?? telegraphRowsForDifficulty(difficulty01);
  const clearanceRows = clearanceRowsFromSwimmer(
    params.swimmerHeight,
    params.blockHeight,
    params.clearanceMarginRows
  );
  const pressStartRow = pressStartRowFromShaft(params.shaftRow, telegraphRows);
  const pressFullRow = pressFullRowFromClearance(params.shaftRow, clearanceRows);
  let pressDurationRows = pressDurationRowsFromTiming(pressStartRow, pressFullRow);
  pressDurationRows = Math.max(1, Math.round(pressDurationRows * speedMul));
  return {
    pressStartRow,
    pressFullRow,
    pressDurationRows,
    telegraphRows,
    clearanceRows,
  };
};
