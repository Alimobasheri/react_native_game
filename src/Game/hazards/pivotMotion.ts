import type { AABB } from '@/Game/collision/swimmerBlockCollision';
import { pivotHazardTuning } from '@/config/pivotHazardTuning';
import type {
  PivotAnchorMode,
  PivotHazardParams,
  PivotRotationDirection,
} from '@/Game/path/platformShaft/types';

export const TWO_PI = Math.PI * 2;

export const angularVelocityFromRpm = (
  rpm: number,
  direction: PivotRotationDirection
): number => {
  'worklet';
  const sign = direction === 'cw' ? 1 : -1;
  return sign * ((rpm * TWO_PI) / 60);
};

export const advancePivotAngle = (
  angleRad: number,
  omegaRadPerSec: number,
  deltaSec: number
): number => {
  'worklet';
  let next = angleRad + omegaRadPerSec * deltaSec;
  while (next >= TWO_PI) {
    next -= TWO_PI;
  }
  while (next < 0) {
    next += TWO_PI;
  }
  return next;
};

export const armBaseAngleRad = (armIndex: number, armCount: number): number => {
  'worklet';
  return (armIndex * TWO_PI) / Math.max(1, armCount);
};

export type ArmWorldTransform = {
  centerX: number;
  centerY: number;
  angleRad: number;
  lengthPx: number;
  thicknessPx: number;
};

export const hubColumnFromAnchorMode = (
  anchorMode: PivotAnchorMode,
  columns: number
): number => {
  'worklet';
  if (anchorMode === 'wall_left') {
    return 0.5;
  }
  if (anchorMode === 'wall_right') {
    return columns - 1.5;
  }
  return (columns - 1) / 2;
};

export const columnCenterXFromGrid = (
  col: number,
  leftX: number,
  columnWidth: number
): number => {
  'worklet';
  return leftX + (col + 0.5) * columnWidth;
};

export type PivotHubWorldCenter = {
  x: number;
  y: number;
};

export const pivotHubWorldCenter = (
  memberRowYs: readonly number[],
  anchorMode: PivotAnchorMode,
  columns: number,
  leftX: number,
  columnWidth: number
): PivotHubWorldCenter => {
  'worklet';
  let sumY = 0;
  for (let i = 0; i < memberRowYs.length; i++) {
    sumY += memberRowYs[i];
  }
  const hubCol = hubColumnFromAnchorMode(anchorMode, columns);
  return {
    x: columnCenterXFromGrid(hubCol, leftX, columnWidth),
    y: memberRowYs.length > 0 ? sumY / memberRowYs.length : 0,
  };
};

