/**
 * Corner-stack shaft flow — lookahead phase plan per path segment.
 *
 * Escalate → peak → deescalate → gap-shift runway before each center constraint.
 * Used by pathChicaneShaft and other directed paths that crush to a corner.
 */

import { platformShaftTuning } from '@/config/platformShaftTuning';
import {
  nextCenterConstraintRow,
  restCenterAtRow,
} from '@/Game/path/platformShaft/pathIntent/gapShiftPlan';
import type { PathRowIntent } from '@/Game/path/platformShaft/pathIntent/types';
import { lerpNum } from '@/Game/path/platformShaft/primitives';
import type {
  CornerStackFlowPlan,
  CornerStackPhase,
  CornerStackRowPlan,
  PlanCornerStackFlowParams,
} from '@/Game/path/platformShaft/shaftScheduler/shaftFlowTypes';
import { isCeilingPinRow, shaftSideForPathRow } from '@/Game/path/platformShaft/shaftScheduler/stackTailPolicy';

const minEscalateRowsForDifficulty = (difficulty01: number): number => {
  'worklet';
  const t = platformShaftTuning;
  return Math.round(
    lerpNum(t.SHAFT_BUILD_ROWS_MIN_EASY, t.SHAFT_BUILD_ROWS_MIN_HARD, difficulty01)
  );
};

const peakSurvivorColForSegment = (
  pathRows: readonly PathRowIntent[],
  segStart: number,
  columns: number
): number => {
  'worklet';
  const pr = pathRows[segStart]!;
  const side = shaftSideForPathRow(pr);
  const narrow = pr.narrowGaps;
  if (!narrow.length) return Math.floor(columns / 2);
  return side === 'right' ? Math.min(...narrow) : Math.max(...narrow);
};

const maxPressForCorridor = (
  corridorGapWidth: number,
  minResidual: number
): number => {
  'worklet';
  return Math.max(1, corridorGapWidth - minResidual);
};

const cornerStackRow = (
  rowIndex: number,
  phase: CornerStackPhase,
  fields: Omit<CornerStackRowPlan, 'rowIndex' | 'flowKind' | 'phase'>
): CornerStackRowPlan => {
  'worklet';
  return ({
    rowIndex,
    flowKind: 'corner_stack',
    phase,
    ...fields,
  });
};

/** All center-constraint row indices from shaftStart onward (pins + path center jumps). */
export const collectCenterConstraints = (
  pathRows: readonly PathRowIntent[],
  shaftStart: number,
  columns: number
): number[] => {
  'worklet';
  const out: number[] = [];
  let cursor = shaftStart;
  while (cursor < pathRows.length - 1) {
    const next = nextCenterConstraintRow(pathRows, cursor, columns);
    if (next <= cursor) break;
    out.push(next);
    cursor = next;
  }
  return out;
};

/**
 * Lookahead plan for corner-stack flow: each segment gets
 * escalate → peak → deescalate → gap_shift_runway before its constraint.
 */
