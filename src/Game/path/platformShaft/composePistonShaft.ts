/**
 * Shared vertical piston shaft compose helpers.
 */

import {
  pistonHazardTuning,
  type PistonMountType,
  type PistonSafeExitSide,
} from '@/config/pistonHazardTuning';
import {
  appendCorridorRows,
  blocksFromGaps,
} from '@/Game/path/platformShaft/primitives';
import type { ComposeCtx } from '@/Game/path/platformShaft/recipeCompose';
import type {
  PistonHazard,
  PistonHazardParams,
  PlatformShaftRowDef,
} from '@/Game/path/platformShaft/types';

export type AppendPistonEventSpec = {
  column?: number;
  mount?: PistonMountType;
  trackLengthRows?: number;
  speedRowsPerSec?: number;
  safeExitSide?: PistonSafeExitSide;
  runwayRows?: number;
  clearanceRows?: number;
  bandRowSpan?: number;
  animStartLocalRow?: number;
  telegraphDelayRows?: number;
  holdAtTipSec?: number;
  macroPhase?: PlatformShaftRowDef['macroPhase'];
};

/** Side walls + optional mount block in the piston column. */
export const pistonShaftRow = (
  columns: number,
  mountCol?: number
): PlatformShaftRowDef => {
  'worklet';
  const blockSet = new Set<number>([0, columns - 1]);
  if (mountCol != null) {
    blockSet.add(mountCol);
  }
  const gaps: number[] = [];
  for (let c = 0; c < columns; c++) {
    if (!blockSet.has(c)) {
      gaps.push(c);
    }
  }
  gaps.sort((a, b) => a - b);
  return {
    gaps,
    blocks: blocksFromGaps(columns, gaps),
    macroPhase: 'tension',
  };
};

/** Open corridor row with side walls only (track extends through these). */
export const pistonTrackCorridorRow = (
  columns: number
): PlatformShaftRowDef => {
  'worklet';
  return pistonShaftRow(columns);
};

export const lerpPistonEscalation = (
  difficulty01: number
): {
  speedRowsPerSec: number;
  trackLengthRows: number;
  ceilingWeight: number;
} => {
  'worklet';
  const t = Math.max(0, Math.min(1, difficulty01));
  return {
    speedRowsPerSec:
      pistonHazardTuning.BASE_SPEED_ROWS_PER_SEC * (0.75 + t * 0.55),
    trackLengthRows:
      pistonHazardTuning.TRACK_LENGTH_ROWS * (0.9 + t * 0.25),
    ceilingWeight:
      pistonHazardTuning.CEILING_MOUNT_WEIGHT_AT_MIN +
      t *
        (pistonHazardTuning.CEILING_MOUNT_WEIGHT_AT_MAX -
          pistonHazardTuning.CEILING_MOUNT_WEIGHT_AT_MIN),
  };
};

export const clampPistonColumn = (col: number, columns: number): number => {
  'worklet';
  const minC = pistonHazardTuning.MIN_COLUMN;
  const maxC = Math.min(pistonHazardTuning.MAX_COLUMN, columns - 2);
  return Math.max(minC, Math.min(maxC, Math.round(col)));
};

/**
 * Append a fair piston set-piece:
 * runway → approach walls → mount + track corridor → clearance beyond stroke →
 * hazard descriptor with safe-exit side.
 */
