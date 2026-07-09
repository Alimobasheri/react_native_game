import type { MacroPhase } from '@/Game/path/macroPacing';
import type { ShaftFlowKind } from '@/Game/path/platformShaft/shaftScheduler/shaftFlowTypes';

export type PressEase = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';

export type PlatformSide = 'left' | 'right';

export type CorridorSpec = {
  gapWidthCols: number;
  oppositeWallInset?: number;
};

export type PlatformSlabParams = {
  pressCols?: number;
  /** Wall-clock fallback when rowDurationSec unavailable at call site. */
  pressDurationSec?: number;
  /** Row-clock SSOT — preferred at compose + runtime when rowDurationSec known. */
  pressDurationRows?: number;
  pressDirection?: 'left' | 'right';
  pressEase?: PressEase;
  animStartRow?: number;
  heldDurationSec?: number;
};

export type HarmonizePlatformSlabResult = {
  params: PlatformSlabParams;
  warnings: string[];
  capped: boolean;
};

export type HarmonizePlatformBeatResult = {
  warnings: string[];
  capped: boolean;
};

export type PlatformShaftRowDef = {
  gaps: number[];
  blocks?: number[];
  macroPhase?: MacroPhase;
};

export type PlatformSlabBounds = {
  rowStart: number;
  rowEnd: number;
  colStart: number;
  colEnd: number;
};

export type PlatformSlabHazard = {
  id: string;
  kind: 'hazard_platform';
  side: PlatformSide;
  bounds: PlatformSlabBounds;
  params: PlatformSlabParams;
};

export type PlatformSlabRowOverlay = {
  side: PlatformSide;
  pressWallCol: number;
};

export type RecipeOutput = {
  rows: PlatformShaftRowDef[];
  hazards: PlatformSlabHazard[];
  markers: unknown[];
  meta: {
    recipeId: string;
    difficultyBand: 'easy' | 'mid' | 'hard';
    shaftFlowKind?: ShaftFlowKind;
  };
};

export type ComposePressIntroShaftParams = {
  seed?: number;
  difficulty01?: number;
  gapWidthCols?: number;
  minResidualGapCols?: number;
  columns?: number;
  startGlobalRow?: number;
};

export type ComposePressIntroShaftResult = RecipeOutput & {
  harmonizerWarnings: string[];
};

export type PressPinballPairParams = {
  seed?: number;
  difficulty01?: number;
  gapWidthCols?: number;
  minResidualGapCols?: number;
  columns?: number;
  startGlobalRow?: number;
};

export type PressPinballPairResult = RecipeOutput & {
  harmonizerWarnings: string[];
};
