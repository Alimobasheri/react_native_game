import type { AABB } from '@/Game/collision/swimmerBlockCollision';
import { pendulumHazardTuning } from '@/config/pendulumHazardTuning';
import type { PendulumHazardParams } from '@/Game/path/platformShaft/types';
import { columnCenterXFromGrid } from '@/Game/hazards/pivotMotion';

export const TWO_PI = Math.PI * 2;

export const pendulumAngleRad = (
  tSec: number,
  maxAngleRads: number,
  swingFrequencyHz: number,
  phaseOffsetRads: number
): number => {
  'worklet';
  return (
    maxAngleRads *
    Math.cos(TWO_PI * swingFrequencyHz * tSec + phaseOffsetRads)
  );
};

export type PendulumHeadTransform = {
  /** Hinge point where tether meets head (parent-local, anchor at 0,0). */
  hingeX: number;
  hingeY: number;
  /** Head center (parent-local). */
  centerX: number;
  centerY: number;
  /** Swing angle from vertical — used for physics, not head render rotation. */
  swingAngleRad: number;
  widthPx: number;
  heightPx: number;
};

export const pendulumPivotFromAnchorRow = (
  anchorRowY: number,
  blockHeight: number
): number => {
  'worklet';
  return anchorRowY + blockHeight * 0.5;
};

export const pendulumHeadTransform = (
  tetherLengthPx: number,
  swingAngleRad: number,
  headWidthPx: number,
  headHeightPx: number
): PendulumHeadTransform => {
  'worklet';
  const sin = Math.sin(swingAngleRad);
  const cos = Math.cos(swingAngleRad);
  const hingeX = sin * tetherLengthPx;
  const hingeY = cos * tetherLengthPx;
  const halfHead = headHeightPx * 0.5;
  return {
    hingeX,
    hingeY,
    centerX: hingeX + sin * halfHead,
    centerY: hingeY + cos * halfHead,
    swingAngleRad,
    widthPx: headWidthPx,
    heightPx: headHeightPx,
  };
};

export const pendulumHeadTransformToWorld = (
  pivotX: number,
  pivotY: number,
  local: PendulumHeadTransform
): { hingeX: number; hingeY: number; centerX: number; centerY: number } => {
  'worklet';
  return {
    hingeX: pivotX + local.hingeX,
    hingeY: pivotY + local.hingeY,
    centerX: pivotX + local.centerX,
    centerY: pivotY + local.centerY,
  };
};

export const aabbFromPendulumHeadTransform = (
  transform: PendulumHeadTransform,
  hitboxScale = 1
): AABB => {
  'worklet';
  const hw = transform.widthPx * 0.5 * hitboxScale;
  const hh = transform.heightPx * 0.5 * hitboxScale;
  return {
    minX: transform.centerX - hw,
    maxX: transform.centerX + hw,
    minY: transform.centerY - hh,
    maxY: transform.centerY + hh,
  };
};

export const aabbFromPendulumHeadWorld = (
  pivotX: number,
  pivotY: number,
  transform: PendulumHeadTransform,
  hitboxScale = 1
): AABB => {
  'worklet';
  const world = pendulumHeadTransformToWorld(pivotX, pivotY, transform);
  const hw = transform.widthPx * 0.5 * hitboxScale;
  const hh = transform.heightPx * 0.5 * hitboxScale;
  return {
    minX: world.centerX - hw,
    maxX: world.centerX + hw,
    minY: world.centerY - hh,
    maxY: world.centerY + hh,
  };
};

export const pendulumHeadAabbFromMatterBody = (body: Matter.Body): AABB => {
  'worklet';
  const bounds = body.bounds;
  return {
    minX: bounds.min.x,
    maxX: bounds.max.x,
    minY: bounds.min.y,
    maxY: bounds.max.y,
  };
};

export const pendulumAnchorWorldCenter = (
  anchorRowY: number,
  anchorCol: number,
  leftX: number,
  columnWidth: number,
  blockHeight: number
): { x: number; y: number } => {
  'worklet';
  return {
    x: columnCenterXFromGrid(anchorCol, leftX, columnWidth),
    y: pendulumPivotFromAnchorRow(anchorRowY, blockHeight),
  };
};

