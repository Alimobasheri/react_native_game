/**
 * Vertical piston — analytic ping-pong motion along a grey track.
 * Worklet-safe. Child-free: pose is derived from spawn time + params.
 */

import type { AABB } from '@/Game/collision/swimmerBlockCollision';
import { pistonHazardTuning } from '@/config/pistonHazardTuning';
import type { PistonHazardParams } from '@/Game/path/platformShaft/types';
import { columnCenterXFromGrid } from '@/Game/hazards/pivotMotion';

const clamp01 = (t: number): number => {
  'worklet';
  return Math.max(0, Math.min(1, t));
};

/** Smoothstep ease-in-out (mechanical piston feel). */
export const pistonEaseInOut = (t: number): number => {
  'worklet';
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};

export const pistonTSecFromSpawn = (
  nowMs: number,
  spawnTimeMs: number
): number => {
  'worklet';
  if (!Number.isFinite(spawnTimeMs) || spawnTimeMs <= 0) {
    return 0;
  }
  return Math.max(0, (nowMs - spawnTimeMs) / 1000);
};

/**
 * Ping-pong extension 0..1 along track.
 * Cycle: extend (ease) → hold → retract (ease) → hold-at-base briefly.
 * Uses modulo so large deltaTime never exceeds track bounds.
 */
export const pistonExtension01 = (
  motionSec: number,
  speedRowsPerSec: number,
  trackLengthRows: number,
  holdAtTipSec: number
): number => {
  'worklet';
  const speed = Math.max(0.05, speedRowsPerSec);
  const track = Math.max(0.25, trackLengthRows);
  const travelSec = track / speed;
  const hold = Math.max(0, holdAtTipSec);
  const halfCycle = travelSec + hold;
  const fullCycle = halfCycle * 2;
  if (fullCycle <= 0.001) {
    return 0;
  }
  const t = ((motionSec % fullCycle) + fullCycle) % fullCycle;
  if (t <= travelSec) {
    return pistonEaseInOut(t / travelSec);
  }
  if (t <= halfCycle) {
    return 1;
  }
  const retractT = t - halfCycle;
  if (retractT <= travelSec) {
    return 1 - pistonEaseInOut(retractT / travelSec);
  }
  return 0;
};

export type PistonPose = {
  /** Mount face Y (world) — floor = top of mount block, ceiling = bottom of mount. */
  mountY: number;
  /** Head center world X/Y. */
  headCenterX: number;
  headCenterY: number;
  /** Track tip Y (max extension end). */
  trackTipY: number;
  /** Track base Y (mount end of grey line). */
  trackBaseY: number;
  widthPx: number;
  heightPx: number;
  extension01: number;
  /** Instantaneous vertical velocity of head center (px/s, +down). */
  velocityY: number;
  telegraphPulse01: number;
  motionStarted: boolean;
};

export const pistonHeadSizePx = (
  columnWidth: number,
  blockHeight: number
): { widthPx: number; heightPx: number } => {
  'worklet';
  return {
    widthPx: columnWidth * pistonHazardTuning.HEAD_WIDTH_COL_FRACTION,
    heightPx: blockHeight * pistonHazardTuning.HEAD_HEIGHT_ROW_FRACTION,
  };
};

export const pistonMountWorldY = (
  mountRowY: number,
  blockHeight: number,
  mount: 'floor' | 'ceiling'
): number => {
  'worklet';
  // Floor mount: track extends upward (-Y) from top of mount block.
  // Ceiling mount: track extends downward (+Y) from bottom of mount block.
  if (mount === 'floor') {
    return mountRowY - blockHeight * 0.5;
  }
  return mountRowY + blockHeight * 0.5;
};

