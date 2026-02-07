import { useAddEntity } from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs/useAddEntity/useAddEntity';
import {
  createRenderComponent,
  ShapeTypes,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { createPositionComponent } from '@/containers/ReactNativeSkiaGameEngine/internal/components/position';
import {
  createObstacleComponent,
  ObstacleTypes,
} from '@/Game/ecs-components/ObstacleComponent';
import { FC, useMemo } from 'react';

const obstacleWidth = 30;
const obstacleHeight = 40;

export const SharpObstacle: FC<{ x: number; y: number }> = ({ x, y }) => {
  const components = useMemo(
    () => [
      createObstacleComponent({
        type: ObstacleTypes.Stone,
        width: obstacleWidth,
        height: obstacleHeight,
        initialPosition: { x, y },
      }),
      createPositionComponent({ x, y }),
      createRenderComponent({
        shape: {
          type: ShapeTypes.Rectangle, // Square obstacle instead of triangle
          width: obstacleWidth,
          height: obstacleHeight,
        },
        position: { x, y }, // Set position in render component
        fillColor: '#d32f2f', // Red color for obstacle
        visible: true,
        zIndex: 2,
      }),
    ],
    [x, y]
  );

  const { entityId } = useAddEntity({ components });

  return null;
};
