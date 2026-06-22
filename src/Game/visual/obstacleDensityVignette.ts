import type { ObstacleRowComponentData } from '@/Game/ecs-components/ObstacleRowComponent';
import type { ComponentStore } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/component';
import { LAYOUT_CONSTANTS } from '@/Layout';

export function isObstacleRowVisibleOnScreen(
  rowY: number,
  blockHeight: number,
  viewportTop: number,
  viewportBottom: number
): boolean {
  'worklet';
  const halfH = blockHeight * 0.5;
  const rowTop = rowY - halfH;
  const rowBottom = rowY + halfH;
  return rowBottom >= viewportTop && rowTop <= viewportBottom;
}

/** Solid blocks across all rows intersecting the vertical viewport band. */
export function countVisibleObstacleBlocks(
  rowStore: ComponentStore<ObstacleRowComponentData> | undefined,
  viewportTop: number,
  viewportBottom: number,
  blockHeight: number
): number {
  'worklet';
  if (!rowStore || rowStore.count() === 0) {
    return 0;
  }

  let total = 0;
  rowStore.forEach((_entity, row) => {
    if (
      !isObstacleRowVisibleOnScreen(
        row.y,
        blockHeight,
        viewportTop,
        viewportBottom
      )
    ) {
      return;
    }
    total += row.solidColumnCentersX.length;
  });
  return total;
}

export function estimateMaxVisibleObstacleBlocks(
  viewportHeight: number,
  rowPitch: number
): number {
  'worklet';
  const safePitch = Math.max(rowPitch, 1);
  const visibleRowSlots = Math.max(1, Math.ceil(viewportHeight / safePitch));
  return visibleRowSlots * LAYOUT_CONSTANTS.COLUMNS;
}

/** Maps on-screen block count to vignette strength between min and max. */
export function vignetteStrengthFromVisibleBlockCount(
  visibleBlockCount: number,
  maxVisibleBlocks: number,
  minStrength: number,
  maxStrength: number
): number {
  'worklet';
  const maxBlocks = Math.max(1, maxVisibleBlocks);
  const t = Math.max(0, Math.min(1, visibleBlockCount / maxBlocks));
  return minStrength + (maxStrength - minStrength) * t;
}