export const armWorldTransform = (
  hubX: number,
  hubY: number,
  pivotAngleRad: number,
  armIndex: number,
  armCount: number,
  armLengthPx: number,
  armThicknessPx: number,
  columnWidth: number
): ArmWorldTransform => {
  'worklet';
  const base = armBaseAngleRad(armIndex, armCount);
  const angleRad = pivotAngleRad + base;
  const hubHalfPx =
    (pivotHazardTuning.HUB_SIZE_COLS * columnWidth) / 2;
  const disconnectPx =
    pivotHazardTuning.HUB_ARM_DISCONNECT_COL_FRACTION * columnWidth;
  const inner = hubHalfPx + disconnectPx;
  const dist = inner + armLengthPx * 0.5;
  return {
    centerX: hubX + Math.cos(angleRad) * dist,
    centerY: hubY + Math.sin(angleRad) * dist,
    angleRad,
    lengthPx: armLengthPx,
    thicknessPx: armThicknessPx,
  };
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

export const aabbFromArmTransform = (
  transform: ArmWorldTransform,
  hitboxScale = 1
): AABB => {
  'worklet';
  const hw = transform.lengthPx * 0.5 * hitboxScale;
  const hh = transform.thicknessPx * 0.5 * hitboxScale;
  const c = Math.abs(Math.cos(transform.angleRad));
  const s = Math.abs(Math.sin(transform.angleRad));
  const extW = hw * c + hh * s;
  const extH = hw * s + hh * c;
  return {
    minX: transform.centerX - extW,
    maxX: transform.centerX + extW,
    minY: transform.centerY - extH,
    maxY: transform.centerY + extH,
  };
};

export const armVelocityAtPoint = (
  hubX: number,
  hubY: number,
  px: number,
  py: number,
  omegaRadPerSec: number
): { vx: number; vy: number } => {
  'worklet';
  return {
    vx: omegaRadPerSec * (py - hubY),
    vy: -omegaRadPerSec * (px - hubX),
  };
};

export const hubAabbFromPivot = (
  hub: PivotHubWorldCenter,
  columnWidth: number,
  blockHeight?: number
): AABB => {
  'worklet';
  const hubWidth = pivotHazardTuning.HUB_SIZE_COLS * columnWidth;
  const hubHeight = blockHeight ?? hubWidth;
  const halfW = hubWidth * 0.5;
  const halfH = hubHeight * 0.5;
  return {
    minX: hub.x - halfW,
    maxX: hub.x + halfW,
    minY: hub.y - halfH,
    maxY: hub.y + halfH,
  };
};

export const columnsBlockedByArmsAtY = (
  transforms: readonly ArmWorldTransform[],
  waterY: number,
  columns: number,
  leftX: number,
  columnWidth: number
): number[] => {
  'worklet';
  const blocked: number[] = [];
  for (let col = 0; col < columns; col++) {
    const cx = columnCenterXFromGrid(col, leftX, columnWidth);
    let isBlocked = false;
    for (let a = 0; a < transforms.length; a++) {
      const t = transforms[a];
      if (
        pointInRotatedRect(
          cx,
          waterY,
          t.centerX,
          t.centerY,
          t.lengthPx * 0.5,
          t.thicknessPx * 0.5,
          t.angleRad
        )
      ) {
        isBlocked = true;
        break;
      }
    }
    if (isBlocked) {
      blocked.push(col);
    }
  }
  return blocked;
};

/** Column mask at water Y — arms plus solid hub axle. */
export const columnsBlockedByPivotAtY = (
  hub: PivotHubWorldCenter,
  transforms: readonly ArmWorldTransform[],
  waterY: number,
  columns: number,
  leftX: number,
  columnWidth: number,
  blockHeight: number
): number[] => {
  'worklet';
  const blockedSet = new Set<number>(
    columnsBlockedByArmsAtY(transforms, waterY, columns, leftX, columnWidth)
  );
  const hubBox = hubAabbFromPivot(hub, columnWidth, blockHeight);
  for (let col = 0; col < columns; col++) {
    const cx = columnCenterXFromGrid(col, leftX, columnWidth);
    if (cx >= hubBox.minX && cx <= hubBox.maxX && waterY >= hubBox.minY && waterY <= hubBox.maxY) {
      blockedSet.add(col);
    }
  }
  const blocked: number[] = [];
  blockedSet.forEach((col) => blocked.push(col));
  blocked.sort((a, b) => a - b);
  return blocked;
};

export const buildArmTransformsForPivot = (
  hub: PivotHubWorldCenter,
  pivotAngleRad: number,
  params: PivotHazardParams,
  columnWidth: number,
  blockHeight: number
): ArmWorldTransform[] => {
  'worklet';
  const armLengthPx = params.armLengthCols * columnWidth;
  const armThicknessPx = params.armThicknessRows * blockHeight;
  const transforms: ArmWorldTransform[] = [];
  for (let i = 0; i < params.armCount; i++) {
    transforms.push(
      armWorldTransform(
        hub.x,
        hub.y,
        pivotAngleRad,
        i,
        params.armCount,
        armLengthPx,
        armThicknessPx,
        columnWidth
      )
    );
  }
  return transforms;
};

export const effectiveGapsFromBlockedCols = (
  baseGaps: readonly number[],
  blockedCols: readonly number[]
): number[] => {
  'worklet';
  const blockedSet = new Set<number>();
  for (let i = 0; i < blockedCols.length; i++) {
    blockedSet.add(blockedCols[i]);
  }
  const effective: number[] = [];
  for (let g = 0; g < baseGaps.length; g++) {
    const col = baseGaps[g];
    if (!blockedSet.has(col)) {
      effective.push(col);
    }
  }
  effective.sort((a, b) => a - b);
  return effective;
};

export const pivotAngleFromLocalSec = (
  localSec: number,
  params: PivotHazardParams
): number => {
  'worklet';
  const omega = angularVelocityFromRpm(params.rpm, params.direction);
  return advancePivotAngle(0, omega, localSec);
};

export const resolvePivotAnimStartRow = (
  params: PivotHazardParams,
  boundsRowStart: number
): number => {
  'worklet';
  const raw = params.animStartRow;
  if (raw != null && Number.isFinite(raw)) {
    return raw;
  }
  return boundsRowStart;
};

export const pivotLocalSecFromBeatRow = (
  params: PivotHazardParams,
  boundsRowStart: number,
  beatRowAtHazard: number,
  rowDurationSec: number
): number => {
  'worklet';
  const startRow = resolvePivotAnimStartRow(params, boundsRowStart);
  if (!Number.isFinite(beatRowAtHazard) || beatRowAtHazard < startRow) {
    return 0;
  }
  return Math.max(0, (beatRowAtHazard - startRow) * rowDurationSec);
};
