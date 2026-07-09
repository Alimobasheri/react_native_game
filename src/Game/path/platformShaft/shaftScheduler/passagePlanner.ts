/**
 * Row-to-row passage planning — survivor col + pressCols from prev passable gaps.
 * Worklet-safe.
 */

import { harmonizePlatformSlab } from '@/Game/path/platformShaft/harmonizer';
import {
  effectiveGapsAtFullPress,
  maxOneSidedPressCols,
  corridorGapsForShaftRow,
} from '@/Game/path/platformShaft/primitives';
import { buildPlatformSlabHazard } from '@/Game/path/platformShaft/recipeCompose';
import {
  effectiveGapsAtPressPhase,
  hazardAnimLocalSecFromBeatRow,
} from '@/Game/hazards/platformPressMotion';
import type { PlatformSide, PlatformSlabHazard } from '@/Game/path/platformShaft/types';
import type { RowClockPressTiming } from '@/Game/path/platformShaft/shaftScheduler/rowClock';

export const countGapOverlap = (a: readonly number[], b: readonly number[]): number => {
  'worklet';
  const setB = new Set(b);
  let count = 0;
  for (let i = 0; i < a.length; i++) {
    if (setB.has(a[i]!)) count++;
  }
  return count;
};

export const gapCenterCol = (gaps: readonly number[]): number => {
  'worklet';
  if (!gaps.length) return 0;
  return (Math.min(...gaps) + Math.max(...gaps)) / 2;
};

/** Outer cols 0 and columns-1 always walls — fixes empty right edge on runway. */
export const frameOuterWallGaps = (
  gaps: readonly number[],
  columns: number
): number[] => {
  'worklet';
  const out: number[] = [];
  for (let i = 0; i < gaps.length; i++) {
    const c = gaps[i]!;
    if (c > 0 && c < columns - 1) out.push(c);
  }
  out.sort((a, b) => a - b);
  return out;
};

/** Gaps passable when water beat crosses `waterBeatRow`. */
export const passableGapsAtWaterBeat = (
  baseGaps: readonly number[],
  hazard: PlatformSlabHazard | undefined,
  hazardRowIndex: number,
  waterBeatRow: number,
  rowDurationSec: number,
  columns: number,
  totalRows: number
): number[] => {
  'worklet';
  if (!hazard) return baseGaps.slice();
  const localSec = hazardAnimLocalSecFromBeatRow(
    hazard,
    waterBeatRow,
    rowDurationSec,
    totalRows
  );
  return effectiveGapsAtPressPhase(
    baseGaps,
    hazard,
    hazardRowIndex,
    columns,
    localSec,
    rowDurationSec
  );
};

/** Pick survivor col overlapping prev passable; else nearest corridor col to prev center. */
export const pickSurvivorCol = (
  corridorGaps: readonly number[],
  prevPassableGaps: readonly number[],
  side: PlatformSide,
  escapeBias = false,
  columns?: number
): number => {
  'worklet';
  if (!corridorGaps.length) return 0;
  const overlap = corridorGaps.filter((c) => prevPassableGaps.includes(c));
  const pool = overlap.length ? overlap : corridorGaps;
  if (escapeBias) {
    return side === 'right' ? Math.max(...pool) : Math.min(...pool);
  }

  const cols =
    columns != null && Number.isFinite(columns)
      ? columns
      : Math.max(6, Math.max(...corridorGaps) + 2);
  const pressableFromPool = pool.filter(
    (c) => maxOneSidedPressCols(corridorGaps, [c], side, cols) >= 1
  );
  const pressableFromCorridor = corridorGaps.filter(
    (c) => maxOneSidedPressCols(corridorGaps, [c], side, cols) >= 1
  );
  const candidates = pressableFromPool.length
    ? pressableFromPool
    : pressableFromCorridor.length
      ? pressableFromCorridor
      : pool;
  const prevCenter = gapCenterCol(prevPassableGaps);

  // Prefer far-wall survivors (left shaft → high cols, right shaft → low cols),
  // then nearest previous center for continuity.
  let best = candidates[0]!;
  let bestFar =
    side === 'left' ? best : -best;
  let bestDist = Math.abs(best - prevCenter);
  for (let i = 1; i < candidates.length; i++) {
    const c = candidates[i]!;
    const far = side === 'left' ? c : -c;
    const d = Math.abs(c - prevCenter);
    if (far > bestFar || (far === bestFar && d < bestDist)) {
      best = c;
      bestFar = far;
      bestDist = d;
    }
  }
  return best;
};

