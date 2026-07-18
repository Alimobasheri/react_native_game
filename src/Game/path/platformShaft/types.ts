import type { PendulumStrikeProfile } from '@/config/pendulumHazardTuning';
import type {
  PistonMountType,
  PistonSafeExitSide,
} from '@/config/pistonHazardTuning';
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

export type PivotAnchorMode = 'center' | 'wall_left' | 'wall_right';

export type PivotRotationDirection = 'cw' | 'ccw';

export type PivotHazardParams = {
  armCount: 2 | 3 | 4;
  rpm: number;
  direction: PivotRotationDirection;
  anchorMode: PivotAnchorMode;
  armLengthCols: number;
  armThicknessRows: number;
  animStartRow?: number;
};

export type PivotHazard = {
  id: string;
  kind: 'hazard_pivot';
  bounds: PlatformSlabBounds;
  params: PivotHazardParams;
};

export type PendulumSide = 'left' | 'right' | 'center';

export type PendulumHazardParams = {
  anchorCol: number;
  tetherLengthRows: number;
  maxAngleRads: number;
  swingFrequencyHz: number;
  phaseOffsetRads: number;
  side?: PendulumSide;
  animStartRow?: number;
  strikeProfile?: PendulumStrikeProfile;
  impulseVelocityY?: number;
};

export type PendulumHazard = {
  id: string;
  kind: 'hazard_pendulum';
  bounds: PlatformSlabBounds;
  params: PendulumHazardParams;
};

export type PistonHazardParams = {
  /** Column 1–4 only. */
  column: number;
  mount: PistonMountType;
  /** How far the track extends into gap rows. */
  trackLengthRows: number;
  /** Vertical ping-pong speed in rows/sec. */
  speedRowsPerSec: number;
  /** Preferred horizontal escape after a bounce. */
  safeExitSide: PistonSafeExitSide;
  animStartRow?: number;
  /** Optional hold at tip before retract (seconds). */
  holdAtTipSec?: number;
  /** Telegraph delay in rows before motion begins. */
  telegraphDelayRows?: number;
};

export type PistonHazard = {
  id: string;
  kind: 'hazard_piston';
  bounds: PlatformSlabBounds;
  params: PistonHazardParams;
};

export type PlatformShaftHazard =
  | PlatformSlabHazard
  | PivotHazard
  | PendulumHazard
  | PistonHazard;

export type PlatformSlabRowOverlay = {
  side: PlatformSide;
  pressWallCol: number;
};

export type RecipeOutput = {
  rows: PlatformShaftRowDef[];
  hazards: PlatformShaftHazard[];
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

/** Any shaft recipe (platform / pivot / pendulum / piston). */
export type ShaftRecipeComposeResult = RecipeOutput & {
  harmonizerWarnings: string[];
};

/** Press-intro composer is platform-slab only. */
export type ComposePressIntroShaftResult = Omit<RecipeOutput, 'hazards'> & {
  hazards: PlatformSlabHazard[];
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

/** Pinball pair composer is platform-slab only. */
export type PressPinballPairResult = Omit<RecipeOutput, 'hazards'> & {
  hazards: PlatformSlabHazard[];
  harmonizerWarnings: string[];
};
