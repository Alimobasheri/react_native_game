/**
 * Platform shaft harmonizer — caps pressCols so min residual gap is preserved (PS-003/PS-004).
 * Mirrors scripts/stage-design-lab/hazard-generators.js (Slice 1).
 * Worklet-safe: plain numbers + Math only.
 */

import { platformShaftTuning } from '@/config/platformShaftTuning';
import type {
  CorridorSpec,
  HarmonizePlatformBeatResult,
  HarmonizePlatformSlabResult,
  PlatformSlabParams,
} from '@/Game/path/platformShaft/types';

export const minResidualGapCols = (): number => {
  'worklet';
  return platformShaftTuning.MIN_RESIDUAL_GAP_COLS;
};

export const maxPressColsForCorridor = (
  gapWidthAtRest: number,
  oppositeWallInset?: number,
  minResidualGapColsOverride?: number
): number => {
  'worklet';
  const minRes = minResidualGapColsOverride ?? platformShaftTuning.MIN_RESIDUAL_GAP_COLS;
  const inset = Math.max(0, oppositeWallInset ?? 0);
  const gapW = Math.max(1, Math.round(gapWidthAtRest));
  return Math.max(0, gapW - inset - minRes);
};

export const capPressCols = (
  gapWidthAtRest: number,
  requestedPressCols: number,
  oppositeWallInset?: number,
  minResidualGapColsOverride?: number
): number => {
  'worklet';
  const maxP = maxPressColsForCorridor(
    gapWidthAtRest,
    oppositeWallInset,
    minResidualGapColsOverride
  );
  const requested = Math.max(0, Math.round(requestedPressCols));
  return Math.max(0, Math.min(requested, maxP));
};

export const harmonizePlatformSlab = (
  slabParams: PlatformSlabParams,
  corridorSpec: CorridorSpec,
  opts?: { minResidualGapCols?: number }
): HarmonizePlatformSlabResult => {
  'worklet';
  const minRes = opts?.minResidualGapCols ?? platformShaftTuning.MIN_RESIDUAL_GAP_COLS;
  const corridor = corridorSpec;
  const requested = slabParams.pressCols ?? 1;
  const cappedValue = capPressCols(
    corridor.gapWidthCols,
    requested,
    corridor.oppositeWallInset ?? 0,
    minRes
  );
  const warnings: string[] = [];
  if (cappedValue < requested) {
    warnings.push(
      `Capped pressCols ${requested} → ${cappedValue} (gap ${corridor.gapWidthCols}, min residual ${minRes} col).`
    );
  }
  return {
    params: { ...slabParams, pressCols: cappedValue },
    warnings,
    capped: cappedValue < requested,
  };
};

/** Caps pressCols on each slab in-place; returns aggregate warnings. */
export const harmonizePlatformBeatSlabs = (
  slabs: PlatformSlabParams[],
  corridorSpec: CorridorSpec,
  opts?: { minResidualGapCols?: number }
): HarmonizePlatformBeatResult => {
  'worklet';
  const warnings: string[] = [];
  let capped = false;
  for (let i = 0; i < slabs.length; i++) {
    const result = harmonizePlatformSlab(slabs[i], corridorSpec, opts);
    slabs[i] = result.params;
    warnings.push(...result.warnings);
    if (result.capped) capped = true;
  }
  return { warnings, capped };
};

/** Teach recipe corridor + default press — mirrors lab pressTeachSingle numbers. */
export const teachRecipeCorridorSpec = (): CorridorSpec => {
  'worklet';
  return {
    gapWidthCols: platformShaftTuning.TEACH_GAP_WIDTH_COLS,
    oppositeWallInset: 0,
  };
};

export const teachRecipeMaxPressCols = (): number => {
  'worklet';
  const corridor = teachRecipeCorridorSpec();
  return maxPressColsForCorridor(corridor.gapWidthCols, corridor.oppositeWallInset);
};

export const teachRecipeCappedPressCols = (requested: number): number => {
  'worklet';
  const corridor = teachRecipeCorridorSpec();
  return capPressCols(
    corridor.gapWidthCols,
    requested,
    corridor.oppositeWallInset,
    platformShaftTuning.MIN_RESIDUAL_GAP_COLS
  );
};

export { capPivotRpm, maxFairPivotRpm } from '@/config/pivotHazardTuning';