/** True when `rowsNeeded` prior static rows allow 1-col steps toward `toCol`. */
export const approachDriftOk = (
  historyGaps: readonly number[][],
  fromCol: number,
  toCol: number,
  rowsNeeded: number
): boolean => {
  'worklet';
  if (rowsNeeded <= 0) return true;
  let cursor = fromCol;
  let rowsUsed = 0;
  for (let i = historyGaps.length - 1; i >= 0 && rowsUsed < rowsNeeded; i--) {
    const gaps = historyGaps[i]!;
    if (!gaps.length) continue;
    const minG = Math.min(...gaps);
    const maxG = Math.max(...gaps);
    if (toCol > cursor && maxG > cursor) {
      cursor = Math.min(toCol, cursor + 1);
      rowsUsed++;
    } else if (toCol < cursor && minG < cursor) {
      cursor = Math.max(toCol, cursor - 1);
      rowsUsed++;
    } else if (gaps.includes(toCol)) {
      rowsUsed++;
    }
  }
  return rowsUsed >= rowsNeeded || Math.abs(cursor - toCol) < 0.5;
};

export type PlanShaftPassageParams = {
  columns: number;
  corridorGaps: readonly number[];
  side: PlatformSide;
  survivorCol: number;
  prevPassableGaps: readonly number[];
  timing: RowClockPressTiming;
  rowDurationSec: number;
  minResidualGapCols: number;
  shaftBeatRow: number;
  hazardRowIndex: number;
  totalRows: number;
  seed: number;
  hazardCounter: number;
  nextCorridorGaps?: readonly number[];
  nextBeatRow?: number;
  /** Stack tail: cap press extent and prefer shortest press that still passes. */
  maxPressColsCap?: number;
  preferLowPress?: boolean;
  /** Approach runway: seam at arrival only (allow wide corridor at full press). */
  relaxFullPressOverlap?: boolean;
};

export type PlanShaftPassageResult = {
  pressCols: number;
  pressDurationRows: number;
  pressDurationSec: number;
  animStartRow: number;
  hazard: PlatformSlabHazard;
  overlapAtArrival: number;
  overlapAtDepart: number;
};

/** Largest pressCols that still leaves at least `minOpenCols` at full press. */
export const maxPressColsForMinOpenGaps = (
  corridorGaps: readonly number[],
  side: PlatformSide,
  survivorCol: number,
  columns: number,
  minOpenCols: number
): number => {
  'worklet';
  const survivorGaps = [survivorCol];
  const geomMax = maxOneSidedPressCols(corridorGaps, survivorGaps, side, columns);
  let cap = 0;
  if (corridorGaps.length >= minOpenCols) {
    cap = 0;
  }
  for (let pressCols = 1; pressCols <= geomMax; pressCols++) {
    const tempHazard = buildPlatformSlabHazard(
      { pressCols, pressEase: 'ease-out' },
      columns,
      0,
      1,
      side,
      'cap-probe'
    );
    const open = effectiveGapsAtFullPress(corridorGaps, tempHazard, 0, columns);
    if (open.length >= minOpenCols) cap = pressCols;
    else break;
  }
  return cap;
};

