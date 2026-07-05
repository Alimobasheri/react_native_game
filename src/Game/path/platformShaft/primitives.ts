/**
 * Platform shaft grid primitives — mirrors scripts/stage-design-lab/hazard-generators.js.
 * Worklet-safe: plain numbers + Math only.
 */

import { platformShaftTuning } from '@/config/platformShaftTuning';
import type {
  PlatformShaftRowDef,
  PlatformSide,
  PlatformSlabBounds,
  PlatformSlabHazard,
} from '@/Game/path/platformShaft/types';

export const lerpNum = (a: number, b: number, t: number): number => {
  'worklet';
  const clamped = Math.max(0, Math.min(1, t));
  return a + (b - a) * clamped;
};

export const gapColsFromWidth = (
  columns: number,
  gapWidth: number,
  centerCol?: number
): number[] => {
  'worklet';
  const w = Math.max(1, Math.round(gapWidth));
  const center = centerCol != null ? centerCol : (columns - 1) / 2;
  let start = Math.round(center - (w - 1) / 2);
  start = Math.max(0, Math.min(start, columns - w));
  const gaps: number[] = [];
  for (let c = start; c < start + w && c < columns; c++) gaps.push(c);
  return gaps;
};

export const blocksFromGaps = (columns: number, gaps: readonly number[]): number[] => {
  'worklet';
  const set = new Set(gaps);
  const blocks: number[] = [];
  for (let c = 0; c < columns; c++) {
    if (!set.has(c)) blocks.push(c);
  }
  return blocks;
};

export const pressWallCol = (columns: number, side: PlatformSide): number => {
  'worklet';
  return side === 'left' ? 1 : columns - 2;
};

export const corridorRowForSlab = (
  columns: number,
  gapWidth: number,
  centerCol: number,
  side: PlatformSide
): { gaps: number[]; blocks: number[] } => {
  'worklet';
  const gaps = gapColsFromWidth(columns, gapWidth, centerCol);
  const wallCol = pressWallCol(columns, side);
  const gapSet = new Set(gaps);
  gapSet.add(wallCol);
  if (side === 'left') {
    const gapMin = Math.min(...gaps);
    for (let c = wallCol + 1; c < gapMin; c++) gapSet.add(c);
  } else {
    const gapMax = Math.max(...gaps);
    for (let c = gapMax + 1; c < wallCol; c++) gapSet.add(c);
  }
  const newGaps = Array.from(gapSet).sort((a, b) => a - b);
  return { gaps: newGaps, blocks: blocksFromGaps(columns, newGaps) };
};

export type TeachEscalation = {
  safeRunwayRows: number;
  breatheRows: number;
  chicaneRows: number;
  releaseRows: number;
  press1RowSpan: number;
  press2RowSpan: number;
  press1Duration: number;
  press1Telegraph: number;
  press2Duration: number;
  press2Telegraph: number;
  stackDuration: number;
  stackTelegraphRows: number;
  climaxDuration: number;
  climaxTelegraph: number;
};

export const lerpTeachEscalation = (difficulty01: number): TeachEscalation => {
  'worklet';
  const d = Math.max(0, Math.min(1, difficulty01 ?? 0.2));
  const t = platformShaftTuning;
  return {
    safeRunwayRows: Math.round(
      lerpNum(t.INTRO_SHAFT_SAFE_RUNWAY_ROWS_EASY, t.INTRO_SHAFT_SAFE_RUNWAY_ROWS_HARD, d)
    ),
    breatheRows: Math.round(
      lerpNum(t.INTRO_SHAFT_BREATHE_ROWS_EASY, t.INTRO_SHAFT_BREATHE_ROWS_HARD, d)
    ),
    chicaneRows: Math.round(
      lerpNum(t.INTRO_SHAFT_CHICANE_ROWS_EASY, t.INTRO_SHAFT_CHICANE_ROWS_HARD, d)
    ),
    releaseRows: Math.round(
      lerpNum(t.INTRO_SHAFT_RELEASE_ROWS_EASY, t.INTRO_SHAFT_RELEASE_ROWS_HARD, d)
    ),
    press1RowSpan: 3,
    press2RowSpan: 2,
    press1Duration: lerpNum(
      t.INTRO_SHAFT_PRESS1_DURATION_EASY,
      t.INTRO_SHAFT_PRESS1_DURATION_HARD,
      d
    ),
    press1Telegraph: Math.round(
      lerpNum(t.INTRO_SHAFT_PRESS1_TELEGRAPH_EASY, t.INTRO_SHAFT_PRESS1_TELEGRAPH_HARD, d)
    ),
    press2Duration: lerpNum(
      t.INTRO_SHAFT_PRESS2_DURATION_EASY,
      t.INTRO_SHAFT_PRESS2_DURATION_HARD,
      d
    ),
    press2Telegraph: Math.round(
      lerpNum(t.INTRO_SHAFT_PRESS2_TELEGRAPH_EASY, t.INTRO_SHAFT_PRESS2_TELEGRAPH_HARD, d)
    ),
    stackDuration: lerpNum(
      t.INTRO_SHAFT_STACK_DURATION_EASY,
      t.INTRO_SHAFT_STACK_DURATION_HARD,
      d
    ),
    stackTelegraphRows: Math.round(
      lerpNum(t.INTRO_SHAFT_STACK_TELEGRAPH_ROWS, t.INTRO_SHAFT_STACK_TELEGRAPH_ROWS, d)
    ),
    climaxDuration: lerpNum(
      t.INTRO_SHAFT_CLIMAX_DURATION_EASY,
      t.INTRO_SHAFT_CLIMAX_DURATION_HARD,
      d
    ),
    climaxTelegraph: Math.round(
      lerpNum(t.INTRO_SHAFT_CLIMAX_TELEGRAPH_EASY, t.INTRO_SHAFT_CLIMAX_TELEGRAPH_HARD, d)
    ),
  };
};

