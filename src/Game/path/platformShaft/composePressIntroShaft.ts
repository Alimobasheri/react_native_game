/**
 * composePressIntroShaft — multi-slab intro teach segment (Slice 1.5 / 3).
 * Mirrors scripts/stage-design-lab/hazard-generators.js.
 */

import { platformShaftTuning } from '@/config/platformShaftTuning';
import {
  appendSlabEvent,
  createComposeCtx,
  difficultyBand,
  finalizeRecipeOutput,
} from '@/Game/path/platformShaft/recipeCompose';
import { appendCorridorRows, lerpTeachEscalation } from '@/Game/path/platformShaft/primitives';
import type {
  ComposePressIntroShaftParams,
  ComposePressIntroShaftResult,
  PlatformSide,
} from '@/Game/path/platformShaft/types';

export const composePressIntroShaft = (
  params: ComposePressIntroShaftParams = {}
): ComposePressIntroShaftResult => {
  'worklet';
  const seed = params.seed ?? 0;
  const difficulty01 = Math.max(0, Math.min(1, params.difficulty01 ?? 0.2));
  const esc = lerpTeachEscalation(difficulty01);
  const gapW = params.gapWidthCols ?? 2;
  const columns = params.columns ?? 6;
  const startGlobalRow = params.startGlobalRow ?? 0;
  const minResidualGapCols =
    params.minResidualGapCols ?? platformShaftTuning.MIN_RESIDUAL_GAP_COLS;
  const baseCenter = 2.5;
  const chicaneSign = seed % 2 === 0 ? 1 : -1;
  const stackSide: PlatformSide = seed % 2 === 1 ? 'right' : 'left';
  const climaxSide: PlatformSide = stackSide === 'right' ? 'left' : 'right';

  const ctx = createComposeCtx({
    columns,
    startGlobalRow,
    minResidualGapCols,
    seed,
  });

  let localCursor = 0;

  localCursor += appendCorridorRows(ctx.rowDefs, columns, esc.safeRunwayRows, {
    gapWidthCols: gapW,
    centerCol: baseCenter,
    macroPhase: 'flow',
  });

  localCursor += appendSlabEvent(ctx, localCursor, {
    side: 'right',
    rowSpan: esc.press1RowSpan,
    pressCols: 1,
    pressDurationSec: esc.press1Duration,
    pressEase: 'ease-out',
    telegraphLeadRows: esc.press1Telegraph,
    gapWidthCols: gapW,
    centerCol: baseCenter,
    macroPhase: 'flow',
  });

  localCursor += appendCorridorRows(ctx.rowDefs, columns, esc.breatheRows, {
    gapWidthCols: gapW,
    centerCol: baseCenter,
    macroPhase: 'flow',
  });

  localCursor += appendSlabEvent(ctx, localCursor, {
    side: 'left',
    rowSpan: esc.press2RowSpan,
    pressCols: 1,
    pressDurationSec: esc.press2Duration,
    pressEase: 'ease-out',
    telegraphLeadRows: esc.press2Telegraph,
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

  const stackLocal0 = localCursor;
  localCursor += appendSlabEvent(ctx, stackLocal0, {
    side: stackSide,
    rowSpan: 1,
    pressCols: 1,
    pressDurationSec: esc.stackDuration,
    pressEase: 'ease-out',
    telegraphLeadRows: esc.stackTelegraphRows,
    gapWidthCols: gapW,
    centerCol: chicaneCenter,
    macroPhase: 'tension',
    animStartLocalRow: stackLocal0 - esc.stackTelegraphRows,
  });

  const stackLocal1 = localCursor;
  localCursor += appendSlabEvent(ctx, stackLocal1, {
    side: stackSide,
    rowSpan: 1,
    pressCols: 1,
    pressDurationSec: esc.stackDuration,
    pressEase: 'ease-out',
    telegraphLeadRows: 1,
    gapWidthCols: gapW,
    centerCol: chicaneCenter,
    macroPhase: 'tension',
    animStartLocalRow: stackLocal1 - 1,
    addTelegraph: true,
  });

  localCursor += appendCorridorRows(ctx.rowDefs, columns, 2, {
    gapWidthCols: gapW,
    centerCol: chicaneCenter,
    driftTotalCols: baseCenter - chicaneCenter,
    macroPhase: 'tension',
  });

  localCursor += appendSlabEvent(ctx, localCursor, {
    side: climaxSide,
    rowSpan: 1,
    pressCols: 1,
    pressDurationSec: esc.climaxDuration,
    pressEase: 'ease-in',
    telegraphLeadRows: esc.climaxTelegraph,
    gapWidthCols: gapW,
    centerCol: baseCenter,
    macroPhase: 'climax',
  });

  appendCorridorRows(ctx.rowDefs, columns, esc.releaseRows, {
    gapWidthCols: gapW,
    centerCol: baseCenter,
    macroPhase: 'release',
  });

  return finalizeRecipeOutput(
    ctx,
    { gapWidthCols: gapW, oppositeWallInset: 0 },
    {
      recipeId: 'composePressIntroShaft',
      difficultyBand: difficultyBand(difficulty01),
    }
  );
};
