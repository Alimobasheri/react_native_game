/**
 * Shared platform-shaft recipe compose helpers — used by composers and L3 recipes.
 * Worklet-safe: plain numbers + Math only.
 */

import { harmonizePlatformSlab } from '@/Game/path/platformShaft/harmonizer';
import { corridorRowForSlab } from '@/Game/path/platformShaft/primitives';
import type {
  PlatformShaftHazard,
  PlatformShaftRowDef,
  PlatformSide,
  PlatformSlabHazard,
  PlatformSlabParams,
  PressEase,
  RecipeOutput,
} from '@/Game/path/platformShaft/types';

export type SlabEventSpec = {
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

export type ComposeCtx = {
  rowDefs: PlatformShaftRowDef[];
  hazards: PlatformShaftHazard[];
  markers: unknown[];
  columns: number;
  warnings: string[];
  startGlobalRow: number;
  minResidualGapCols: number;
  seed: number;
  hazardCounter: number;
};

export const createComposeCtx = (params: {
  columns: number;
  startGlobalRow: number;
  minResidualGapCols: number;
  seed: number;
}): ComposeCtx => {
  'worklet';
  return {
    rowDefs: [],
    hazards: [],
    markers: [],
    columns: params.columns,
    warnings: [],
    startGlobalRow: params.startGlobalRow,
    minResidualGapCols: params.minResidualGapCols,
    seed: params.seed,
    hazardCounter: 0,
  };
};

export const buildPlatformSlabHazard = (
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
  const slabParams: PlatformSlabParams = {
    pressCols,
    pressDurationSec: pressDur,
    pressDirection,
    pressEase,
    animStartRow,
    heldDurationSec: params.heldDurationSec ?? 0.25,
  };
  if (params.pressDurationRows != null && Number.isFinite(params.pressDurationRows)) {
    slabParams.pressDurationRows = params.pressDurationRows;
  }
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
    params: slabParams,
  };
};

export const appendSlabEvent = (
  ctx: ComposeCtx,
  localStartRow: number,
  spec: SlabEventSpec
): number => {
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

export const harmonizeBeatHazards = (
  hazards: PlatformShaftHazard[],
  corridor: { gapWidthCols: number; oppositeWallInset: number },
  minResidualGapCols: number
): string[] => {
  'worklet';
  const warnings: string[] = [];
  for (let i = 0; i < hazards.length; i++) {
    const hazard = hazards[i];
    if (hazard.kind !== 'hazard_platform') {
      continue;
    }
    const result = harmonizePlatformSlab(hazard.params, corridor, {
      minResidualGapCols,
    });
    hazard.params = result.params;
    warnings.push(...result.warnings);
  }
  return warnings;
};

export const difficultyBand = (
  difficulty01: number
): RecipeOutput['meta']['difficultyBand'] => {
  'worklet';
  if (difficulty01 < 0.34) return 'easy';
  if (difficulty01 < 0.67) return 'mid';
  return 'hard';
};

export const finalizeRecipeOutput = (
  ctx: ComposeCtx,
  corridor: { gapWidthCols: number; oppositeWallInset: number },
  meta: RecipeOutput['meta']
): RecipeOutput & { harmonizerWarnings: string[] } => {
  'worklet';
  const beatWarnings = harmonizeBeatHazards(
    ctx.hazards,
    corridor,
    ctx.minResidualGapCols
  );
  return {
    rows: ctx.rowDefs,
    hazards: ctx.hazards,
    markers: ctx.markers,
    meta,
    harmonizerWarnings: [...ctx.warnings, ...beatWarnings],
  };
};
