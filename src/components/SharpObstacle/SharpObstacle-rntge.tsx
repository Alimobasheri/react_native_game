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
          type: ShapeTypes.Polygon,
          vertices: [
            { x: 0, y: obstacleHeight }, // Bottom left
            { x: obstacleWidth / 2, y: 0 }, // Top point (downward pointing)
            { x: obstacleWidth, y: obstacleHeight }, // Bottom right
          ],
        },
        position: { x, y }, // Set position in render component
        fillColor: '#d32f2f', // Red color for sharp obstacle
        visible: true,
        zIndex: 2,
      }),
    ],
    [x, y]
  );

  const { entityId } = useAddEntity({ components });

  return null;
};
