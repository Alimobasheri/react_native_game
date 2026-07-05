import type { ObstacleRowComponentData } from '@/Game/ecs-components/ObstacleRowComponent';
import type { WaterTransitionBand } from '@/Game/grid/waterTransitionBand';

export type SegmentWaterLockRow = {
  entity: number;
  beatRowIndex: number;
  y: number;
};

/**
 * Row the water surface locks to for phase — must match hazard shaftSegmentEpoch so loop
 * overlap (old segment rows still on screen) does not advance press with stale beat indices.
 */
export const resolveSegmentWaterLockRow = (args: {
  rowStore: {
    get: (entity: number) => ObstacleRowComponentData | undefined;
    forEach: (fn: (entity: number, row: ObstacleRowComponentData) => void) => void;
  };
  centerRowEntity?: number;
  shaftSegmentEpoch?: number;
  waterSurfaceY: number;
  blockHeight: number;
}): SegmentWaterLockRow | null => {
  'worklet';
  const { rowStore, centerRowEntity, shaftSegmentEpoch, waterSurfaceY, blockHeight } = args;
  const halfH = blockHeight / 2;

  const epochMatches = (row: ObstacleRowComponentData): boolean => {
    if (shaftSegmentEpoch == null) {
      return true;
    }
    return row.shaftSegmentEpoch === shaftSegmentEpoch;
  };

  if (typeof centerRowEntity === 'number') {
    const centerRow = rowStore.get(centerRowEntity);
    if (
      centerRow &&
      centerRow.beatRowIndex != null &&
      epochMatches(centerRow)
    ) {
      return {
        entity: centerRowEntity,
        beatRowIndex: centerRow.beatRowIndex,
        y: centerRow.y,
      };
    }
  }

  // New segment after loop: ignore stale epoch until at least one row exists for this epoch.
  if (shaftSegmentEpoch != null) {
    let hasEpochRow = false;
    rowStore.forEach((_entity, row) => {
      if (row.shaftSegmentEpoch === shaftSegmentEpoch && row.beatRowIndex != null) {
        hasEpochRow = true;
      }
    });
    if (!hasEpochRow) {
      return null;
    }
  }

  let bestOverlap: SegmentWaterLockRow | null = null;
  let bestOverlapDist = Number.POSITIVE_INFINITY;
  let bestNear: SegmentWaterLockRow | null = null;
  let bestNearDist = Number.POSITIVE_INFINITY;

  rowStore.forEach((entity, row) => {
    if (row.beatRowIndex == null || !epochMatches(row)) {
      return;
    }
    const rowTop = row.y - halfH;
    const rowBottom = row.y + halfH;
    const overlaps =
      waterSurfaceY >= rowTop - 0.001 && waterSurfaceY <= rowBottom + 0.001;
    const surfaceDist = Math.abs(row.y - waterSurfaceY);
    const ref: SegmentWaterLockRow = {
      entity,
      beatRowIndex: row.beatRowIndex,
      y: row.y,
    };
    if (overlaps && surfaceDist < bestOverlapDist) {
      bestOverlapDist = surfaceDist;
      bestOverlap = ref;
    }
    if (surfaceDist < bestNearDist) {
      bestNearDist = surfaceDist;
      bestNear = ref;
    } else if (
      bestNear &&
      surfaceDist <= bestNearDist + 0.001 &&
      row.beatRowIndex > bestNear.beatRowIndex
    ) {
      bestNear = ref;
    }
  });

  return bestOverlap ?? bestNear;
};

/**
 * Continuous fractional beat index keyed off the water-lock center row.
 * Advances monotonically as the center row scrolls down — not capped to ~1 beat in the transition band.
 */
export const worldBeatFromWaterLock = (
  centerBeatRow: number,
  centerRowY: number,
  rowPitch: number,
  band: WaterTransitionBand,
  blockHeight: number
): number => {
  'worklet';
  if (!Number.isFinite(centerBeatRow) || centerBeatRow < 0) {
    return -1;
  }
  const pitch = Math.max(0.001, rowPitch);
  const rowTop = centerRowY - blockHeight / 2;
  return centerBeatRow + (rowTop - band.transitionTargetY) / pitch;
};

/** Monotonic latch for per-modifier world beat (never decreases while hazard lives). */
export const latchedWorldBeat = (prevMax: number, nextBeat: number): number => {
  'worklet';
  if (nextBeat < 0) {
    return prevMax;
  }
  return Math.max(prevMax, nextBeat);
};

/**
 * Segment-local beat latch — resets when beat regresses (shaft loop / epoch handoff).
 */
export const latchedSegmentWorldBeat = (
  prevMax: number,
  nextBeat: number,
  resetRegressionThreshold = 0.5
): number => {
  'worklet';
  if (nextBeat < 0) {
    return prevMax;
  }
  if (prevMax >= 0 && nextBeat < prevMax - resetRegressionThreshold) {
    return nextBeat;
  }
  return Math.max(prevMax, nextBeat);
};
