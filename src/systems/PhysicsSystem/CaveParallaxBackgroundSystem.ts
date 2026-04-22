import { System } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';
import {
  RenderComponentData,
  RenderComponentName,
  ShapeTypes,
  createRenderComponent,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
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

export const CaveParallaxBackgroundSystem: System = {
  // We manually query for background entities by image name
  name: 'caveBackground',
  requiredComponents: [],
  process: ({ components, deltaTime, ecs, eventQueue, dimensions }) => {
    'worklet';

    const { width: screenWidth, height: screenHeight } = dimensions.value;
    if (screenWidth <= 0 || screenHeight <= 0) {
      return;
    }

    // Get water entity and data for speed reference
    const waterEntities = ecs.getEntitiesWithComponents([
      WaterComponentName,
    ]);

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

    // Determine if we're in the swimmer's initial phase so we stay in sync
    const swimmerEntities = ecs.getEntitiesWithComponents([
      SwimmerComponentName,
    ]);

    const isInInitialPhase =
      swimmerEntities.length > 0 &&
      (
        components[SwimmerComponentName]?.get(swimmerEntities[0]) as
        | SwimmerComponentData
        | undefined
      )?.isInInitialPhase === true;

    const deltaSeconds = deltaTime / 1000;

    // Find all background render entities using the cave background image
    const renderEntities = ecs.getEntitiesWithComponents([
      RenderComponentName,
    ]);

    const caveBackgroundEntities = renderEntities.filter((entityId) => {
      const renderData = components[RenderComponentName]?.get(entityId) as
        | RenderComponentData
        | undefined;
      return renderData?.image === 'cave_bg';
    });

    // Seed initial background segments if none exist
    if (caveBackgroundEntities.length === 0) {
      // Two stacked full-screen segments:
      // - one centered on screen
      // - one directly above it for seamless vertical tiling
      const centerX = screenWidth / 2;
      const baseCenterY = screenHeight / 2;

      const segments = [baseCenterY, baseCenterY - screenHeight];

      segments.forEach((centerY) => {
        const renderComponent = createRenderComponent({
          shape: {
            type: ShapeTypes.Rectangle,
            width: screenWidth,
            height: screenHeight,
          },
          position: { x: centerX, y: centerY },
          image: 'cave_bg',
          visible: true,
          zIndex: 0,
        });

        const createRequest: CreateEntityRequest = {
          type: CreateEntityRequestType,
          payload: {
            components: [renderComponent],
            sceneKey: 'game',
          },
        };
        eventQueue.addEvent(createRequest);
      });

      return;
    }

    // Move segments only after initial phase, to stay in sync with obstacles
    if (!isInInitialPhase) {
      const parallaxSpeed = waterData.raisingSpeed * PARALLAX_SPEED_FACTOR;

      caveBackgroundEntities.forEach((entityId) => {
        const renderData = components[RenderComponentName]?.get(entityId) as
          | RenderComponentData
          | undefined;

        if (!renderData) {
          return;
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
      });
    }

    // After movement, manage tiling (attach new segments on top) and removal
    const updatedEntities = ecs
      .getEntitiesWithComponents([RenderComponentName])
      .filter((entityId) => {
        const renderData = components[RenderComponentName]?.get(entityId) as
          | RenderComponentData
          | undefined;
        return renderData?.image === 'cave_bg';
      });

    if (updatedEntities.length === 0) {
      return;
    }

    // Collect current segment centers
    const segments = updatedEntities
      .map((entityId) => {
        const renderData = components[RenderComponentName]?.get(entityId) as
          | RenderComponentData
          | undefined;
        const y = renderData?.position?.y ?? screenHeight / 2;
        return { entityId, y };
      })
      .sort((a, b) => a.y - b.y); // top (smallest y) first

    const halfHeight = screenHeight / 2;

    // Remove segments that are well below the screen
    segments.forEach(({ entityId, y }) => {
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
    });

    // Ensure we always have coverage from top of screen upwards by adding
    // new segments attached to the top-most segment when needed.
    const remainingSegments = ecs
      .getEntitiesWithComponents([RenderComponentName])
      .filter((entityId) => {
        const renderData = components[RenderComponentName]?.get(entityId) as
          | RenderComponentData
          | undefined;
        return renderData?.image === 'cave_bg';
      })
      .map((entityId) => {
        const renderData = components[RenderComponentName]?.get(entityId) as
          | RenderComponentData
          | undefined;
        const y = renderData?.position?.y ?? screenHeight / 2;
        return { entityId, y };
      })
      .sort((a, b) => a.y - b.y);

    if (remainingSegments.length === 0) {
      return;
    }

    const topMost = remainingSegments[0];
    const topMostTop = topMost.y - halfHeight;

    // If the top-most segment's top edge is below the top of the screen,
    // attach a new segment directly above it.
    if (topMostTop > 0) {
      const centerX = screenWidth / 2;
      const newCenterY = topMost.y - screenHeight;

      const renderComponent = createRenderComponent({
        shape: {
          type: ShapeTypes.Rectangle,
          width: screenWidth,
          height: screenHeight,
        },
        position: { x: centerX, y: newCenterY },
        image: 'cave_bg',
        visible: true,
        zIndex: 0,
      });

      const createRequest: CreateEntityRequest = {
        type: CreateEntityRequestType,
        payload: {
          components: [renderComponent],
          sceneKey: 'game',
        },
      };
      eventQueue.addEvent(createRequest);
    }
  },
};
