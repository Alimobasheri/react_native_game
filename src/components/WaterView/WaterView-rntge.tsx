import { useAddSystem } from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs/useAddSystem/useAddSystem';
import { WaterShaderSystem } from '@/systems/PhysicsSystem/WaterShaderSystem';
import { WaterPhysicsSystem } from '@/systems/PhysicsSystem/WaterPhysicsSystem';
import { createWaterLifecycleSystem } from '@/systems/PhysicsSystem/WaterLifecycleSystem';
import { useSceneContextUnsafe } from '@/containers/ReactNativeSkiaGameEngine/components-rntge/Scene/hooks';
import { FC, useMemo } from 'react';

export const WaterView: FC<{
  raisingSpeed: number;
}> = ({ raisingSpeed }) => {
  const sceneContext = useSceneContextUnsafe();
  const sceneKey = sceneContext?.sceneKey ?? 'game';
  const waterLifecycleSystem = useMemo(
    () =>
      createWaterLifecycleSystem({
        sceneKey,
        raisingSpeed,
      }),
    [sceneKey, raisingSpeed]
  );

  // Register water-related systems
  useAddSystem({ system: waterLifecycleSystem });
  useAddSystem({ system: WaterShaderSystem });
  useAddSystem({ system: WaterPhysicsSystem });

  return null;
};