export const platformSlabExtents = (
  bounds: PlatformSlabBounds,
  pressDir: 'left' | 'right',
  pressExtent: number,
  columns: number
): { slabStart: number; slabEnd: number } => {
  'worklet';
  let slabStart = bounds.colStart;
  let slabEnd = bounds.colEnd + 1;
  if (pressDir === 'right') {
    slabEnd = bounds.colEnd + 1 + pressExtent;
  } else {
    slabStart = bounds.colStart - pressExtent;
  }
  slabStart = Math.max(0, slabStart);
  slabEnd = Math.min(columns, slabEnd);
  return { slabStart, slabEnd };
};

export const blockColsFromSlab = (
  slabStart: number,
  slabEnd: number,
  columns: number
): number[] => {
  'worklet';
  const blockCols: number[] = [];
  for (let c = 0; c < columns; c++) {
    const overlap = Math.min(slabEnd, c + 1) - Math.max(slabStart, c);
    if (overlap > 0.001) blockCols.push(c);
  }
  return blockCols;
};

export const effectiveGapsAtFullPress = (
  baseGaps: readonly number[],
  hazard: PlatformSlabHazard,
  rowIndex: number,
  columns: number
): number[] => {
  'worklet';
  if (rowIndex < hazard.bounds.rowStart || rowIndex > hazard.bounds.rowEnd) {
    return baseGaps.slice();
  }
  const pressCols = Math.max(0, hazard.params.pressCols ?? 1);
  const pressDir =
    hazard.params.pressDirection ?? (hazard.side === 'left' ? 'right' : 'left');
  const { slabStart, slabEnd } = platformSlabExtents(
    hazard.bounds,
    pressDir,
    pressCols,
    columns
  );
  const blockCols = blockColsFromSlab(slabStart, slabEnd, columns);
  const gapSet = new Set(baseGaps);
  for (let i = 0; i < blockCols.length; i++) {
    gapSet.delete(blockCols[i]);
  }
  const result: number[] = [];
  gapSet.forEach((c) => result.push(c));
  result.sort((a, b) => a - b);
  return result;
};

export const hazardForRowIndex = (
  hazards: readonly PlatformSlabHazard[],
  rowIndex: number
): PlatformSlabHazard | undefined => {
  'worklet';
  for (let i = 0; i < hazards.length; i++) {
    const hz = hazards[i];
    if (rowIndex >= hz.bounds.rowStart && rowIndex <= hz.bounds.rowEnd) {
      return hz;
    }
  }
  return undefined;
};

export const appendCorridorRows = (
  rowDefs: PlatformShaftRowDef[],
  columns: number,
  count: number,
  spec: {
    gapWidthCols?: number;
    centerCol?: number;
    driftTotalCols?: number;
    macroPhase?: PlatformShaftRowDef['macroPhase'];
  }
): number => {
  'worklet';
  const gapW = spec.gapWidthCols ?? 2;
  const center = spec.centerCol ?? 2.5;
  const driftTotal = spec.driftTotalCols ?? 0;
  const n = Math.max(0, Math.round(count));
  for (let i = 0; i < n; i++) {
    const t = n <= 1 ? 0 : i / (n - 1);
    const gaps = gapColsFromWidth(columns, gapW, center + driftTotal * t);
    rowDefs.push({
      blocks: blocksFromGaps(columns, gaps),
      gaps,
      macroPhase: spec.macroPhase || 'flow',
    });
  }
  return n;
};

export const minGapWidthCols = (gaps: readonly number[]): number => {
  'worklet';
  if (gaps.length === 0) return 0;
  let maxRun = 1;
  let run = 1;
  for (let i = 1; i < gaps.length; i++) {
    if (gaps[i] === gaps[i - 1] + 1) {
      run++;
    } else {
      if (run > maxRun) maxRun = run;
      run = 1;
    }
  }
  if (run > maxRun) maxRun = run;
  return maxRun;
};
