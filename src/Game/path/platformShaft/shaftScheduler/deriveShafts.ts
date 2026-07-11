/**
 * Derive platform slabs from PathRowIntent — passage-aware (prev row gaps + timing).
 * Dispatches to a shaft flow planner (e.g. corner_stack) when decorating hazards.
 */

import { platformShaftTuning } from '@/config/platformShaftTuning';
import type { PathRowIntent } from '@/Game/path/platformShaft/pathIntent/types';
import { advanceGapCenterOnRunway, restCenterAtRow } from '@/Game/path/platformShaft/pathIntent/gapShiftPlan';
import {
  restBlocksFromPathRow,
  restGapsFromPathRow,
} from '@/Game/path/platformShaft/pathIntent/ceilingPinPolicy';
import { blocksFromGaps } from '@/Game/path/platformShaft/primitives';
import { planShaftFlow } from '@/Game/path/platformShaft/shaftScheduler/planShaftFlow';
import { computeRowClockPressTiming } from '@/Game/path/platformShaft/shaftScheduler/rowClock';
import {
  approachDriftOk,
  buildCorridorForPathRow,
  countGapOverlap,
  frameOuterWallGaps,
  gapCenterCol,
  passableGapsAtWaterBeat,
  pickSurvivorCol,
  planShaftPassage,
  repairPrevHazardPress,
} from '@/Game/path/platformShaft/shaftScheduler/passagePlanner';
import type { CornerStackRowPlan } from '@/Game/path/platformShaft/shaftScheduler/shaftFlowTypes';
import type { ShaftFlowKind } from '@/Game/path/platformShaft/shaftScheduler/shaftFlowTypes';
import { shaftSideForPathRow } from '@/Game/path/platformShaft/shaftScheduler/stackTailPolicy';
import type {
  PlatformShaftRowDef,
  PlatformSlabHazard,
} from '@/Game/path/platformShaft/types';

export type { ShaftFlowKind } from '@/Game/path/platformShaft/shaftScheduler/shaftFlowTypes';

export type DeriveShaftsParams = {
  columns: number;
  seed: number;
  difficulty01: number;
  swimmerHeight: number;
  blockHeight: number;
  raisingSpeed?: number;
  minResidualGapCols?: number;
  wideGapCols?: number;
  narrowGapCols?: number;
  shaftStartLocalRow?: number;
  /** P3 hazard decoration strategy. Default corner_stack for pathChicaneShaft. */
  shaftFlowKind?: ShaftFlowKind;
};

export type DeriveShaftsResult = {
  hazards: PlatformSlabHazard[];
  rows: PlatformShaftRowDef[];
  warnings: string[];
  shaftFlowKind: ShaftFlowKind;
};

type CommittedRow = {
  gaps: number[];
  blocks: number[];
  macroPhase: PlatformShaftRowDef['macroPhase'];
  hazard?: PlatformSlabHazard;
  rowIndex: number;
  corridorGapWidth: number;
};

const wideCorridorFromPath = (
  pr: PathRowIntent,
  columns: number
): { gaps: number[]; blocks: number[] } => {
  'worklet';
  const framed = frameOuterWallGaps(pr.wideGaps, columns);
  const gaps = framed.length ? framed : pr.wideGaps.slice();
  return { gaps, blocks: blocksFromGaps(columns, gaps) };
};