export const buildPistonPose = (args: {
  mountRowY: number;
  column: number;
  leftX: number;
  columnWidth: number;
  blockHeight: number;
  params: PistonHazardParams;
  tSec: number;
  rowDurationSec: number;
}): PistonPose => {
  'worklet';
  const {
    mountRowY,
    column,
    leftX,
    columnWidth,
    blockHeight,
    params,
    tSec,
    rowDurationSec,
  } = args;

  const telegraphRows =
    params.telegraphDelayRows ?? pistonHazardTuning.TELEGRAPH_DELAY_ROWS;
  const telegraphSec = Math.max(0, telegraphRows) * Math.max(0.05, rowDurationSec);
  const pulseSec = pistonHazardTuning.TELEGRAPH_PULSE_SEC;
  const motionStarted = tSec >= telegraphSec;
  const motionSec = motionStarted ? tSec - telegraphSec : 0;

  let telegraphPulse01 = 0;
  if (!motionStarted && telegraphSec > 0) {
    const remaining = telegraphSec - tSec;
    if (remaining <= pulseSec) {
      const pulseT = 1 - remaining / pulseSec;
      telegraphPulse01 = 0.5 + 0.5 * Math.sin(pulseT * Math.PI * 6);
    }
  }

  const trackLengthRows = Math.max(
    0.5,
    params.trackLengthRows ?? pistonHazardTuning.TRACK_LENGTH_ROWS
  );
  const speed = Math.max(
    0.05,
    params.speedRowsPerSec ?? pistonHazardTuning.BASE_SPEED_ROWS_PER_SEC
  );
  const hold =
    params.holdAtTipSec ?? pistonHazardTuning.HOLD_AT_TIP_SEC;
  const extension01 = motionStarted
    ? pistonExtension01(motionSec, speed, trackLengthRows, hold)
    : 0;

  const size = pistonHeadSizePx(columnWidth, blockHeight);
  const mountY = pistonMountWorldY(mountRowY, blockHeight, params.mount);
  const travelPx = trackLengthRows * blockHeight;
  const headHalfH = size.heightPx * 0.5;
  const headCenterX = columnCenterXFromGrid(column, leftX, columnWidth);

  // Head rests with near edge at mount; extends along track.
  let headCenterY: number;
  let trackTipY: number;
  let trackBaseY: number;
  if (params.mount === 'floor') {
    trackBaseY = mountY;
    trackTipY = mountY - travelPx;
    // At rest: head above mount face by half height (sitting on floor mount).
    headCenterY = mountY - headHalfH - extension01 * (travelPx - headHalfH);
  } else {
    trackBaseY = mountY;
    trackTipY = mountY + travelPx;
    headCenterY = mountY + headHalfH + extension01 * (travelPx - headHalfH);
  }

  // Finite-diff velocity for swept collision (sample small dt).
  const sampleDt = 1 / 120;
  const extNext = motionStarted
    ? pistonExtension01(motionSec + sampleDt, speed, trackLengthRows, hold)
    : 0;
  let headCenterYNext: number;
  if (params.mount === 'floor') {
    headCenterYNext =
      mountY - headHalfH - extNext * (travelPx - headHalfH);
  } else {
    headCenterYNext =
      mountY + headHalfH + extNext * (travelPx - headHalfH);
  }
  const velocityY = (headCenterYNext - headCenterY) / sampleDt;

  return {
    mountY,
    headCenterX,
    headCenterY,
    trackTipY,
    trackBaseY,
    widthPx: size.widthPx,
    heightPx: size.heightPx,
    extension01,
    velocityY,
    telegraphPulse01,
    motionStarted,
  };
};

export const aabbFromPistonHead = (
  centerX: number,
  centerY: number,
  widthPx: number,
  heightPx: number,
  insetFraction = pistonHazardTuning.COLLIDER_INSET_FRACTION
): AABB => {
  'worklet';
  const insetX = widthPx * insetFraction * 0.5;
  const insetY = heightPx * insetFraction * 0.5;
  const hw = widthPx * 0.5 - insetX;
  const hh = heightPx * 0.5 - insetY;
  return {
    minX: centerX - hw,
    maxX: centerX + hw,
    minY: centerY - hh,
    maxY: centerY + hh,
  };
};

export const aabbFromPistonPose = (pose: PistonPose): AABB => {
  'worklet';
  return aabbFromPistonHead(
    pose.headCenterX,
    pose.headCenterY,
    pose.widthPx,
    pose.heightPx
  );
};

/**
 * Resolve mount row Y from band members.
 * Floor: highest Y (water-closest / bottom of band in screen space? Wait)
 *
 * In this game +Y is down. Rows scroll downward (Y increases).
 * Band rowStart is water-closest / lower beat index typically spawned above.
 * Looking at pendulum: it picks minimum Y as anchor (topmost on screen = ceiling side).
 *
 * For floor mount: mount block is at the BOTTOM of the track (highest Y among band).
 * For ceiling mount: mount block is at the TOP of the track (lowest Y among band).
 */
export const resolvePistonMountRowY = (
  memberYs: readonly number[],
  mount: 'floor' | 'ceiling'
): number => {
  'worklet';
  if (memberYs.length === 0) {
    return 0;
  }
  let mountY = memberYs[0];
  for (let i = 1; i < memberYs.length; i++) {
    const y = memberYs[i];
    if (mount === 'floor') {
      if (y > mountY) {
        mountY = y;
      }
    } else if (y < mountY) {
      mountY = y;
    }
  }
  return mountY;
};