/** Reduce pressCols until arrival + depart beats overlap prev (and next static corridor). */
export const planShaftPassage = (
  params: PlanShaftPassageParams
): PlanShaftPassageResult | null => {
  'worklet';
  const {
    columns,
    corridorGaps,
    side,
    survivorCol,
    prevPassableGaps,
    timing,
    rowDurationSec,
    minResidualGapCols,
    shaftBeatRow,
    hazardRowIndex,
    totalRows,
    seed,
    hazardCounter,
    nextCorridorGaps,
    nextBeatRow,
    maxPressColsCap,
    preferLowPress,
    relaxFullPressOverlap,
  } = params;

  const survivorGaps = [survivorCol];
  const geomMax = maxOneSidedPressCols(corridorGaps, survivorGaps, side, columns);
  const requested = Math.max(1, corridorGaps.length - survivorGaps.length);
  const maxTry = Math.min(requested, geomMax);
  const pressCeiling =
    maxPressColsCap != null && maxPressColsCap > 0
      ? Math.min(maxTry, maxPressColsCap)
      : maxTry;
  const pressDurationSec = Math.max(0.05, timing.pressDurationRows * rowDurationSec);
  const departBeat = nextBeatRow ?? shaftBeatRow + 1;

  const tryPressCols = (pressCols: number): PlanShaftPassageResult | null => {
    const harm = harmonizePlatformSlab(
      { pressCols, pressEase: 'ease-out', pressDurationRows: timing.pressDurationRows },
      { gapWidthCols: corridorGaps.length, oppositeWallInset: 0 },
      { minResidualGapCols }
    );
    const capped = harm.params.pressCols ?? 0;
    if (capped <= 0) return null;

    const tempHazard = buildPlatformSlabHazard(
      {
        pressCols: capped,
        pressDurationRows: timing.pressDurationRows,
        pressDurationSec,
        pressEase: 'ease-out',
        animStartRow: timing.pressStartRow,
      },
      columns,
      hazardRowIndex,
      1,
      side,
      `platform-hz-${seed}-${hazardCounter}-plan`
    );

    const arrivalLocalSec = hazardAnimLocalSecFromBeatRow(
      tempHazard,
      shaftBeatRow,
      rowDurationSec,
      totalRows
    );
    const gapsArrive = effectiveGapsAtPressPhase(
      corridorGaps,
      tempHazard,
      hazardRowIndex,
      columns,
      arrivalLocalSec,
      rowDurationSec
    );
    const gapsFull = effectiveGapsAtFullPress(
      corridorGaps,
      tempHazard,
      hazardRowIndex,
      columns
    );
    const departLocalSec = hazardAnimLocalSecFromBeatRow(
      tempHazard,
      departBeat,
      rowDurationSec,
      totalRows
    );
    const gapsDepart = effectiveGapsAtPressPhase(
      corridorGaps,
      tempHazard,
      hazardRowIndex,
      columns,
      departLocalSec,
      rowDurationSec
    );

    const ovArrive = countGapOverlap(gapsArrive, prevPassableGaps);
    const ovFull = countGapOverlap(gapsFull, prevPassableGaps);
    if (ovArrive < 1) return null;
    if (!relaxFullPressOverlap && ovFull < 1) return null;

    if (nextCorridorGaps?.length) {
      const ovDepartNext = countGapOverlap(gapsDepart, nextCorridorGaps);
      const ovFullNext = countGapOverlap(gapsFull, nextCorridorGaps);
      if (ovDepartNext < 1 && ovFullNext < 1) return null;
    }

    const finalHazard = buildPlatformSlabHazard(
      {
        pressCols: capped,
        pressDurationRows: timing.pressDurationRows,
        pressDurationSec,
        pressEase: 'ease-out',
        animStartRow: timing.pressStartRow,
      },
      columns,
      hazardRowIndex,
      1,
      side,
      `platform-hz-${seed}-${hazardCounter}`
    );

    return {
      pressCols: capped,
      pressDurationRows: timing.pressDurationRows,
      pressDurationSec,
      animStartRow: timing.pressStartRow,
      hazard: finalHazard,
      overlapAtArrival: ovArrive,
      overlapAtDepart: countGapOverlap(gapsDepart, prevPassableGaps),
    };
  };

  if (preferLowPress) {
    for (let pressCols = 1; pressCols <= pressCeiling; pressCols++) {
      const result = tryPressCols(pressCols);
      if (result) return result;
    }
    return null;
  }

  for (let pressCols = pressCeiling; pressCols >= 1; pressCols--) {
    const result = tryPressCols(pressCols);
    if (result) return result;
  }
  return null;
};

export const buildCorridorForPathRow = (
  columns: number,
  wideW: number,
  pathCenterCol: number,
  side: PlatformSide
): { gaps: number[]; blocks: number[] } => {
  'worklet';
  return corridorGapsForShaftRow(columns, wideW, pathCenterCol, side);
};

/** Lower previous shaft pressCols so depart at `beatRow` overlaps `targetGaps`. */
export const repairPrevHazardPress = (
  hazard: PlatformSlabHazard,
  baseGaps: readonly number[],
  hazardRowIndex: number,
  beatRow: number,
  targetGaps: readonly number[],
  rowDurationSec: number,
  columns: number,
  totalRows: number,
  minResidualGapCols: number,
  corridorGapWidth: number
): PlatformSlabHazard | null => {
  'worklet';
  const current = hazard.params.pressCols ?? 1;
  for (let pc = current - 1; pc >= 1; pc--) {
    const harm = harmonizePlatformSlab(
      {
        ...hazard.params,
        pressCols: pc,
      },
      { gapWidthCols: corridorGapWidth, oppositeWallInset: 0 },
      { minResidualGapCols }
    );
    const capped = harm.params.pressCols ?? 0;
    if (capped <= 0) continue;
    const patched = buildPlatformSlabHazard(
      { ...hazard.params, pressCols: capped },
      columns,
      hazardRowIndex,
      1,
      hazard.side,
      hazard.id
    );
    const depart = passableGapsAtWaterBeat(
      baseGaps,
      patched,
      hazardRowIndex,
      beatRow,
      rowDurationSec,
      columns,
      totalRows
    );
    if (countGapOverlap(depart, targetGaps) >= 1) {
      return patched;
    }
  }
  return null;
};