export const deriveShaftsFromPath = (
  pathRows: readonly PathRowIntent[],
  params: DeriveShaftsParams
): DeriveShaftsResult => {
  'worklet';
  const columns = params.columns;
  const minResidual =
    params.minResidualGapCols ?? platformShaftTuning.MIN_RESIDUAL_GAP_COLS;
  const wideW = params.wideGapCols ?? pathRows[0]?.wideGaps.length ?? 4;
  const shaftStart = params.shaftStartLocalRow ?? platformShaftTuning.PATH_SHAFT_START_ROW;
  const rowDurationSec = params.blockHeight / Math.max(1, params.raisingSpeed ?? 300);
  const totalRows = pathRows.length;
  const rowsPerCol = platformShaftTuning.GAP_SHIFT_ROWS_PER_COL;
  const hazards: PlatformSlabHazard[] = [];
  const rows: PlatformShaftRowDef[] = [];
  const warnings: string[] = [];
  const committed: CommittedRow[] = [];
  const gapHistory: number[][] = [];
  let hazardCounter = 0;

  const shaftFlowKind = params.shaftFlowKind ?? 'corner_stack';
  const flowPlan = planShaftFlow({
    flowKind: shaftFlowKind,
    pathRows,
    columns,
    shaftStartRow: shaftStart,
    wideGapCols: wideW,
    difficulty01: params.difficulty01,
    minResidualGapCols: minResidual,
  });
  const cornerStackRows =
    flowPlan?.flowKind === 'corner_stack' ? flowPlan.rows : null;

  let achievableCenter = gapCenterCol(pathRows[shaftStart]?.wideGaps ?? []);

  const rowPhaseAt = (index: number): CornerStackRowPlan | null =>
    cornerStackRows?.[index] ?? null;

  const peekNextCorridor = (index: number): { gaps: number[] } | undefined => {
    'worklet';
    const next = pathRows[index + 1];
    if (!next) return undefined;
    const nextPhase = rowPhaseAt(index + 1);
    if (nextPhase?.phase === 'ceiling_pin') {
      return { gaps: restGapsFromPathRow(next, columns) };
    }
    const side = shaftSideForPathRow(next);
    return buildCorridorForPathRow(columns, wideW, next.pathCenterCol, side);
  };

  for (let i = 0; i < pathRows.length; i++) {
    const pr = pathRows[i]!;
    const rowPhase = rowPhaseAt(i);

    if (i < shaftStart) {
      const framed = frameOuterWallGaps(pr.wideGaps, columns);
      const gaps = framed.length ? framed : pr.wideGaps.slice();
      const rowDef: CommittedRow = {
        gaps,
        blocks: blocksFromGaps(columns, gaps),
        macroPhase: pr.macroPhase,
        rowIndex: pr.row,
        corridorGapWidth: gaps.length,
      };
      rows.push(rowDef);
      committed.push(rowDef);
      gapHistory.push(gaps.slice());
      if (i === shaftStart - 1) {
        achievableCenter = gapCenterCol(gaps);
      }
      continue;
    }

    const side = shaftSideForPathRow(pr);
    const runwayOnly = rowPhase?.runwayOnly ?? shaftFlowKind === 'static_rest';
    const isPin = rowPhase?.phase === 'ceiling_pin';

    const corridor = isPin
      ? {
        gaps: restGapsFromPathRow(pr, columns),
        blocks: restBlocksFromPathRow(pr, columns),
      }
      : runwayOnly
        ? wideCorridorFromPath(pr, columns)
        : buildCorridorForPathRow(columns, wideW, pr.pathCenterCol, side);
    const beatRow = pr.row;
    const prev = committed[i - 1];
    const nextPeek = peekNextCorridor(i);

    let prevPassable = prev
      ? passableGapsAtWaterBeat(
        prev.gaps,
        prev.hazard,
        prev.rowIndex,
        beatRow,
        rowDurationSec,
        columns,
        totalRows
      )
      : corridor.gaps.slice();

    if (prev?.hazard && countGapOverlap(prevPassable, corridor.gaps) < 1) {
      const repaired = repairPrevHazardPress(
        prev.hazard,
        prev.gaps,
        prev.rowIndex,
        beatRow,
        corridor.gaps,
        rowDurationSec,
        columns,
        totalRows,
        minResidual,
        prev.corridorGapWidth
      );
      if (repaired) {
        const hzIdx = hazards.findIndex((h) => h.id === prev.hazard!.id);
        if (hzIdx >= 0) hazards[hzIdx] = repaired;
        committed[i - 1] = { ...prev, hazard: repaired };
        prevPassable = passableGapsAtWaterBeat(
          prev.gaps,
          repaired,
          prev.rowIndex,
          beatRow,
          rowDurationSec,
          columns,
          totalRows
        );
        warnings.push(
          `Row ${i}: reduced prev pressCols to ${repaired.params.pressCols} for seam overlap.`
        );
      }
    }

    const timing = computeRowClockPressTiming({
      shaftRow: pr.row,
      difficulty01: params.difficulty01,
      swimmerHeight: params.swimmerHeight,
      blockHeight: params.blockHeight,
    });

    const commitRestRow = (): void => {
      const rowDef: CommittedRow = {
        gaps: corridor.gaps,
        blocks: corridor.blocks,
        macroPhase: pr.macroPhase,
        rowIndex: pr.row,
        corridorGapWidth: corridor.gaps.length,
      };
      rows.push(rowDef);
      committed.push(rowDef);
      gapHistory.push(corridor.gaps.slice());
    };

    if (runwayOnly) {
      commitRestRow();
      const target = restCenterAtRow(pathRows, i, columns);
      achievableCenter = advanceGapCenterOnRunway(achievableCenter, target, rowsPerCol);
      continue;
    }

    const escapeBias = rowPhase?.phase === 'deescalate';
    let survivorCol = pickSurvivorCol(
      corridor.gaps,
      prevPassable,
      side,
      escapeBias,
      columns
    );
    const prevCenter = gapCenterCol(prevPassable);
    const driftNeed = Math.max(0, Math.round(Math.abs(survivorCol - prevCenter)));
    if (!approachDriftOk(gapHistory, prevCenter, survivorCol, driftNeed)) {
      const corridorCols = corridor.gaps.slice().sort((a, b) => a - b);
      survivorCol = corridorCols.reduce((best, c) => {
        const d = Math.abs(c - prevCenter);
        const bd = Math.abs(best - prevCenter);
        return d < bd ? c : best;
      }, corridorCols[0]!);
      warnings.push(
        `Row ${i}: drift budget short — survivor shifted to col ${survivorCol}.`
      );
    }

    const corridorMaxPress = Math.max(1, corridor.gaps.length - minResidual);
    const phaseMaxPress =
      rowPhase?.maxPressCols != null
        ? Math.min(rowPhase.maxPressCols, corridorMaxPress)
        : corridorMaxPress;
    const phaseMinPress = Math.min(rowPhase?.minPressCols ?? 1, phaseMaxPress);

    let plan = planShaftPassage({
      columns,
      corridorGaps: corridor.gaps,
      side,
      survivorCol,
      prevPassableGaps: prevPassable,
      timing,
      rowDurationSec,
      minResidualGapCols: minResidual,
      shaftBeatRow: beatRow,
      hazardRowIndex: pr.row,
      totalRows,
      seed: params.seed,
      hazardCounter: hazardCounter + 1,
      nextCorridorGaps: nextPeek?.gaps,
      nextBeatRow: pathRows[i + 1]?.row,
      maxPressColsCap: phaseMaxPress,
      preferLowPress: rowPhase ? !rowPhase.preferHighPress : true,
      relaxFullPressOverlap: rowPhase?.relaxFullPressOverlap ?? false,
    });

    if (!plan && prev?.hazard) {
      const repaired = repairPrevHazardPress(
        prev.hazard,
        prev.gaps,
        prev.rowIndex,
        beatRow,
        corridor.gaps,
        rowDurationSec,
        columns,
        totalRows,
        minResidual,
        prev.corridorGapWidth
      );
      if (repaired) {
        const hzIdx = hazards.findIndex((h) => h.id === prev.hazard!.id);
        if (hzIdx >= 0) hazards[hzIdx] = repaired;
        committed[i - 1] = { ...prev, hazard: repaired };
        prevPassable = passableGapsAtWaterBeat(
          prev.gaps,
          repaired,
          prev.rowIndex,
          beatRow,
          rowDurationSec,
          columns,
          totalRows
        );
        survivorCol = pickSurvivorCol(
          corridor.gaps,
          prevPassable,
          side,
          escapeBias,
          columns
        );
        plan = planShaftPassage({
          columns,
          corridorGaps: corridor.gaps,
          side,
          survivorCol,
          prevPassableGaps: prevPassable,
          timing,
          rowDurationSec,
          minResidualGapCols: minResidual,
          shaftBeatRow: beatRow,
          hazardRowIndex: pr.row,
          totalRows,
          seed: params.seed,
          hazardCounter: hazardCounter + 1,
          nextCorridorGaps: nextPeek?.gaps,
          nextBeatRow: pathRows[i + 1]?.row,
          maxPressColsCap: phaseMaxPress,
          preferLowPress: !rowPhase?.preferHighPress,
          relaxFullPressOverlap: rowPhase?.relaxFullPressOverlap ?? false,
        });
      }
    }

    if (!plan && rowPhase?.preferHighPress && phaseMinPress < phaseMaxPress) {
      plan = planShaftPassage({
        columns,
        corridorGaps: corridor.gaps,
        side,
        survivorCol,
        prevPassableGaps: prevPassable,
        timing,
        rowDurationSec,
        minResidualGapCols: minResidual,
        shaftBeatRow: beatRow,
        hazardRowIndex: pr.row,
        totalRows,
        seed: params.seed,
        hazardCounter: hazardCounter + 1,
        nextCorridorGaps: nextPeek?.gaps,
        nextBeatRow: pathRows[i + 1]?.row,
        maxPressColsCap: Math.max(phaseMinPress, 1),
        preferLowPress: false,
        relaxFullPressOverlap: rowPhase?.relaxFullPressOverlap ?? false,
      });
    }

    if (!plan) {
      commitRestRow();
      const target = restCenterAtRow(pathRows, i, columns);
      achievableCenter = advanceGapCenterOnRunway(achievableCenter, target, rowsPerCol);
      warnings.push(`Row ${i}: no pressCols satisfy passage — shaft skipped.`);
      continue;
    }

    hazardCounter += 1;
    hazards.push(plan.hazard);
    const rowDef: CommittedRow = {
      gaps: corridor.gaps,
      blocks: corridor.blocks,
      macroPhase: pr.macroPhase,
      hazard: plan.hazard,
      rowIndex: pr.row,
      corridorGapWidth: corridor.gaps.length,
    };
    rows.push(rowDef);
    committed.push(rowDef);
    gapHistory.push(corridor.gaps.slice());
    achievableCenter = gapCenterCol(
      passableGapsAtWaterBeat(
        corridor.gaps,
        plan.hazard,
        beatRow,
        beatRow,
        rowDurationSec,
        columns,
        totalRows
      )
    );
  }

  return { hazards, rows, warnings, shaftFlowKind };
};
