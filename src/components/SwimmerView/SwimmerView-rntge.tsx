import { useAddEntity } from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs/useAddEntity/useAddEntity';
import { useAddMatterBody } from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs/useAddMatterBody/useAddMatterBody';
import {
  createRenderComponent,
  ShapeTypes,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { createPanComponent } from '@/containers/ReactNativeSkiaGameEngine/internal/components/touch';
import { createSwimmerComponent } from '@/Game/ecs-components/Swimmer';
import { useAddSystem } from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs/useAddSystem/useAddSystem';
import { SwimmerPhysicsSystem } from '@/systems/PhysicsSystem/SwimmerPhysicsSystem';
import { LAYOUT_CONSTANTS, getObstacleWidth, getRows } from '@/Layout';
import { CreateMatterBodyArgs } from '@/containers/ReactNativeSkiaGameEngine/internal/systems/physics/bodiesTypes';
import { SwimmerComponentName } from '@/Game/ecs-components/Swimmer';
import { FC, useMemo } from 'react';

const centerColumn = Math.floor(LAYOUT_CONSTANTS.COLUMNS / 2);

function getColumnCenterXJS(
  column: number,
  containerCenterX: number,
  containerWidth: number
): number {
  const columnWidth = containerWidth / LAYOUT_CONSTANTS.COLUMNS;
  return (
    containerCenterX -
    containerWidth / 2 +
    columnWidth * column +
    columnWidth / 2
  );
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
  /** When true, disables dispatching any game-over events (storybook/debug use). */
  disableGameOver?: boolean;
}> = ({
  x: xProp,
  y,
  containerWidth,
  containerHeight,
  containerCenterX,
  containerCenterY,
  initialColumn = centerColumn,
  useColumnControl = false,
  disableGameOver = false,
}) => {
  const x = useMemo(() => {
    if (useColumnControl || initialColumn !== undefined) {
      return getColumnCenterXJS(
        initialColumn,
        containerCenterX,
        containerWidth
      );
    }
    return xProp ?? containerCenterX;
  }, [
    useColumnControl,
    initialColumn,
    containerCenterX,
    containerWidth,
    xProp,
  ]);

  const { swimmerWidth, swimmerHeight } = useMemo(() => {
    const columnWidth = containerWidth / LAYOUT_CONSTANTS.COLUMNS;
    const width = (1 / 2) * columnWidth;

    const obstacleWidth = getObstacleWidth(containerWidth);
    const rawRows = getRows(containerHeight, obstacleWidth);
    const rows = rawRows > 0 ? rawRows : 1;
    const rowHeight = containerHeight / rows;

    const height = Math.min(1.8 * width, 1.5 * rowHeight * 0.9);

    return { swimmerWidth: width, swimmerHeight: height };
  }, [containerWidth, containerHeight]);

  const components = useMemo(() => {
    const base = [
      createSwimmerComponent({
        velocityX: 0,
        inputX: 0,
        lastTapTimeMs: undefined,
        lastTapDirection: undefined,
        rapidTapStreak: 0,
        pendingTapMultiplier: 1,
        waterSurfaceY: y,
        containerWidth,
        containerCenterX,
        containerCenterY,
        isInInitialPhase: false,
        isCollidingWithObstacle: false,
        fallingVelocityY: 0,
        useColumnControl,
        column: initialColumn,
        angle: 0,
        gameOverDispatched: false,
        disableGameOver,
      }),
      createRenderComponent({
        shape: {
          type: ShapeTypes.Rectangle,
          width: swimmerWidth,
          height: swimmerHeight,
        },
        fillColor: '#006f06',
        visible: true,
        zIndex: 1,
      }),
    ];
    const panComponent = createPanComponent({
      onPanUpdate: (data) => {
        'worklet';
        const ecs = data.systemArgs.ecs;
        const swimmerEntities = ecs.getEntitiesWithComponents([
          SwimmerComponentName,
        ]);
        if (swimmerEntities.length === 0) return;
        const velocityX = data.gesture.data.velocityX * 0.5;
        swimmerEntities.forEach((entityId) => {
          ecs.updateComponent(
            entityId,
            SwimmerComponentName,
            (swimmer: any) => {
              swimmer.velocityX = velocityX;
            }
          );
        });
      },
      onPanEnd: (data) => {
        'worklet';
        const ecs = data.systemArgs.ecs;
        const swimmerEntities = ecs.getEntitiesWithComponents([
          SwimmerComponentName,
        ]);
        swimmerEntities.forEach((entityId) => {
          ecs.updateComponent(
            entityId,
            SwimmerComponentName,
            (swimmer: any) => {
              swimmer.velocityX = 0;
            }
          );
        });
      },
    });
    return useColumnControl ? base : [...base, panComponent];
  }, [
    x,
    y,
    containerWidth,
    containerHeight,
    containerCenterX,
    containerCenterY,
    useColumnControl,
    initialColumn,
    disableGameOver,
    swimmerWidth,
    swimmerHeight,
  ]);

  const { entityId } = useAddEntity({ components });

  const matterBodyArgs: CreateMatterBodyArgs = useMemo(
    () => ({
      type: 'rectangle',
      options: {
        x,
        y,
        width: swimmerWidth,
        height: swimmerHeight,
        options: {
          isStatic: false,
          inertia: Infinity, // prevent rotation for arcade feel
          restitution: 0,
          friction: 0,
          frictionStatic: 0,
          frictionAir: 0.4,
          collisionFilter: {
            group: 0x0000,
            category: 0x0004, // swimmer
            mask: 0x0002 | 0x0008, // container boundaries + obstacles
          },
        },
      },
    }),
    [x, y, swimmerWidth, swimmerHeight]
  );

  useAddMatterBody({ args: matterBodyArgs, entityId });

  // Register the swimmer physics system
  useAddSystem({ system: SwimmerPhysicsSystem });

  return null;
};
