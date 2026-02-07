import { useAddEntity } from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs/useAddEntity/useAddEntity';
import {
  createRenderComponent,
  ShapeTypes,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { createPositionComponent } from '@/containers/ReactNativeSkiaGameEngine/internal/components/position';
import { createPanComponent } from '@/containers/ReactNativeSkiaGameEngine/internal/components/touch';
import { createSwimmerComponent } from '@/Game/ecs-components/Swimmer';
import { useAddSystem } from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs/useAddSystem/useAddSystem';
import { SwimmerPhysicsSystem } from '@/systems/PhysicsSystem/SwimmerPhysicsSystem';
import { FC, useMemo } from 'react';

const swimmerSize = 40;
const swimmerHeight = 60;

export const SwimmerView: FC<{
  x: number;
  y: number;
  containerWidth: number;
  containerHeight: number;
  containerCenterX: number;
  containerCenterY: number;
}> = ({ x, y, containerWidth, containerHeight, containerCenterX, containerCenterY }) => {
  const components = useMemo(
    () => [
      createSwimmerComponent({
        velocityX: 0,
        waterSurfaceY: y,
        containerWidth: containerWidth,
        containerCenterX,
        containerCenterY,
        isInInitialPhase: true, // Start in initial phase where water rises
        isCollidingWithObstacle: false,
        fallingVelocityY: 0,
      }),
      createPositionComponent({ x, y }),
      createRenderComponent({
        shape: {
          type: ShapeTypes.Rectangle,
          width: swimmerSize,
          height: swimmerHeight,
        },
        position: { x, y }, // Set position in render component
        fillColor: '#4a90e2', // Blue color for swimmer
        visible: true,
        zIndex: 3,
      }),
      createPanComponent({
        onPanUpdate: (data) => {
          'worklet';
          // Update swimmer velocity based on pan gesture
          if (!global._RNTGE_.ecs?.value) return;

          const swimmerEntities =
            global._RNTGE_.ecs.value.getEntitiesWithComponents(['Swimmer']);

          if (swimmerEntities.length === 0) return;

          // Use velocityX from gesture to control left/right movement
          const velocityX = data.gesture.data.velocityX * 0.5; // Scale down for smoother control

          swimmerEntities.forEach((entityId) => {
            global._RNTGE_.ecs.value.updateComponent(
              entityId,
              'Swimmer',
              (swimmer: any) => {
                swimmer.velocityX = velocityX;
              }
            );
          });
        },
        onPanEnd: (data) => {
          'worklet';
          // Gradually stop movement when pan ends
          if (!global._RNTGE_.ecs?.value) return;

          const swimmerEntities =
            global._RNTGE_.ecs.value.getEntitiesWithComponents(['Swimmer']);

          swimmerEntities.forEach((entityId) => {
            global._RNTGE_.ecs.value.updateComponent(
              entityId,
              'Swimmer',
              (swimmer: any) => {
                swimmer.velocityX = 0;
              }
            );
          });
        },
      }),
    ],
    [x, y, containerWidth, containerHeight, containerCenterX, containerCenterY]
  );

  const { entityId } = useAddEntity({ components });

  // Register the swimmer physics system
  useAddSystem({ system: SwimmerPhysicsSystem });

  return null;
};
