/**
 * pendulumSweep — single center pendulum with wide arc ("The Sweep").
 */

import { pendulumHazardTuning } from '@/config/pendulumHazardTuning';
import {
  appendPendulumEvent,
  appendPendulumSideWallRows,
  lerpPendulumEscalation,
} from '@/Game/path/platformShaft/composePendulumShaft';
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

export const pendulumSweep = (
  params: ComposePressIntroShaftParams = {}
): ShaftRecipeComposeResult => {
  'worklet';
  const seed = params.seed ?? 0;
  const difficulty01 = Math.max(0, Math.min(1, params.difficulty01 ?? 0.5));
  const esc = lerpPendulumEscalation(difficulty01);
  const columns = params.columns ?? 6;
  const startGlobalRow = params.startGlobalRow ?? 0;
  const gapW = params.gapWidthCols ?? columns;

  const ctx = createComposeCtx({
    columns,
    startGlobalRow,
    minResidualGapCols: pendulumHazardTuning.MIN_OPEN_GAP_COLS,
    seed,
  });

  let localCursor = 0;
  const approachWallRows = 2;
  localCursor += appendCorridorRows(
    ctx.rowDefs,
    columns,
    Math.max(0, pendulumHazardTuning.MIN_RUNWAY_ROWS - approachWallRows),
    {
      gapWidthCols: gapW,
      centerCol: (columns - 1) / 2,
      macroPhase: 'flow',
    }
  );
  appendPendulumSideWallRows(ctx.rowDefs, columns, approachWallRows);
  localCursor += approachWallRows;

  localCursor += appendPendulumEvent(ctx, localCursor, {
    anchorCol: Math.floor((columns - 1) / 2),
    tetherLengthRows: Math.max(3, esc.tetherLengthRows),
    maxAngleRads: esc.maxAngleRads,
    swingFrequencyHz: esc.swingFrequencyHz * 0.85,
    macroPhase: 'climax',
    runwayRows: 0,
    rowSpan: pendulumHazardTuning.PENDULUM_BAND_ROW_SPAN,
    strikeProfile: 'plunge_kill',
  });

  appendCorridorRows(ctx.rowDefs, columns, 8, {
    gapWidthCols: gapW,
    centerCol: (columns - 1) / 2,
    macroPhase: 'release',
  });

  return finalizeRecipeOutput(
    ctx,
    { gapWidthCols: gapW, oppositeWallInset: 0 },
    {
      recipeId: 'pendulumSweep',
      difficultyBand: difficultyBand(difficulty01),
      shaftFlowKind: 'climax',
    }
  );
};
