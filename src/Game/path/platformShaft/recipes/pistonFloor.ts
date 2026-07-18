/**
 * pistonFloor — floor-mounted vertical piston ("Wait for water").
 */

import { pistonHazardTuning } from '@/config/pistonHazardTuning';
import {
  appendPistonEvent,
  lerpPistonEscalation,
} from '@/Game/path/platformShaft/composePistonShaft';
import { appendCorridorRows } from '@/Game/path/platformShaft/primitives';
import {
  createComposeCtx,
  difficultyBand,
  finalizeRecipeOutput,
} from '@/Game/path/platformShaft/recipeCompose';
import type {
  ComposePressIntroShaftParams,
  ShaftRecipeComposeResult,
} from '@/Game/path/platformShaft/types';

export const pistonFloor = (
  params: ComposePressIntroShaftParams = {}
): ShaftRecipeComposeResult => {
  'worklet';
  const seed = params.seed ?? 0;
  const difficulty01 = Math.max(0, Math.min(1, params.difficulty01 ?? 0.5));
  const esc = lerpPistonEscalation(difficulty01);
  const columns = params.columns ?? 6;
  const startGlobalRow = params.startGlobalRow ?? 0;
  const gapW = params.gapWidthCols ?? columns;

  const ctx = createComposeCtx({
    columns,
    startGlobalRow,
    minResidualGapCols: 2,
    seed,
  });

  let localCursor = 0;
  localCursor += appendPistonEvent(ctx, localCursor, {
    column: 2,
    mount: 'floor',
    trackLengthRows: Math.max(1, esc.trackLengthRows),
    speedRowsPerSec: esc.speedRowsPerSec * 0.9,
    safeExitSide: 'left',
    runwayRows: pistonHazardTuning.MIN_RUNWAY_ROWS,
    clearanceRows: pistonHazardTuning.MIN_CLEARANCE_ROWS_BEYOND_STROKE,
    macroPhase: 'tension',
  });

  appendCorridorRows(ctx.rowDefs, columns, pistonHazardTuning.POST_PISTON_RELEASE_ROWS, {
    gapWidthCols: gapW,
    centerCol: (columns - 1) / 2,
    macroPhase: 'release',
  });

  return finalizeRecipeOutput(
    ctx,
    { gapWidthCols: gapW, oppositeWallInset: 0 },
    {
      recipeId: 'pistonFloor',
      difficultyBand: difficultyBand(difficulty01),
      shaftFlowKind: 'static_rest',
    }
  );
};
