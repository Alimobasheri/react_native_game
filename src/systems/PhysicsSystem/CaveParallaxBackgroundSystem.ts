import { System } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';
import { firstDataFromStore } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/query';
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
import { getGameSession, isStartReady, isGameOverPhase } from '@/Game/session/gameSessionQuery';
import { SwimmerRenderLayer } from '@/Game/render/swimmerRenderLayers';
import {
  SWIMMER_CAVE_BG_PARALLAX_FACTOR,
} from '@/assets/swimmerCaveBg';
import { CAVE_PARALLAX_TEXTURE_OPACITY } from '@/config/swimmerCaveLightingTuning';

const REMOVAL_BUFFER = 100;

const resolveCaveSegmentLayout = (
  screenWidth: number,
  screenHeight: number
) => {
  'worklet';
  // Full-screen tiles — edge-to-edge width (including under side-wall gutters).
  return {
    segmentWidth: screenWidth,
    segmentHeight: screenHeight,
  };
};

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

const segmentHalfHeight = (
  components: Record<string, { get: (entity: Entity) => unknown }>,
  entityId: Entity,
  fallback: number
): number => {
  'worklet';
  const renderData = components[RenderComponentName]?.get(entityId) as
    | RenderComponentData
    | undefined;
  const h =
    renderData?.shape?.type === ShapeTypes.Rectangle
      ? renderData.shape.height
      : undefined;
  return (h ?? fallback) / 2;
};

const createCaveSegmentComponents = (
  centerX: number,
  centerY: number,
  segmentWidth: number,
  segmentHeight: number
) => {
  'worklet';
  return [
    createRenderComponent({
      shape: {
        type: ShapeTypes.Rectangle,
        width: segmentWidth,
        height: segmentHeight,
      },
      position: { x: centerX, y: centerY },
      image: 'cave_bg',
      visible: true,
      opacity: CAVE_PARALLAX_TEXTURE_OPACITY,
      renderLayer: SwimmerRenderLayer.CaveParallax,
    }),
    createCaveBackgroundSegmentComponent(),
  ];
};

/**
 * CaveParallaxBackgroundSystem
 *
 * Vertically repeating far cave background (`cave-bg.webp`):
 * - Slow parallax vs gameplay (see SWIMMER_CAVE_BG_PARALLAX_FACTOR)
 * - Aspect-correct tiles, looped like side walls
 */
export const CaveParallaxBackgroundSystem: System = {
  name: 'caveBackground',
  requiredComponents: [CaveBackgroundSegmentComponentName],
  process: ({ entities, components, deltaTime, ecs, eventQueue, dimensions }) => {
    'worklet';

    const { width: screenWidth, height: screenHeight } = dimensions.value;
    if (screenWidth <= 0 || screenHeight <= 0) {
      return;
    }

    const waterData = firstDataFromStore(components[WaterComponentName]) as
      | WaterComponentData
      | undefined;

    if (!waterData) {
      return;
    }

    const { segmentWidth, segmentHeight } = resolveCaveSegmentLayout(
      screenWidth,
      screenHeight
    );

    const firstSwimmer = firstDataFromStore(components[SwimmerComponentName]) as
      | SwimmerComponentData
      | undefined;
    const isInInitialPhase = firstSwimmer?.isInInitialPhase === true;
    const session = getGameSession(components);
    const frozenForStart = isStartReady(session) || isGameOverPhase(session);

    const deltaSeconds = deltaTime / 1000;
    const caveBackgroundEntities = entities;

    if (caveBackgroundEntities.length === 0) {
      const centerX = screenWidth / 2;
      const baseCenterY = screenHeight / 2;
      const segmentCenters = [baseCenterY, baseCenterY - segmentHeight];

      for (let i = 0; i < segmentCenters.length; i++) {
        const createRequest: CreateEntityRequest = {
          type: CreateEntityRequestType,
          payload: {
            components: createCaveSegmentComponents(
              centerX,
              segmentCenters[i],
              segmentWidth,
              segmentHeight
            ),
            sceneKey: 'game',
          },
        };
        eventQueue.addEvent(createRequest);
      }

      return;
    }

    if (!isInInitialPhase && !frozenForStart) {
      const parallaxSpeed =
        waterData.raisingSpeed * SWIMMER_CAVE_BG_PARALLAX_FACTOR;

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

    const liveSegments = entities;

    if (liveSegments.length === 0) {
      return;
    }

    const segments: { entityId: Entity; y: number; halfH: number }[] = [];
    for (let i = 0; i < liveSegments.length; i++) {
      const entityId = liveSegments[i];
      segments.push({
        entityId,
        y: segmentCenterY(components, entityId, screenHeight / 2),
        halfH: segmentHalfHeight(components, entityId, segmentHeight),
      });
    }
    segments.sort((a, b) => a.y - b.y);

    for (let i = 0; i < segments.length; i++) {
      const { entityId, y, halfH } = segments[i];
      const top = y - halfH;
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

    const remainingSegments: { entityId: Entity; y: number; halfH: number }[] = [];
    for (let i = 0; i < liveSegments.length; i++) {
      const entityId = liveSegments[i];
      const y = segmentCenterY(components, entityId, screenHeight / 2);
      const halfH = segmentHalfHeight(components, entityId, segmentHeight);
      const top = y - halfH;
      if (top <= screenHeight + REMOVAL_BUFFER) {
        remainingSegments.push({ entityId, y, halfH });
      }
    }
    remainingSegments.sort((a, b) => a.y - b.y);

    if (remainingSegments.length === 0) {
      return;
    }

    const topMost = remainingSegments[0];
    const topMostTop = topMost.y - topMost.halfH;

    if (topMostTop > 0) {
      const centerX = screenWidth / 2;
      const newCenterY = topMost.y - segmentHeight;

      const createRequest: CreateEntityRequest = {
        type: CreateEntityRequestType,
        payload: {
          components: createCaveSegmentComponents(
            centerX,
            newCenterY,
            segmentWidth,
            segmentHeight
          ),
          sceneKey: 'game',
        },
      };
      eventQueue.addEvent(createRequest);
    }
  },
};
