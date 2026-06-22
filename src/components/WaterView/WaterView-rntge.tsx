import { useAddSystem } from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs/useAddSystem/useAddSystem';
import { WaterShaderSystem } from '@/systems/PhysicsSystem/WaterShaderSystem';
import { WaterPhysicsSystem } from '@/systems/PhysicsSystem/WaterPhysicsSystem';
import { createWaterLifecycleSystem } from '@/systems/PhysicsSystem/WaterLifecycleSystem';
import { IdleWaterVisualSystem } from '@/systems/PhysicsSystem/IdleWaterVisualSystem';
import { BlockFoamSystem } from '@/systems/VisualSystem/BlockFoamSystem';
import { useSceneContextUnsafe } from '@/containers/ReactNativeSkiaGameEngine/components-rntge/Scene/hooks';
import { FC, useMemo } from 'react';

export const WaterView: FC<{
  raisingSpeed: number;
  /**
   * Multiplies water shader paint alpha. Lower = clearer swimmer beneath the water.
   */
  shaderOpacity?: number;
}> = ({ raisingSpeed, shaderOpacity }) => {
  const sceneContext = useSceneContextUnsafe();
  const sceneKey = sceneContext?.sceneKey ?? 'game';
  const waterLifecycleSystem = useMemo(
    () =>
      createWaterLifecycleSystem({
        sceneKey,
        raisingSpeed,
        shaderOpacity,
      }),
    [sceneKey, raisingSpeed, shaderOpacity]
  );

  useAddSystem({ system: waterLifecycleSystem });
  useAddSystem({ system: IdleWaterVisualSystem });
  useAddSystem({ system: WaterShaderSystem });
  useAddSystem({ system: WaterPhysicsSystem });
  useAddSystem({ system: BlockFoamSystem });

  return null;
};
