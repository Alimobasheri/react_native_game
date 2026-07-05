/**
 * composePressIntroShaft — multi-slab intro teach segment (Slice 1.5 / 3).
 * Mirrors scripts/stage-design-lab/hazard-generators.js.
 */

import { platformShaftTuning } from '@/config/platformShaftTuning';
import { harmonizePlatformSlab } from '@/Game/path/platformShaft/harmonizer';
import {
  appendCorridorRows,
  corridorRowForSlab,
  lerpTeachEscalation,
} from '@/Game/path/platformShaft/primitives';
import type {
  ComposePressIntroShaftParams,
  ComposePressIntroShaftResult,
  PlatformShaftRowDef,
  PlatformSide,
  PlatformSlabHazard,
  PlatformSlabParams,
  PressEase,
  RecipeOutput,
} from '@/Game/path/platformShaft/types';

type SlabEventSpec = {
  side?: PlatformSide;
  rowSpan?: number;
  pressCols?: number;
  pressDurationSec?: number;
  pressEase?: PressEase;
  telegraphLeadRows?: number;
  gapWidthCols?: number;
  centerCol?: number;
  macroPhase?: PlatformShaftRowDef['macroPhase'];
  oppositeWallInset?: number;
  animStartLocalRow?: number;
  animStartRow?: number;
  addTelegraph?: boolean;
  telegraphLabel?: string;
};

type ComposeCtx = {
  rowDefs: PlatformShaftRowDef[];
  hazards: PlatformSlabHazard[];
  markers: unknown[];
  columns: number;
  warnings: string[];
  startGlobalRow: number;
  minResidualGapCols: number;
  seed: number;
  hazardCounter: number;
};

const buildPlatformSlabHazard = (
  params: PlatformSlabParams,
  columns: number,
  slabStartRow: number,
  rowSpan: number,
  side: PlatformSide,
  hazardId: string
): PlatformSlabHazard => {
  'worklet';
  const pressDur = params.pressDurationSec ?? 1.4;
  const pressCols = params.pressCols ?? 1;
  const pressEase = params.pressEase ?? 'ease-out';
  const anchorCol = side === 'left' ? 1 : columns - 2;
  const pressDirection = side === 'left' ? 'right' : 'left';
  const rowEnd = slabStartRow + rowSpan - 1;
  const animStartRow = params.animStartRow ?? Math.max(0, slabStartRow - 2);
  return {
    id: hazardId,
    kind: 'hazard_platform',
    side,
    bounds: {
      rowStart: slabStartRow,
      rowEnd,
      colStart: anchorCol,
      colEnd: anchorCol,
    },
    params: {
      pressCols,
      pressDurationSec: pressDur,
      pressDirection,
      pressEase,
      animStartRow,
      heldDurationSec: params.heldDurationSec ?? 0.25,
    },
  };
};

const appendSlabEvent = (ctx: ComposeCtx, localStartRow: number, spec: SlabEventSpec): number => {
  'worklet';
  const rowSpan = Math.max(1, spec.rowSpan ?? 1);
  const gapW = spec.gapWidthCols ?? 2;
  const centerCol = spec.centerCol ?? 2.5;
  const corridor = { gapWidthCols: gapW, oppositeWallInset: spec.oppositeWallInset ?? 0 };
  const side = spec.side ?? 'right';
  const telegraphLead = spec.telegraphLeadRows ?? 2;
  const globalBase = ctx.startGlobalRow;
  const slabStartGlobal = globalBase + localStartRow;

  for (let i = 0; i < rowSpan; i++) {
    const rowGeom = corridorRowForSlab(ctx.columns, gapW, centerCol, side);
    ctx.rowDefs.push({
      blocks: rowGeom.blocks,
      gaps: rowGeom.gaps,
      macroPhase: spec.macroPhase || 'flow',
    });
  }

  const animStartGlobal =
    spec.animStartLocalRow != null
      ? globalBase + spec.animStartLocalRow
      : spec.animStartRow != null
        ? spec.animStartRow
        : Math.max(0, slabStartGlobal - telegraphLead);

  const slabParams: PlatformSlabParams = {
    pressCols: spec.pressCols ?? 1,
    pressDurationSec: spec.pressDurationSec ?? 1.2,
    pressEase: spec.pressEase ?? 'ease-out',
    animStartRow: animStartGlobal,
    heldDurationSec: 0.25,
  };
  const harm = harmonizePlatformSlab(slabParams, corridor, {
    minResidualGapCols: ctx.minResidualGapCols,
  });
  if (harm.warnings.length) ctx.warnings.push(...harm.warnings);

  ctx.hazardCounter += 1;
  const hazardId = `platform-hz-${ctx.seed}-${ctx.hazardCounter}`;
  const hazard = buildPlatformSlabHazard(
    harm.params,
    ctx.columns,
    slabStartGlobal,
    rowSpan,
    side,
    hazardId
  );
  ctx.hazards.push(hazard);

  if (spec.addTelegraph !== false && telegraphLead > 0) {
    ctx.markers.push({
      globalRowIndex: Math.max(0, hazard.params.animStartRow),
      kind: 'telegraph',
      label: spec.telegraphLabel || '',
    });
  }

  return rowSpan;
};

const harmonizeBeatHazards = (
  hazards: PlatformSlabHazard[],
  corridor: { gapWidthCols: number; oppositeWallInset: number },
  minResidualGapCols: number
): string[] => {
  'worklet';
  const warnings: string[] = [];
  for (let i = 0; i < hazards.length; i++) {
    const result = harmonizePlatformSlab(hazards[i].params, corridor, {
      minResidualGapCols,
    });
    hazards[i].params = result.params;
    warnings.push(...result.warnings);
  }
  return warnings;
};

const difficultyBand = (difficulty01: number): RecipeOutput['meta']['difficultyBand'] => {
  'worklet';
  if (difficulty01 < 0.34) return 'easy';
  if (difficulty01 < 0.67) return 'mid';
  return 'hard';
};

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

  const ctx: ComposeCtx = {
    rowDefs: [],
    hazards: [],
    markers: [],
    columns,
    warnings: [],
    startGlobalRow,
    minResidualGapCols,
    seed,
    hazardCounter: 0,
  };

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

  const beatWarnings = harmonizeBeatHazards(
    ctx.hazards,
    { gapWidthCols: gapW, oppositeWallInset: 0 },
    minResidualGapCols
  );

  const allWarnings = [...ctx.warnings, ...beatWarnings];

  return {
    rows: ctx.rowDefs,
    hazards: ctx.hazards,
    markers: ctx.markers,
    meta: {
      recipeId: 'composePressIntroShaft',
      difficultyBand: difficultyBand(difficulty01),
    },
    harmonizerWarnings: allWarnings,
  };
};
