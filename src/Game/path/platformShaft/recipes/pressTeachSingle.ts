/**
 * pressTeachSingle — atomic teach recipe (unit tests only).
 * Players / dev locks use composePressIntroShaft.
 */

import { platformShaftTuning } from '@/config/platformShaftTuning';
import { harmonizePlatformSlab } from '@/Game/path/platformShaft/harmonizer';
import {
  blocksFromGaps,
  corridorRowForSlab,
  gapColsFromWidth,
} from '@/Game/path/platformShaft/primitives';
import type {
  PlatformSide,
  PlatformSlabHazard,
  PlatformSlabParams,
  RecipeOutput,
} from '@/Game/path/platformShaft/types';

export type PressTeachSingleParams = {
  seed?: number;
  side?: PlatformSide;
  approachRows?: number;
  rowSpan?: number;
  recoveryRows?: number;
  gapWidthCols?: number;
  pressCols?: number;
  pressDurationSec?: number;
  columns?: number;
  startGlobalRow?: number;
};

export const pressTeachSingle = (params: PressTeachSingleParams = {}): RecipeOutput & {
  harmonizerWarnings: string[];
} => {
  const seed = params.seed ?? 0;
  const side = params.side ?? (seed % 2 === 1 ? 'right' : 'left');
  const approachRows = params.approachRows ?? platformShaftTuning.TEACH_APPROACH_ROWS;
  const slabRows = params.rowSpan ?? platformShaftTuning.TEACH_SLAB_ROW_SPAN;
  const recoveryRows = params.recoveryRows ?? platformShaftTuning.TEACH_RECOVERY_ROWS;
  const gapWidthCols = params.gapWidthCols ?? platformShaftTuning.TEACH_GAP_WIDTH_COLS;
  const columns = params.columns ?? 6;
  const startGlobalRow = params.startGlobalRow ?? 0;
  const centerCol = 2.5;
  const corridor = { gapWidthCols, oppositeWallInset: 0 };

  const rowDefs: RecipeOutput['rows'] = [];
  for (let i = 0; i < approachRows; i++) {
    const gaps = gapColsFromWidth(columns, gapWidthCols, centerCol);
    rowDefs.push({
      blocks: blocksFromGaps(columns, gaps),
      gaps,
      macroPhase: 'flow',
    });
  }

  const slabStartRow = startGlobalRow + approachRows;
  for (let i = 0; i < slabRows; i++) {
    const rowGeom = corridorRowForSlab(columns, gapWidthCols, centerCol, side);
    rowDefs.push({
      blocks: rowGeom.blocks,
      gaps: rowGeom.gaps,
      macroPhase: 'flow',
    });
  }

  for (let i = 0; i < recoveryRows; i++) {
    const t = recoveryRows <= 1 ? 0 : i / (recoveryRows - 1);
    const gaps = gapColsFromWidth(columns, gapWidthCols, centerCol);
    rowDefs.push({
      blocks: blocksFromGaps(columns, gaps),
      gaps,
      macroPhase: 'release',
    });
  }

  const slabParams: PlatformSlabParams = {
    pressCols: params.pressCols ?? platformShaftTuning.TEACH_PRESS_COLS,
    pressDurationSec: params.pressDurationSec ?? platformShaftTuning.TEACH_PRESS_DURATION_SEC,
    pressEase: 'ease-out',
    animStartRow: slabStartRow - platformShaftTuning.TEACH_TELEGRAPH_LEAD_ROWS,
    heldDurationSec: platformShaftTuning.TEACH_HELD_DURATION_SEC,
  };
  const harm = harmonizePlatformSlab(slabParams, corridor, {
    minResidualGapCols: platformShaftTuning.MIN_RESIDUAL_GAP_COLS,
  });

  const anchorCol = side === 'left' ? 1 : columns - 2;
  const hazard: PlatformSlabHazard = {
    id: `platform-hz-${seed}-0`,
    kind: 'hazard_platform',
    side,
    bounds: {
      rowStart: slabStartRow,
      rowEnd: slabStartRow + slabRows - 1,
      colStart: anchorCol,
      colEnd: anchorCol,
    },
    params: harm.params,
  };

  return {
    rows: rowDefs,
    hazards: [hazard],
    markers: [],
    meta: { recipeId: 'pressTeachSingle', difficultyBand: 'easy' },
    harmonizerWarnings: harm.warnings,
  };
};