export const appendPistonEvent = (
  ctx: ComposeCtx,
  localStartRow: number,
  spec: AppendPistonEventSpec
): number => {
  'worklet';
  const runway = spec.runwayRows ?? pistonHazardTuning.MIN_RUNWAY_ROWS;
  const trackLengthRows = Math.max(
    1,
    spec.trackLengthRows ?? pistonHazardTuning.TRACK_LENGTH_ROWS
  );
  const clearance =
    spec.clearanceRows ??
    pistonHazardTuning.MIN_CLEARANCE_ROWS_BEYOND_STROKE;
  // Band: mount row + track corridor rows covering the stroke.
  const trackCorridorRows = Math.max(1, Math.ceil(trackLengthRows));
  const bandRowSpan = Math.max(
    2,
    spec.bandRowSpan ?? trackCorridorRows + 1
  );
  const globalBase = ctx.startGlobalRow;
  const mount = spec.mount ?? 'floor';
  const column = clampPistonColumn(
    spec.column ?? Math.floor((ctx.columns - 1) / 2),
    ctx.columns
  );
  const safeExitSide: PistonSafeExitSide =
    spec.safeExitSide ??
    (column <= (ctx.columns - 1) / 2 ? 'right' : 'left');

  if (runway > 0) {
    appendCorridorRows(ctx.rowDefs, ctx.columns, runway, {
      gapWidthCols: ctx.columns,
      centerCol: (ctx.columns - 1) / 2,
      macroPhase: 'flow',
    });
  }

  // Approach walls framing the challenge.
  for (let i = 0; i < pistonHazardTuning.APPROACH_WALL_ROWS; i++) {
    ctx.rowDefs.push(pistonTrackCorridorRow(ctx.columns));
  }

  const bandStartLocal =
    localStartRow + runway + pistonHazardTuning.APPROACH_WALL_ROWS;
  const bandStartGlobal = globalBase + bandStartLocal;

  // Band rows: beat index 0 of the segment sits lower on screen (+Y).
  // Floor mount = first band row (bottom); ceiling mount = last band row (top).
  for (let i = 0; i < bandRowSpan; i++) {
    const isMountRow =
      mount === 'floor' ? i === 0 : i === bandRowSpan - 1;
    const row = pistonShaftRow(
      ctx.columns,
      isMountRow ? column : undefined
    );
    // Escape column must stay open on all band rows (no ceiling block parallel to tip).
    const escapeCol =
      safeExitSide === 'left' ? column - 1 : column + 1;
    if (
      escapeCol > 0 &&
      escapeCol < ctx.columns - 1 &&
      !row.gaps.includes(escapeCol)
    ) {
      row.gaps.push(escapeCol);
      row.gaps.sort((a, b) => a - b);
      row.blocks = blocksFromGaps(ctx.columns, row.gaps);
    }
    // Mount column is open on non-mount rows so the track occupies a gap column.
    if (!isMountRow && !row.gaps.includes(column)) {
      row.gaps.push(column);
      row.gaps.sort((a, b) => a - b);
      row.blocks = blocksFromGaps(ctx.columns, row.gaps);
    }
    row.macroPhase = spec.macroPhase ?? 'tension';
    ctx.rowDefs.push(row);
  }

  // Clearance beyond max extension — empty rows in mount column.
  for (let i = 0; i < clearance; i++) {
    const clearRow = pistonTrackCorridorRow(ctx.columns);
    if (!clearRow.gaps.includes(column)) {
      clearRow.gaps.push(column);
      clearRow.gaps.sort((a, b) => a - b);
      clearRow.blocks = blocksFromGaps(ctx.columns, clearRow.gaps);
    }
    clearRow.macroPhase = 'tension';
    ctx.rowDefs.push(clearRow);
  }

  const animStartGlobal =
    spec.animStartLocalRow != null
      ? globalBase + spec.animStartLocalRow
      : bandStartGlobal;

  const pistonParams: PistonHazardParams = {
    column,
    mount,
    trackLengthRows,
    speedRowsPerSec:
      spec.speedRowsPerSec ?? pistonHazardTuning.BASE_SPEED_ROWS_PER_SEC,
    safeExitSide,
    animStartRow: animStartGlobal,
    telegraphDelayRows:
      spec.telegraphDelayRows ?? pistonHazardTuning.TELEGRAPH_DELAY_ROWS,
    holdAtTipSec: spec.holdAtTipSec ?? pistonHazardTuning.HOLD_AT_TIP_SEC,
  };

  ctx.hazardCounter += 1;
  const hazardId = `piston-hz-${ctx.seed}-${ctx.hazardCounter}`;
  const hazard: PistonHazard = {
    id: hazardId,
    kind: 'hazard_piston',
    bounds: {
      rowStart: bandStartGlobal,
      rowEnd: bandStartGlobal + bandRowSpan - 1,
      colStart: column,
      colEnd: column,
    },
    params: pistonParams,
  };
  ctx.hazards.push(hazard);

  ctx.markers.push({
    globalRowIndex: animStartGlobal,
    kind: 'telegraph',
    label: 'piston',
  });

  return (
    runway +
    pistonHazardTuning.APPROACH_WALL_ROWS +
    bandRowSpan +
    clearance
  );
};