export const pendulumTSecFromSpawn = (
  nowMs: number,
  spawnTimeMs: number
): number => {
  'worklet';
  if (!Number.isFinite(spawnTimeMs) || spawnTimeMs <= 0) {
    return 0;
  }
  return Math.max(0, (nowMs - spawnTimeMs) / 1000);
};

export const buildPendulumHeadTransformFromParams = (
  anchorRowY: number,
  anchorCol: number,
  leftX: number,
  columnWidth: number,
  blockHeight: number,
  params: PendulumHazardParams,
  tSec: number
): PendulumHeadTransform => {
  'worklet';
  const anchor = pendulumAnchorWorldCenter(
    anchorRowY,
    anchorCol,
    leftX,
    columnWidth,
    blockHeight
  );
  const tetherLengthPx = params.tetherLengthRows * blockHeight;
  const swingAngleRad = pendulumAngleRad(
    tSec,
    params.maxAngleRads,
    params.swingFrequencyHz,
    params.phaseOffsetRads
  );
  const headWidthPx = pendulumHazardTuning.HEAD_WIDTH_COLS * columnWidth;
  const headHeightPx = pendulumHazardTuning.HEAD_HEIGHT_ROWS * blockHeight;
  return pendulumHeadTransform(
    tetherLengthPx,
    swingAngleRad,
    headWidthPx,
    headHeightPx
  );
};

export const pendulumHeadXNorm = (
  headCenterX: number,
  containerLeftX: number,
  containerWidth: number
): number => {
  'worklet';
  if (containerWidth <= 0) {
    return 0.5;
  }
  return Math.max(0, Math.min(1, (headCenterX - containerLeftX) / containerWidth));
};

export const pendulumTroughForce = (
  angleRad: number,
  maxAngleRads: number
): number => {
  'worklet';
  if (maxAngleRads <= 0) {
    return 0;
  }
  const normalized = Math.abs(angleRad) / maxAngleRads;
  return Math.max(0, Math.min(1, 0.35 + normalized * 0.65));
};

export const pointInRotatedRect = (
  px: number,
  py: number,
  cx: number,
  cy: number,
  halfW: number,
  halfH: number,
  angleRad: number
): boolean => {
  'worklet';
  const cos = Math.cos(-angleRad);
  const sin = Math.sin(-angleRad);
  const dx = px - cx;
  const dy = py - cy;
  const lx = dx * cos - dy * sin;
  const ly = dx * sin + dy * cos;
  return Math.abs(lx) <= halfW + 0.001 && Math.abs(ly) <= halfH + 0.001;
};

export const columnsBlockedByPendulumAtY = (
  pivotX: number,
  pivotY: number,
  transform: PendulumHeadTransform,
  sampleY: number,
  columns: number,
  leftX: number,
  columnWidth: number
): number[] => {
  'worklet';
  const world = pendulumHeadTransformToWorld(pivotX, pivotY, transform);
  const blocked: number[] = [];
  const halfW = transform.widthPx * 0.5;
  const halfH = transform.heightPx * 0.5;
  for (let col = 0; col < columns; col++) {
    const cx = columnCenterXFromGrid(col, leftX, columnWidth);
    if (
      cx >= world.centerX - halfW &&
      cx <= world.centerX + halfW &&
      sampleY >= world.centerY - halfH &&
      sampleY <= world.centerY + halfH
    ) {
      blocked.push(col);
    }
  }
  return blocked;
};

export const pendulumHeadVelocityAtPoint = (
  anchorX: number,
  anchorY: number,
  px: number,
  py: number,
  angleRad: number,
  maxAngleRads: number,
  swingFrequencyHz: number,
  phaseOffsetRads: number,
  tSec: number
): { vx: number; vy: number } => {
  'worklet';
  const omega = TWO_PI * swingFrequencyHz;
  const phase = omega * tSec + phaseOffsetRads;
  const dThetaDt = -maxAngleRads * omega * Math.sin(phase);
  const dx = px - anchorX;
  const dy = py - anchorY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 0.001) {
    return { vx: 0, vy: 0 };
  }
  const perpX = -dy / dist;
  const perpY = dx / dist;
  const tangentialSpeed = dThetaDt * dist;
  return {
    vx: perpX * tangentialSpeed,
    vy: perpY * tangentialSpeed,
  };
};
