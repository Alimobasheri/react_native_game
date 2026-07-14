/**
 * Shared pivot shaft compose helpers.
 */

import { capPivotRpm } from '@/config/pivotHazardTuning';
import { pivotHazardTuning } from '@/config/pivotHazardTuning';
import {
  appendCorridorRows,
  blocksFromGaps,
  gapColsFromWidth,
} from '@/Game/path/platformShaft/primitives';
import type { ComposeCtx } from '@/Game/path/platformShaft/recipeCompose';
import type {
  PivotHazard,
  PivotHazardParams,
  PlatformShaftRowDef,
} from '@/Game/path/platformShaft/types';

export type AppendPivotEventSpec = {
  armCount?: 2 | 3 | 4;
  rpm?: number;
  direction?: PivotHazardParams['direction'];
  anchorMode?: PivotHazardParams['anchorMode'];
  armLengthCols?: number;
  armThicknessRows?: number;
  rowSpan?: number;
  macroPhase?: PlatformShaftRowDef['macroPhase'];
  runwayRows?: number;
  animStartLocalRow?: number;
};

export const widePivotCorridorRow = (columns: number): PlatformShaftRowDef => {
  'worklet';
  const gaps = gapColsFromWidth(columns, columns);
  return {
    gaps,
    blocks: blocksFromGaps(columns, gaps),
    macroPhase: 'tension',
  };
};

export const appendPivotEvent = (
  ctx: ComposeCtx,
  localStartRow: number,
  spec: AppendPivotEventSpec,
  rowDurationSec = 0.12
): number => {
  'worklet';
  const rowSpan = Math.max(2, spec.rowSpan ?? pivotHazardTuning.PIVOT_BAND_ROW_SPAN);
  const runway = spec.runwayRows ?? pivotHazardTuning.MIN_RUNWAY_ROWS;
  const globalBase = ctx.startGlobalRow;
  const slabStartGlobal = globalBase + localStartRow;

  if (runway > 0) {
    appendCorridorRows(ctx.rowDefs, ctx.columns, runway, {
      gapWidthCols: ctx.columns,
      centerCol: (ctx.columns - 1) / 2,
      macroPhase: 'flow',
    });
  }

  for (let i = 0; i < rowSpan; i++) {
    ctx.rowDefs.push(widePivotCorridorRow(ctx.columns));
  }

  const requestedRpm = spec.rpm ?? pivotHazardTuning.TEACH_RPM;
  const armCount = spec.armCount ?? 4;
  const columnWidthPx = 48;
  const cappedRpm = capPivotRpm(
    requestedRpm,
    armCount,
    ctx.columns,
    columnWidthPx,
    rowDurationSec
  );

  const animStartGlobal =
    spec.animStartLocalRow != null
      ? globalBase + spec.animStartLocalRow
      : globalBase + localStartRow;

  const pivotParams: PivotHazardParams = {
    armCount,
    rpm: cappedRpm,
    direction: spec.direction ?? 'cw',
    anchorMode: spec.anchorMode ?? 'center',
    armLengthCols: spec.armLengthCols ?? pivotHazardTuning.DEFAULT_ARM_LENGTH_COLS,
    armThicknessRows: spec.armThicknessRows ?? pivotHazardTuning.ARM_THICKNESS_COLS,
    animStartRow: animStartGlobal,
  };

  ctx.hazardCounter += 1;
  const hazardId = `pivot-hz-${ctx.seed}-${ctx.hazardCounter}`;
  const hazard: PivotHazard = {
    id: hazardId,
    kind: 'hazard_pivot',
    bounds: {
      rowStart: slabStartGlobal + runway,
      rowEnd: slabStartGlobal + runway + rowSpan - 1,
      colStart: 0,
      colEnd: ctx.columns - 1,
    },
    params: pivotParams,
  };
  ctx.hazards.push(hazard);

  ctx.markers.push({
    globalRowIndex: animStartGlobal,
    kind: 'telegraph',
    label: 'pivot',
  });

  return runway + rowSpan;
};