export const planCornerStackFlow = (
  pathRows: readonly PathRowIntent[],
  params: PlanCornerStackFlowParams
): CornerStackFlowPlan => {
  'worklet';
  const {
    columns,
    shaftStartRow,
    wideGapCols,
    difficulty01,
    minResidualGapCols,
  } = params;
  const rpc = platformShaftTuning.GAP_SHIFT_ROWS_PER_COL;
  const minEscalate = minEscalateRowsForDifficulty(difficulty01);
  const peakHold = platformShaftTuning.SHAFT_PEAK_HOLD_ROWS;
  const maxPressGeom = maxPressForCorridor(wideGapCols, minResidualGapCols);

  const rows: CornerStackRowPlan[] = pathRows.map((_, rowIndex) =>
    cornerStackRow(rowIndex, rowIndex < shaftStartRow ? 'teach_open' : 'escalate', {
      preferHighPress: true,
      maxPressCols: maxPressGeom,
      minPressCols: 1,
      runwayOnly: rowIndex < shaftStartRow,
      relaxFullPressOverlap: false,
    })
  );

  const constraints = collectCenterConstraints(pathRows, shaftStartRow, columns);
  let segStart = shaftStartRow;

  for (let c = 0; c < constraints.length; c++) {
    const constraintIdx = constraints[c]!;
    const segLen = constraintIdx - segStart;
    if (segLen <= 0) {
      segStart = constraintIdx + (isCeilingPinRow(pathRows[constraintIdx]!) ? 1 : 0);
      continue;
    }

    const isPin = isCeilingPinRow(pathRows[constraintIdx]!);
    const peakCol = peakSurvivorColForSegment(pathRows, segStart, columns);
    const targetCenter = restCenterAtRow(pathRows, constraintIdx, columns);
    const driftCols = Math.abs(targetCenter - peakCol);
    let deescalateRows = Math.max(1, Math.ceil(driftCols) * rpc);

    let escalateRows = Math.max(0, segLen - deescalateRows);
    if (escalateRows < minEscalate && segLen > minEscalate) {
      deescalateRows = Math.max(1, segLen - minEscalate);
      escalateRows = segLen - deescalateRows;
    }

    const peakRows = Math.min(peakHold, Math.max(0, escalateRows - 1));
    const rampRows = Math.max(0, escalateRows - peakRows);

    for (let i = segStart; i < constraintIdx; i++) {
      const offset = i - segStart;
      if (offset < rampRows) {
        const t = rampRows <= 1 ? 1 : offset / (rampRows - 1);
        const maxPress = Math.max(1, Math.round(lerpNum(1, maxPressGeom, t)));
        rows[i] = cornerStackRow(i, 'escalate', {
          preferHighPress: true,
          maxPressCols: maxPress,
          minPressCols: 1,
          runwayOnly: false,
          relaxFullPressOverlap: true,
        });
      } else if (offset < escalateRows) {
        rows[i] = cornerStackRow(i, 'peak', {
          preferHighPress: true,
          maxPressCols: maxPressGeom,
          minPressCols: maxPressGeom,
          runwayOnly: false,
          relaxFullPressOverlap: true,
        });
      } else {
        const relOff = offset - escalateRows;
        const relT = deescalateRows <= 1 ? 1 : relOff / (deescalateRows - 1);
        const maxPress = Math.max(0, Math.round(lerpNum(maxPressGeom, 0, relT)));
        if (maxPress <= 0) {
          rows[i] = cornerStackRow(i, 'gap_shift_runway', {
            preferHighPress: false,
            maxPressCols: 0,
            minPressCols: 0,
            runwayOnly: true,
            relaxFullPressOverlap: true,
          });
        } else {
          rows[i] = cornerStackRow(i, 'deescalate', {
            preferHighPress: false,
            maxPressCols: maxPress,
            minPressCols: 1,
            runwayOnly: false,
            relaxFullPressOverlap: true,
          });
        }
      }
    }

    if (isPin) {
      rows[constraintIdx] = cornerStackRow(constraintIdx, 'ceiling_pin', {
        preferHighPress: false,
        maxPressCols: 0,
        minPressCols: 0,
        runwayOnly: true,
        relaxFullPressOverlap: true,
      });
      segStart = constraintIdx + 1;
    } else {
      segStart = constraintIdx;
    }
  }

  return { flowKind: 'corner_stack', rows };
};

/** @deprecated Use planCornerStackFlow */
export const planDirectedShaftPhases = (
  pathRows: readonly PathRowIntent[],
  params: PlanCornerStackFlowParams
): CornerStackRowPlan[] => planCornerStackFlow(pathRows, params).rows;

/** @deprecated Use CornerStackPhase */
export type ShaftStackPhase = CornerStackPhase;

/** @deprecated Use CornerStackRowPlan */
export type ShaftRowPhase = CornerStackRowPlan;

/** @deprecated Use PlanCornerStackFlowParams */
export type PlanShaftPhasesParams = PlanCornerStackFlowParams;
