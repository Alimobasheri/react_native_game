/**
 * pivotCross — 4-arm center Pivot (The Cross).
 */

import { pivotHazardTuning } from '@/config/pivotHazardTuning';
import { appendPivotEvent } from '@/Game/path/platformShaft/composePivotShaft';
import {
  appendCorridorRows,
  lerpTeachEscalation,
} from '@/Game/path/platformShaft/primitives';
import {
  createComposeCtx,
  difficultyBand,
  finalizeRecipeOutput,
} from '@/Game/path/platformShaft/recipeCompose';
import type {
  ComposePressIntroShaftParams,
  ShaftRecipeComposeResult,
} from '@/Game/path/platformShaft/types';

export const pivotCross = (
  params: ComposePressIntroShaftParams = {}
): ShaftRecipeComposeResult => {
  'worklet';
  const seed = params.seed ?? 0;
  const difficulty01 = Math.max(0, Math.min(1, params.difficulty01 ?? 0.55));
  const esc = lerpTeachEscalation(difficulty01);
  const columns = params.columns ?? 6;
  const startGlobalRow = params.startGlobalRow ?? 0;
  const gapW = params.gapWidthCols ?? 2;

  const ctx = createComposeCtx({
    columns,
    startGlobalRow,
    minResidualGapCols: params.minResidualGapCols ?? 2,
    seed,
  });

  let localCursor = 0;
  localCursor += appendCorridorRows(ctx.rowDefs, columns, esc.safeRunwayRows, {
    gapWidthCols: gapW,
    centerCol: (columns - 1) / 2,
    macroPhase: 'flow',
  });

  localCursor += appendPivotEvent(ctx, localCursor, {
    armCount: 4,
    rpm: pivotHazardTuning.CROSS_RPM,
    direction: 'cw',
    anchorMode: 'center',
    armLengthCols: pivotHazardTuning.DEFAULT_ARM_LENGTH_COLS,
    macroPhase: 'tension',
    runwayRows: pivotHazardTuning.MIN_RUNWAY_ROWS,
    animStartLocalRow: localCursor + pivotHazardTuning.MIN_RUNWAY_ROWS - 2,
  });

  localCursor += appendCorridorRows(ctx.rowDefs, columns, pivotHazardTuning.POST_PIVOT_RELEASE_ROWS, {
    gapWidthCols: columns,
    centerCol: (columns - 1) / 2,
    macroPhase: 'release',
  });

  return finalizeRecipeOutput(
    ctx,
    { gapWidthCols: gapW, oppositeWallInset: 0 },
    {
      recipeId: 'pivotCross',
      difficultyBand: difficultyBand(difficulty01),
      shaftFlowKind: 'tension',
    }
  );
};
