/**
 * Shared pendulum shaft compose helpers.
 */

import { pendulumHazardTuning } from '@/config/pendulumHazardTuning';
import type { PendulumStrikeProfile } from '@/config/pendulumHazardTuning';
import {
  appendCorridorRows,
  blocksFromGaps,
} from '@/Game/path/platformShaft/primitives';
import type { ComposeCtx } from '@/Game/path/platformShaft/recipeCompose';
import type {
  PendulumHazard,
  PendulumHazardParams,
  PlatformShaftRowDef,
} from '@/Game/path/platformShaft/types';

export type AppendPendulumEventSpec = {
  anchorCol?: number;
  tetherLengthRows?: number;
  maxAngleRads?: number;
  swingFrequencyHz?: number;
  phaseOffsetRads?: number;
  rowSpan?: number;
  macroPhase?: PlatformShaftRowDef['macroPhase'];
  runwayRows?: number;
  animStartLocalRow?: number;
  strikeProfile?: PendulumStrikeProfile;
  impulseVelocityY?: number;
};

/** Side walls at col 0 and col (columns-1); optional anchor block on anchor row. */
export const pendulumShaftRow = (
  columns: number,
  anchorCol?: number
): PlatformShaftRowDef => {
  'worklet';
  const sideBlocks = [0, columns - 1];
  const blockSet = new Set(sideBlocks);
  if (anchorCol != null) {
    blockSet.add(anchorCol);
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

/** Side-wall-only rows leading into a pendulum band. */
export const appendPendulumSideWallRows = (
  rowDefs: PlatformShaftRowDef[],
  columns: number,
  count: number
): void => {
  'worklet';
  for (let i = 0; i < count; i++) {
    rowDefs.push(pendulumShaftRow(columns));
  }
};

export const lerpPendulumEscalation = (
  difficulty01: number
): {
  maxAngleRads: number;
  swingFrequencyHz: number;
  tetherLengthRows: number;
} => {
  'worklet';
  const t = Math.max(0, Math.min(1, difficulty01));
  return {
    maxAngleRads:
      pendulumHazardTuning.MAX_ANGLE_RADS * (0.65 + t * 0.35),
    swingFrequencyHz:
      pendulumHazardTuning.SWING_FREQUENCY_HZ * (0.75 + t * 0.45),
    tetherLengthRows: Math.round(
      pendulumHazardTuning.TETHER_ROWS * (0.85 + t * 0.15)
    ),
  };
};

export const appendPendulumEvent = (
  ctx: ComposeCtx,
  localStartRow: number,
  spec: AppendPendulumEventSpec
): number => {
  'worklet';
  const rowSpan = Math.max(
    2,
    spec.rowSpan ?? pendulumHazardTuning.PENDULUM_BAND_ROW_SPAN
  );
  const runway = spec.runwayRows ?? pendulumHazardTuning.MIN_RUNWAY_ROWS;
  const globalBase = ctx.startGlobalRow;
  const bandStartGlobal = globalBase + localStartRow;

  if (runway > 0) {
    appendCorridorRows(ctx.rowDefs, ctx.columns, runway, {
      gapWidthCols: ctx.columns,
      centerCol: (ctx.columns - 1) / 2,
      macroPhase: 'flow',
    });
  }

  const anchorCol =
    spec.anchorCol ?? Math.floor((ctx.columns - 1) / 2);

  for (let i = 0; i < rowSpan; i++) {
    const isAnchorRow = i === 0;
    ctx.rowDefs.push(
      pendulumShaftRow(ctx.columns, isAnchorRow ? anchorCol : undefined)
    );
  }

  const animStartGlobal =
    spec.animStartLocalRow != null
      ? globalBase + spec.animStartLocalRow
      : bandStartGlobal + runway;

  const pendulumParams: PendulumHazardParams = {
    anchorCol,
    tetherLengthRows:
      spec.tetherLengthRows ?? pendulumHazardTuning.TETHER_ROWS,
    maxAngleRads: spec.maxAngleRads ?? pendulumHazardTuning.MAX_ANGLE_RADS,
    swingFrequencyHz:
      spec.swingFrequencyHz ?? pendulumHazardTuning.SWING_FREQUENCY_HZ,
    phaseOffsetRads: spec.phaseOffsetRads ?? 0,
    side: 'center',
    animStartRow: animStartGlobal,
    strikeProfile: spec.strikeProfile,
    impulseVelocityY: spec.impulseVelocityY,
  };

  ctx.hazardCounter += 1;
  const hazardId = `pendulum-hz-${ctx.seed}-${ctx.hazardCounter}`;
  const hazard: PendulumHazard = {
    id: hazardId,
    kind: 'hazard_pendulum',
    bounds: {
      rowStart: bandStartGlobal + runway,
      rowEnd: bandStartGlobal + runway + rowSpan - 1,
      colStart: Math.max(0, anchorCol - 1),
      colEnd: Math.min(ctx.columns - 1, anchorCol + 1),
    },
    params: pendulumParams,
  };
  ctx.hazards.push(hazard);

  ctx.markers.push({
    globalRowIndex: animStartGlobal,
    kind: 'telegraph',
    label: 'pendulum',
  });

  return runway + rowSpan;
};
