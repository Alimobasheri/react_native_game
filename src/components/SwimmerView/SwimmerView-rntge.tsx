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
import { LAYOUT_CONSTANTS } from '@/Layout';
import { FC, useMemo } from 'react';

const swimmerSize = 40;
const swimmerHeight = 60;

const centerColumn = Math.floor(LAYOUT_CONSTANTS.COLUMNS / 2);

function getColumnCenterXJS(
  column: number,
  containerCenterX: number,
  containerWidth: number
): number {
  const columnWidth = containerWidth / LAYOUT_CONSTANTS.COLUMNS;
  return containerCenterX - containerWidth / 2 + columnWidth * column + columnWidth / 2;
}

export const SwimmerView: FC<{
  x?: number;
  y: number;
  containerWidth: number;
  containerHeight: number;
  containerCenterX: number;
  containerCenterY: number;
  /** Grid column index (0..COLUMNS-1). If provided, x is ignored and set to column center. */
  initialColumn?: number;
  /** When true, swimmer moves by column (tap left/right); when false, by pan velocity. */
  useColumnControl?: boolean;
}> = ({
  x: xProp,
  y,
  containerWidth,
  containerHeight,
  containerCenterX,
  containerCenterY,
  initialColumn = centerColumn,
  useColumnControl = false,
}) => {
  const x = useMemo(() => {
    if (useColumnControl || initialColumn !== undefined) {
      return getColumnCenterXJS(initialColumn, containerCenterX, containerWidth);
    }
    return xProp ?? containerCenterX;
  }, [useColumnControl, initialColumn, containerCenterX, containerWidth, xProp]);

  const components = useMemo(() => {
    const base = [
      createSwimmerComponent({
        velocityX: 0,
        waterSurfaceY: y,
        containerWidth,
        containerCenterX,
        containerCenterY,
        isInInitialPhase: false,
        isCollidingWithObstacle: false,
        fallingVelocityY: 0,
        useColumnControl,
        column: initialColumn,
      }),
      createPositionComponent({ x, y }),
      createRenderComponent({
        shape: {
          type: ShapeTypes.Rectangle,
          width: swimmerSize,
          height: swimmerHeight,
        },
        position: { x, y },
        fillColor: '#4a90e2',
        visible: true,
        zIndex: 3,
      }),
    ];
    const panComponent = createPanComponent({
      onPanUpdate: (data) => {
        'worklet';
        const ecs = global._RNTGE_.ecs?.value;
        if (!ecs) return;
        const swimmerEntities = ecs.getEntitiesWithComponents(['Swimmer']);
        if (swimmerEntities.length === 0) return;
        const velocityX = data.gesture.data.velocityX * 0.5;
        swimmerEntities.forEach((entityId) => {
          ecs.updateComponent(entityId, 'Swimmer', (swimmer: any) => {
            swimmer.velocityX = velocityX;
          });
        });
      },
      onPanEnd: () => {
        'worklet';
        const ecs = global._RNTGE_.ecs?.value;
        if (!ecs) return;
        const swimmerEntities = ecs.getEntitiesWithComponents(['Swimmer']);
        swimmerEntities.forEach((entityId) => {
          ecs.updateComponent(entityId, 'Swimmer', (swimmer: any) => {
            swimmer.velocityX = 0;
          });
        });
      },
    });
    return useColumnControl ? base : [...base, panComponent];
  }, [
    x,
    y,
    containerWidth,
    containerCenterX,
    containerCenterY,
    useColumnControl,
    initialColumn,
  ]);

  const { entityId } = useAddEntity({ components });

  // Register the swimmer physics system
  useAddSystem({ system: SwimmerPhysicsSystem });

  return null;
};
