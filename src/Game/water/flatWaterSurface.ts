import type { ContainerComponentData } from '@/Game/ecs-components/Container';

/**
 * Flat top of the water body fill in screen Y (+Y = down).
 * Matches `WaterShaderSystem` `waterLevel` / `container.waterSurfaceY` only —
 * does NOT include shader `finalSurface` bulge, ripples, or gap surge amplitude.
 */
export function getFlatWaterBodyTopY(
  container: ContainerComponentData
): number {
  'worklet';
  return container.waterSurfaceY;
}

/** Row-local Y where flat water meets the block face when foam first spawns. */
export function computeFoamContactLocalY(
  flatWaterTopY: number,
  rowCenterY: number,
  belowSurfaceOffsetPx: number
): number {
  'worklet';
  return flatWaterTopY - rowCenterY + belowSurfaceOffsetPx;
}
