import { useAddEntity } from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs/useAddEntity/useAddEntity';
import { useAddSystem } from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs/useAddSystem/useAddSystem';
import { ObstacleSystem } from '@/systems/PhysicsSystem/ObstacleSystem';
import { useSceneContextUnsafe } from '@/containers/ReactNativeSkiaGameEngine/components-rntge/Scene/hooks';
import { createObstaclesManagerComponent } from '@/Game/ecs-components/ObstaclesManager';
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
  const sceneContext = useSceneContextUnsafe();
  const sceneKey = sceneContext?.sceneKey ?? 'swimmerGame';

  // Obstacles manager entity (stores spawn timer/state inside ECS, not globals)
  useAddEntity({
    components: [
      createObstaclesManagerComponent({
        sceneKey,
        spawnTimerSeconds: 0,
      }),
    ],
  });

  // Register the obstacle system
  const { systemId: id } = useAddSystem({ system: ObstacleSystem });

  return null;
};
