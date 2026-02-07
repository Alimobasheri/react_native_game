import { useAddSystem } from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs/useAddSystem/useAddSystem';
import { ObstacleSystem } from '@/systems/PhysicsSystem/ObstacleSystem';
import { FC } from 'react';

/**
 * ObstacleView - Component that manages dynamic obstacles for the swimmer game
 *
 * This component registers the ObstacleSystem which handles:
 * - Spawning obstacles in a grid pattern
 * - Moving obstacles downward
 * - Removing obstacles that pass screen boundaries
 */
export const ObstacleView: FC<{}> = () => {
  // Register the obstacle system
  useAddSystem({ system: ObstacleSystem });

  return null;
};
