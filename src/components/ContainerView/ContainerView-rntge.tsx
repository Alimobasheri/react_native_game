import { useAddEntity } from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs/useAddEntity/useAddEntity';
import { useAddMatterBody } from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs/useAddMatterBody/useAddMatterBody';
import {
  createRenderComponent,
  ShapeTypes,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { createContainerComponent } from '@/Game/ecs-components/Container';
import { CreateMatterBodyArgs } from '@/containers/ReactNativeSkiaGameEngine/internal/systems/physics/bodiesTypes';
import { FC, useMemo, useEffect } from 'react';

export const ContainerView: FC<{
  x: number;
  y: number;
  width: number;
  height: number;
  initialWaterSurfaceY: number;
  waterRiseSpeed?: number;
  onEntityCreated?: (id: number | null) => void;
}> = ({
  x,
  y,
  width,
  height,
  initialWaterSurfaceY,
  waterRiseSpeed = 20,
  onEntityCreated,
}) => {
  const components = useMemo(
    () => [
      createContainerComponent({
        centerX: x,
        centerY: y,
        width: width,
        height: height,
        waterSurfaceY: initialWaterSurfaceY,
        waterRiseSpeed: waterRiseSpeed,
      }),
      createRenderComponent({
        shape: {
          type: ShapeTypes.Rectangle,
          width: width,
          height: height,
        },
        position: { x, y }, // Center of rectangle
        fillColor: 'rgba(255, 255, 255, 0.1)', // Very transparent rectangle in center
        visible: true,
        zIndex: 1,
      }),
    ],
    [x, y, width, height, initialWaterSurfaceY, waterRiseSpeed]
  );

  const { entityId } = useAddEntity({ components });

  // Left boundary - separate entity with render and physics
  const leftBoundaryComponents = useMemo(
    () => [
      createRenderComponent({
        shape: {
          type: ShapeTypes.Rectangle,
          width: 10,
          height: height,
        },
        position: { x: x - width / 2 - 5, y: y },
        fillColor: 'transparent', // Light blue color
        visible: true,
        zIndex: 1,
      }),
    ],
    [x, y, width, height]
  );

  const { entityId: leftBoundaryEntityId } = useAddEntity({
    components: leftBoundaryComponents,
  });

  const leftBoundaryArgs: CreateMatterBodyArgs = useMemo(
    () => ({
      type: 'rectangle',
      options: {
        x: x - width / 2 - 5, // Position left of center rectangle with small offset
        y: y,
        width: 10, // Small width for boundary
        height: height,
        options: {
          isStatic: true, // Static boundary
          collisionFilter: {
            group: 0x0001, // Container boundary group
            category: 0x0002,
            mask: 0x0004 | 0x0008, // Collide with swimmer and obstacles
          },
        },
      },
    }),
    [x, y, width, height]
  );

  useAddMatterBody({
    args: leftBoundaryArgs,
    entityId: leftBoundaryEntityId,
  });

  // Right boundary - separate entity with render and physics
  const rightBoundaryComponents = useMemo(
    () => [
      createRenderComponent({
        shape: {
          type: ShapeTypes.Rectangle,
          width: 10,
          height: height,
        },
        position: { x: x + width / 2 + 5, y: y },
        fillColor: 'transparent', // Light blue color
        visible: true,
        zIndex: 1,
      }),
    ],
    [x, y, width, height]
  );

  const { entityId: rightBoundaryEntityId } = useAddEntity({
    components: rightBoundaryComponents,
  });

  const rightBoundaryArgs: CreateMatterBodyArgs = useMemo(
    () => ({
      type: 'rectangle',
      options: {
        x: x + width / 2 + 5, // Position right of center rectangle with small offset
        y: y,
        width: 10, // Small width for boundary
        height: height,
        options: {
          isStatic: true, // Static boundary
          collisionFilter: {
            group: 0x0001, // Container boundary group
            category: 0x0002,
            mask: 0x0004 | 0x0008, // Collide with swimmer and obstacles
          },
        },
      },
    }),
    [x, y, width, height]
  );

  useAddMatterBody({
    args: rightBoundaryArgs,
    entityId: rightBoundaryEntityId,
  });

  // Note: Bottom boundary intentionally omitted so entities can exit the screen.

  useEffect(() => {
    if (onEntityCreated && entityId !== null && entityId !== undefined) {
      onEntityCreated(entityId);
    }
  }, [entityId, onEntityCreated]);

  // Note: Top boundary is intentionally omitted to create open-top container

  return null;
};
