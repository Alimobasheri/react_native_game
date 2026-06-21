import { FC, useMemo } from 'react';
import { useAddSystem } from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs/useAddSystem/useAddSystem';
import {
  createSideWallParallaxSystem,
  SideWallParallaxSystemParams,
} from '@/systems/PhysicsSystem/SideWallParallaxSystem';
import { sideWallTuning } from '@/config/swimmerTuning';

export type SideWallsProps = SideWallParallaxSystemParams;

/**
 * SideWalls — purple cave rock strips flanking the play channel.
 * Registers SideWallParallaxSystem for vertically looping parallax
 * (faster than obstacle blocks, in front of them).
 */
export const SideWalls: FC<SideWallsProps> = ({
  containerOverlapPx = sideWallTuning.CONTAINER_OVERLAP_PX,
  parallaxSpeedFactor = sideWallTuning.PARALLAX_SPEED_FACTOR,
}) => {
  const system = useMemo(
    () =>
      createSideWallParallaxSystem({
        containerOverlapPx,
        parallaxSpeedFactor,
      }),
    [containerOverlapPx, parallaxSpeedFactor]
  );

  useAddSystem({ system });

  return null;
};
