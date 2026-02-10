import { useAddEntity } from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs/useAddEntity/useAddEntity';
import {
  createRenderComponent,
  ShapeTypes,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { createPositionComponent } from '@/containers/ReactNativeSkiaGameEngine/internal/components/position';
import { createWaterComponent } from '@/Game/ecs-components/Water';
import { useAddSystem } from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs/useAddSystem/useAddSystem';
import { WaterShaderSystem } from '@/systems/PhysicsSystem/WaterShaderSystem';
import { WaterPhysicsSystem } from '@/systems/PhysicsSystem/WaterPhysicsSystem';
import { FC, useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { sourceCode as waterShaderSourceCode } from '@/Shaders/WaterShader/waterShader';

export const WaterView: FC<{
  containerEntityId: number | null;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  raisingSpeed: number;
}> = ({ containerEntityId, centerX, centerY, width, height, raisingSpeed }) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const components = useMemo(() => {
    if (containerEntityId === null) return [];

    // Initial water at container center (no rising phase): half container filled
    // Container UV: 0 = container bottom, 1 = container top; center = 0.5
    const initialWaterLevel = 0.5;

    return [
      createWaterComponent({
        containerEntityId: containerEntityId,
        raisingSpeed: raisingSpeed,
      }),
      createPositionComponent({
        x: centerX,
        y: centerY, // Keep at container center, don't move
      }),
      createRenderComponent({
        shape: {
          type: ShapeTypes.Rectangle,
          width: width, // Same size as container
          height: height,
        },
        position: { x: centerX, y: centerY }, // Same position as container
        visible: true,
        zIndex: 2,
        shader: {
          key: 'water', // Use the water-specific shader
          uniforms: {
            iTime: 0,
            height: 0.5, // Keep for compatibility but not used
            heightOffset: 0.5, // Keep for compatibility but not used
            waterLevel: initialWaterLevel, // Water level in container (0-1)
            frequency: 1.0, // Wave frequency (reduced)
            amplitude: 1, // Wave amplitude (reduced)
            speed: 0.15, // Wave speed (reduced)
            dynamicWaveX: centerX,
            dynamicWave: [0, 0, 0, 0], // No dynamic wave initially
            heightOffsetFreq: 0.5,
            heightOffsetAmp: 0.0,
            waterColor: [28, 163, 236].map((c) => c / 255), // Same blue as sea
            canvasSize: [windowWidth || 0, windowHeight || 0], // Full screen size for fragCoord
            containerCenter: [centerX, centerY], // Container center for masking
            containerWidth: width, // Container width for masking
            containerHeight: height, // Container height for masking
          },
        },
      }),
    ];
  }, [
    containerEntityId,
    centerX,
    centerY,
    width,
    height,
    raisingSpeed,
    windowWidth,
    windowHeight,
  ]);

  const { entityId } = useAddEntity({ components });

  // Register water-related systems
  useAddSystem({ system: WaterShaderSystem });
  useAddSystem({ system: WaterPhysicsSystem });

  return null;
};
