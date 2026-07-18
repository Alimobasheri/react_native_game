/**
 * pathChicaneShaft — P3: wide chicane path + derived dense shafts.
 */

import { swimmerPhysicsTuning } from '@/config/swimmerTuning';
import { platformShaftTuning } from '@/config/platformShaftTuning';
import {
  composePathChicane,
  wideGapColsForDifficulty,
} from '@/Game/path/platformShaft/pathIntent/pathGenerators';
import { deriveShaftsFromPath } from '@/Game/path/platformShaft/shaftScheduler/deriveShafts';
import { difficultyBand } from '@/Game/path/platformShaft/recipeCompose';
import type {
  ComposePressIntroShaftParams,
  ShaftRecipeComposeResult,
} from '@/Game/path/platformShaft/types';

const DEFAULT_BLOCK_HEIGHT = 60;

export const composePathChicaneShaft = (
  params: ComposePressIntroShaftParams & { raisingSpeed?: number; blockHeight?: number } = {}
): ShaftRecipeComposeResult => {
  'worklet';
  const seed = params.seed ?? 0;
  const difficulty01 = Math.max(0, Math.min(1, params.difficulty01 ?? 0.2));
  const columns = params.columns ?? 6;
  const blockHeight = params.blockHeight ?? DEFAULT_BLOCK_HEIGHT;
  const swimmerHeight = blockHeight * swimmerPhysicsTuning.SWIMMER_HEIGHT_TO_WIDTH_RATIO;
  const wideGapCols = params.gapWidthCols ?? wideGapColsForDifficulty(difficulty01);

  const path = composePathChicane({
    seed,
    difficulty01,
    columns,
    wideGapCols,
    startGlobalRow: params.startGlobalRow ?? 0,
  });

  const derived = deriveShaftsFromPath(path.pathRows, {
    columns,
    seed,
    difficulty01,
    swimmerHeight,
    blockHeight,
    raisingSpeed: params.raisingSpeed,
    wideGapCols,
    minResidualGapCols:
      params.minResidualGapCols ?? platformShaftTuning.MIN_RESIDUAL_GAP_COLS,
    shaftFlowKind: 'corner_stack',
  });

  return {
    rows: derived.rows,
    hazards: derived.hazards,
    markers: [],
    meta: {
      recipeId: 'pathChicaneShaft',
      difficultyBand: difficultyBand(difficulty01),
      shaftFlowKind: 'corner_stack',
    },
    harmonizerWarnings: derived.warnings,
  };
};
