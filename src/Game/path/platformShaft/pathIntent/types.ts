import type { MacroPhase } from '@/Game/path/macroPacing';
import type { PlatformSide } from '@/Game/path/platformShaft/types';

/** Per-row path design artifact — primary input for shaft derivation (v2). */
export type PathRowIntent = {
  row: number;
  /** Corridor before shafts move (tunable 3–4 cols). */
  wideGaps: number[];
  /** Corridor at full press (1 col, PS-003). */
  narrowGaps: number[];
  /** Authored shaft anchor side for this row; SSOT for downstream hazard planning. */
  shaftSide: PlatformSide;
  /** Thumb target when water crosses this row. */
  pathCenterCol: number;
  macroPhase: MacroPhase;
  /** Orange ceiling pin cols (variance-injected). */
  staticBlocks?: number[];
  /** Rhythm profile id; bumps after ceiling pin. */
  sectionId?: number;
};

export type PathSegmentMeta = {
  recipeId: string;
  seed: number;
  difficulty01: number;
  rowCount: number;
};

/** P1 output — path only, zero hazards until ShaftScheduler (P3). */
export type PathSegmentOutput = {
  pathRows: PathRowIntent[];
  meta: PathSegmentMeta;
};

export type ComposePathChicaneParams = {
  seed?: number;
  difficulty01?: number;
  columns?: number;
  rowCount?: number;
  startGlobalRow?: number;
  macroPhase?: MacroPhase;
  /** Override wide gap width; default lerps WIDE_GAP_COLS_EASY/HARD. */
  wideGapCols?: number;
  chicaneBlockRows?: number;
  applyCeilingPins?: boolean;
};

export type CeilingPinContext = {
  seed: number;
  columns: number;
  /** Chicane drift direction on the row (+1 right, -1 left). */
  pushDirection: -1 | 0 | 1;
  sectionId: number;
  pinChance: number;
  leadRows: number;
};
