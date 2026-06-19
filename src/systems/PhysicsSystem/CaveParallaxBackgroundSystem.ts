import { System } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';
import { Entity } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/entity';
import {
  RenderComponentData,
  RenderComponentName,
  ShapeTypes,
  createRenderComponent,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import {
  CaveBackgroundSegmentComponentName,
  createCaveBackgroundSegmentComponent,
} from '@/Game/ecs-components/CaveBackgroundSegment';
import {
  WaterComponentName,
  WaterComponentData,
} from '@/Game/ecs-components/Water';
import {
  SwimmerComponentName,
  SwimmerComponentData,
} from '@/Game/ecs-components/Swimmer';
import {
  CreateEntityRequest,
  CreateEntityRequestType,
  RemoveEntityRequest,
  RemoveEntityRequestType,
} from '@/containers/ReactNativeSkiaGameEngine/internal/events/entity';

/**
 * CaveParallaxBackgroundSystem
 *
 * Manages a vertically repeating cave background that:
 * - Moves downward more slowly than the water/obstacles to create parallax
 * - Tiles seamlessly by attaching new segments to the top as older ones move off-screen
 * - Removes background segments that move well below the screen
 */
const PARALLAX_SPEED_FACTOR = 1; // Background moves at 35% of water speed
const REMOVAL_BUFFER = 100; // Extra pixels below screen before removing a segment

const segmentCenterY = (
  components: Record<string, { get: (entity: Entity) => unknown }>,
  entityId: Entity,
  fallbackY: number
): number => {
  'worklet';
  const renderData = components[RenderComponentName]?.get(entityId) as
    | RenderComponentData
    | undefined;
  return renderData?.position?.y ?? fallbackY;
};

const createCaveSegmentComponents = (
  centerX: number,
  centerY: number,
  screenWidth: number,
  screenHeight: number
) => {
  'worklet';
  return [
    createRenderComponent({
      shape: {
        type: ShapeTypes.Rectangle,
        width: screenWidth,
        height: screenHeight,
      },
      position: { x: centerX, y: centerY },
      image: 'cave_bg',
      visible: true,
      zIndex: 0,
    }),
    createCaveBackgroundSegmentComponent(),
  ];
};

export const CaveParallaxBackgroundSystem: System = {
  name: 'caveBackground',
  requiredComponents: [CaveBackgroundSegmentComponentName],
  process: ({ entities, components, deltaTime, ecs, eventQueue, dimensions }) => {
    'worklet';

    const { width: screenWidth, height: screenHeight } = dimensions.value;
    if (screenWidth <= 0 || screenHeight <= 0) {
      return;
    }

    const waterEntities = ecs.getEntitiesWithComponents([WaterComponentName]);

    if (waterEntities.length === 0) {
      return;
    }

    const waterEntity = waterEntities[0];
    const waterData = components[WaterComponentName]?.get(waterEntity) as
      | WaterComponentData
      | undefined;

    if (!waterData) {
      return;
    }

    const swimmerEntities = ecs.getEntitiesWithComponents([SwimmerComponentName]);

    const isInInitialPhase =
      swimmerEntities.length > 0 &&
      (
        components[SwimmerComponentName]?.get(swimmerEntities[0]) as
        | SwimmerComponentData
        | undefined
      )?.isInInitialPhase === true;

    const deltaSeconds = deltaTime / 1000;

    const caveBackgroundEntities = entities;

    if (caveBackgroundEntities.length === 0) {
      const centerX = screenWidth / 2;
      const baseCenterY = screenHeight / 2;
      const segmentCenters = [baseCenterY, baseCenterY - screenHeight];

      for (let i = 0; i < segmentCenters.length; i++) {
        const createRequest: CreateEntityRequest = {
          type: CreateEntityRequestType,
          payload: {
            components: createCaveSegmentComponents(
              centerX,
              segmentCenters[i],
              screenWidth,
              screenHeight
            ),
            sceneKey: 'game',
          },
        };
        eventQueue.addEvent(createRequest);
      }

      return;
    }

    if (!isInInitialPhase) {
      const parallaxSpeed = waterData.raisingSpeed * PARALLAX_SPEED_FACTOR;

      for (let i = 0; i < caveBackgroundEntities.length; i++) {
        const entityId = caveBackgroundEntities[i];
        const renderData = components[RenderComponentName]?.get(entityId) as
          | RenderComponentData
          | undefined;

        if (!renderData) {
          continue;
        }

        const currentY = renderData.position?.y ?? screenHeight / 2;
        const newY = currentY + parallaxSpeed * deltaSeconds;

        ecs.updateComponent<RenderComponentData>(
          entityId,
          RenderComponentName,
          (render) => {
            'worklet';
            if (!render.position) {
              render.position = { x: screenWidth / 2, y: newY };
            } else {
              render.position.y = newY;
            }
          }
        );
      }
    }

    const liveSegments = ecs.getEntitiesWithComponents([
      CaveBackgroundSegmentComponentName,
    ]);

    if (liveSegments.length === 0) {
      return;
    }

    const segments: { entityId: Entity; y: number }[] = [];
    for (let i = 0; i < liveSegments.length; i++) {
      const entityId = liveSegments[i];
      segments.push({
        entityId,
        y: segmentCenterY(components, entityId, screenHeight / 2),
      });
    }
    segments.sort((a, b) => a.y - b.y);

    const halfHeight = screenHeight / 2;

    for (let i = 0; i < segments.length; i++) {
      const { entityId, y } = segments[i];
      const top = y - halfHeight;
      if (top > screenHeight + REMOVAL_BUFFER) {
        const removeRequest: RemoveEntityRequest = {
          type: RemoveEntityRequestType,
          payload: {
            entityId,
          },
        };
        eventQueue.addEvent(removeRequest);
      }
    }

    const remainingSegments: { entityId: Entity; y: number }[] = [];
    for (let i = 0; i < liveSegments.length; i++) {
      const entityId = liveSegments[i];
      const y = segmentCenterY(components, entityId, screenHeight / 2);
      const top = y - halfHeight;
      if (top <= screenHeight + REMOVAL_BUFFER) {
        remainingSegments.push({ entityId, y });
      }
    }
    remainingSegments.sort((a, b) => a.y - b.y);

    if (remainingSegments.length === 0) {
      return;
    }

    const topMost = remainingSegments[0];
    const topMostTop = topMost.y - halfHeight;

    if (topMostTop > 0) {
      const centerX = screenWidth / 2;
      const newCenterY = topMost.y - screenHeight;

      const createRequest: CreateEntityRequest = {
        type: CreateEntityRequestType,
        payload: {
          components: createCaveSegmentComponents(
            centerX,
            newCenterY,
            screenWidth,
            screenHeight
          ),
          sceneKey: 'game',
        },
      };
      eventQueue.addEvent(createRequest);
    }
  },
};
