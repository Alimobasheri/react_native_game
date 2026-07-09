/**
 * Shaft flow kinds — how moving slabs decorate a path (P3).
 *
 * Each kind has its own phase planner and derive pass. Path-first authoring
 * stays shared; only hazard scheduling differs.
 */

import type { PathRowIntent } from '@/Game/path/platformShaft/pathIntent/types';

/** P3 hazard decoration strategy applied on top of PathRowIntent[]. */
export type ShaftFlowKind =
  /** Escalating stack pushes swimmer to survivor corner, peaks at 1-col, deescalates for gap shift. */
  | 'corner_stack'
  /** Wide path only — no moving slabs (teach runway / P1 preview). */
  | 'static_rest';

/**
 * Phases within one corner-stack segment (between gap-center constraints).
 *
 * Visual arc: room → crush corner → ease off → steer out → pin/shift.
 */
export type CornerStackPhase =
  | 'teach_open'
  | 'escalate'
  | 'peak'
  | 'deescalate'
  | 'gap_shift_runway'
  | 'ceiling_pin';

/** Per-row plan for corner-stack flow. */
export type CornerStackRowPlan = {
  rowIndex: number;
  flowKind: 'corner_stack';
  phase: CornerStackPhase;
  preferHighPress: boolean;
  maxPressCols: number | null;
  minPressCols: number;
  runwayOnly: boolean;
  relaxFullPressOverlap: boolean;
};

export type PlanCornerStackFlowParams = {
  columns: number;
  shaftStartRow: number;
  wideGapCols: number;
  difficulty01: number;
  minResidualGapCols: number;
};

export type CornerStackFlowPlan = {
  flowKind: 'corner_stack';
  rows: CornerStackRowPlan[];
};

export type ShaftFlowPlan = CornerStackFlowPlan;

export type DeriveShaftFlowContext = {
  flowKind: ShaftFlowKind;
  pathRows: readonly PathRowIntent[];
  columns: number;
  shaftStartRow: number;
  wideGapCols: number;
  difficulty01: number;
  minResidualGapCols: number;
};

/** Corner-stack flow applies escalating/deescalating slabs on shaft rows. */
export const isCornerStackFlow = (kind: ShaftFlowKind): kind is 'corner_stack' => {
  'worklet';
  return kind === 'corner_stack';
};
