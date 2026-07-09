/**
 * pressPinballPair — alternate-side bounce recipe (Slice 4).
 * safeRunway → pressA → breathe → chicane drift → pressB (opposite) → release.
 */

import { platformShaftTuning } from '@/config/platformShaftTuning';
import {
  appendSlabEvent,
  createComposeCtx,
  difficultyBand,
  finalizeRecipeOutput,
} from '@/Game/path/platformShaft/recipeCompose';
import { appendCorridorRows, lerpPinballEscalation } from '@/Game/path/platformShaft/primitives';
import type {
  PlatformSide,
  PressPinballPairParams,
  PressPinballPairResult,
} from '@/Game/path/platformShaft/types';

export const pressPinballPair = (
  params: PressPinballPairParams = {}
): PressPinballPairResult => {
  'worklet';
  const seed = params.seed ?? 0;
  const difficulty01 = Math.max(0, Math.min(1, params.difficulty01 ?? 0.4));
  const esc = lerpPinballEscalation(difficulty01);
  const gapW = params.gapWidthCols ?? 2;
  const columns = params.columns ?? 6;
  const startGlobalRow = params.startGlobalRow ?? 0;
  const minResidualGapCols =
    params.minResidualGapCols ?? platformShaftTuning.MIN_RESIDUAL_GAP_COLS;
  const baseCenter = 2.5;
  const chicaneSign = seed % 2 === 0 ? 1 : -1;
  const pressASide: PlatformSide = seed % 2 === 1 ? 'right' : 'left';
  const pressBSide: PlatformSide = pressASide === 'right' ? 'left' : 'right';

  const ctx = createComposeCtx({
    columns,
    startGlobalRow,
    minResidualGapCols,
    seed,
  });

  let localCursor = 0;

  localCursor += appendCorridorRows(ctx.rowDefs, columns, esc.runwayRows, {
    gapWidthCols: gapW,
    centerCol: baseCenter,
    macroPhase: 'flow',
  });

  localCursor += appendSlabEvent(ctx, localCursor, {
    side: pressASide,
    rowSpan: esc.press1RowSpan,
    pressCols: 1,
    pressDurationSec: esc.press1Duration,
    pressEase: 'ease-out',
    telegraphLeadRows: esc.press1Telegraph,
    gapWidthCols: gapW,
    centerCol: baseCenter,
    macroPhase: 'tension',
  });

  localCursor += appendCorridorRows(ctx.rowDefs, columns, esc.breatheRows, {
    gapWidthCols: gapW,
    centerCol: baseCenter,
    macroPhase: 'flow',
  });

  const chicaneCenter = baseCenter + chicaneSign * 0.5;
  localCursor += appendCorridorRows(ctx.rowDefs, columns, esc.chicaneRows, {
    gapWidthCols: gapW,
    centerCol: chicaneCenter,
    driftTotalCols: chicaneSign * 0.5,
    macroPhase: 'tension',
  });

  localCursor += appendSlabEvent(ctx, localCursor, {
    side: pressBSide,
    rowSpan: esc.press2RowSpan,
    pressCols: 1,
    pressDurationSec: esc.press2Duration,
    pressEase: 'ease-out',
    telegraphLeadRows: esc.press2Telegraph,
    gapWidthCols: gapW,
    centerCol: chicaneCenter,
    macroPhase: 'tension',
  });

  appendCorridorRows(ctx.rowDefs, columns, esc.releaseRows, {
    gapWidthCols: gapW,
    centerCol: baseCenter,
    driftTotalCols: baseCenter - chicaneCenter,
    macroPhase: 'release',
  });

  return finalizeRecipeOutput(
    ctx,
    { gapWidthCols: gapW, oppositeWallInset: 0 },
    {
      recipeId: 'pressPinballPair',
      difficultyBand: difficultyBand(difficulty01),
    }
  );
};
