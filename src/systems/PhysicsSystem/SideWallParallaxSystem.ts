import { System } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';
import { firstDataFromStore } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/query';
import { Entity } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/entity';
import {
  RenderComponentData,
  RenderComponentName,
  RenderLayerData,
  ShapeTypes,
  createRenderComponent,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import {
  SideWallSegmentComponentName,
  createSideWallSegmentComponent,
} from '@/Game/ecs-components/SideWallSegment';
import {
  ContainerComponentData,
  ContainerComponentName,
} from '@/Game/ecs-components/Container';
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
import { getGameSession, isStartReady } from '@/Game/session/gameSessionQuery';
import { SwimmerRenderLayer } from '@/Game/render/swimmerRenderLayers';
import { GAMEPLAY_CHANNEL_WIDTH_FRACTION } from '@/assets/swimmerUi';
import {
  SWIMMER_SIDE_WALL_LEFT_ASPECT,
  SWIMMER_SIDE_WALL_RIGHT_ASPECT,
} from '@/assets/swimmerSideWalls';
import { sideWallTuning } from '@/config/swimmerTuning';
import type { ImageShadowData } from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';

const REMOVAL_BUFFER = 100;

const sideWallImageShadow = (): ImageShadowData => {
  'worklet';
  return {
    dx: sideWallTuning.INNER_SHADOW_DX,
    dy: sideWallTuning.INNER_SHADOW_DY,
    blur: sideWallTuning.INNER_SHADOW_BLUR,
    color: sideWallTuning.INNER_SHADOW_COLOR,
    shadowOnly: true,
  };
};

type SideWallLayout = {
  containerWidth: number;
  marginWidth: number;
  containerOverlapPx: number;
  segmentHeight: number;
  leftWidth: number;
  leftHeight: number;
  rightWidth: number;
  rightHeight: number;
};

const resolveSideWallLayout = (
  screenWidth: number,
  containerWidth: number,
  containerOverlapPx: number
): SideWallLayout => {
  'worklet';
  const cw =
    containerWidth > 0
      ? containerWidth
      : screenWidth * GAMEPLAY_CHANNEL_WIDTH_FRACTION;
  const marginWidth = Math.max(0, (screenWidth - cw) / 2);
  const overlap = Math.max(0, containerOverlapPx);
  const wallWidth = marginWidth + overlap;
  const leftHeight = wallWidth / SWIMMER_SIDE_WALL_LEFT_ASPECT;
  const rightHeight = wallWidth / SWIMMER_SIDE_WALL_RIGHT_ASPECT;
  const segmentHeight = Math.max(leftHeight, rightHeight);

  return {
    containerWidth: cw,
    marginWidth,
    containerOverlapPx: overlap,
    segmentHeight,
    leftWidth: wallWidth,
    leftHeight,
    rightWidth: wallWidth,
    rightHeight,
  };
};

/** Stack aspect-correct tiles from the bottom until the viewport is covered. */
const initialSegmentCenters = (
  screenHeight: number,
  tileHeight: number
): number[] => {
  'worklet';
  const centers: number[] = [];
  let y = screenHeight - tileHeight * 0.5;
  while (y + tileHeight * 0.5 > -REMOVAL_BUFFER) {
    centers.push(y);
    y -= tileHeight;
  }
  if (centers.length === 1) {
    centers.push(centers[0] - tileHeight);
  }
  return centers;
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

const buildSideWallRenderLayers = (layout: SideWallLayout): RenderLayerData[] => {
  'worklet';
  const halfContainer = layout.containerWidth / 2;
  const halfWall = layout.leftWidth / 2;
  const bottomAlignY = (wallHeight: number) =>
    layout.segmentHeight / 2 - wallHeight / 2;

  // Outer edge stays on the screen bezel; inner edge overlaps the play channel.
  const leftCenterX = -halfContainer - layout.marginWidth + halfWall;
  const rightCenterX = halfContainer + layout.marginWidth - halfWall;

  return [
    {
      position: {
        x: leftCenterX,
        y: bottomAlignY(layout.leftHeight),
      },
      shape: {
        type: ShapeTypes.Rectangle,
        width: layout.leftWidth,
        height: layout.leftHeight,
      },
      image: 'side_wall_left',
      imageShadow: sideWallImageShadow(),
      visible: true,
    },
    {
      position: {
        x: rightCenterX,
        y: bottomAlignY(layout.rightHeight),
      },
      shape: {
        type: ShapeTypes.Rectangle,
        width: layout.rightWidth,
        height: layout.rightHeight,
      },
      image: 'side_wall_right',
      imageShadow: sideWallImageShadow(),
      visible: true,
    },
  ];
};

const createSideWallSegmentComponents = (
  centerX: number,
  centerY: number,
  screenWidth: number,
  layout: SideWallLayout
) => {
  'worklet';
  return [
    createRenderComponent({
      shape: {
        type: ShapeTypes.Rectangle,
        width: screenWidth,
        height: layout.segmentHeight,
      },
      position: { x: centerX, y: centerY },
      renderLayers: buildSideWallRenderLayers(layout),
      visible: true,
      renderLayer: SwimmerRenderLayer.SideWalls,
    }),
    createSideWallSegmentComponent(),
  ];
};

export type SideWallParallaxSystemParams = {
  /** Pixels each wall extends inward over blocks/water (0 = flush with channel edge). */
  containerOverlapPx?: number;
  parallaxSpeedFactor?: number;
};

export const createSideWallParallaxSystem = (
  params: SideWallParallaxSystemParams = {}
): System => {
  const containerOverlapPx =
    params.containerOverlapPx ?? sideWallTuning.CONTAINER_OVERLAP_PX;
  const parallaxSpeedFactor =
    params.parallaxSpeedFactor ?? sideWallTuning.PARALLAX_SPEED_FACTOR;

  return {
    name: 'sideWallParallax',
    requiredComponents: [SideWallSegmentComponentName],
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

      const containerData = firstDataFromStore(components[ContainerComponentName]) as
        | ContainerComponentData
        | undefined;
      const layout = resolveSideWallLayout(
        screenWidth,
        containerData?.width ?? 0,
        containerOverlapPx
      );

      const firstSwimmer = firstDataFromStore(components[SwimmerComponentName]) as
        | SwimmerComponentData
        | undefined;
      const isInInitialPhase = firstSwimmer?.isInInitialPhase === true;
      const session = getGameSession(components);
      const frozenForStart = isStartReady(session);

      const deltaSeconds = deltaTime / 1000;
      const sideWallEntities = entities;
      const tileHeight = layout.segmentHeight;

      if (sideWallEntities.length === 0) {
        const centerX = screenWidth / 2;
        const segmentCenters = initialSegmentCenters(screenHeight, tileHeight);

        for (let i = 0; i < segmentCenters.length; i++) {
          const createRequest: CreateEntityRequest = {
            type: CreateEntityRequestType,
            payload: {
              components: createSideWallSegmentComponents(
                centerX,
                segmentCenters[i],
                screenWidth,
                layout
              ),
              sceneKey: 'game',
            },
          };
          eventQueue.addEvent(createRequest);
        }

        return;
      }

      if (!isInInitialPhase && !frozenForStart) {
        const parallaxSpeed = waterData.raisingSpeed * parallaxSpeedFactor;

        for (let i = 0; i < sideWallEntities.length; i++) {
          const entityId = sideWallEntities[i];
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
              render.isDirty = true;
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
          halfH: segmentHalfHeight(components, entityId, tileHeight),
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
        const halfH = segmentHalfHeight(components, entityId, tileHeight);
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
        const newCenterY = topMost.y - tileHeight;

        const createRequest: CreateEntityRequest = {
          type: CreateEntityRequestType,
          payload: {
            components: createSideWallSegmentComponents(
              centerX,
              newCenterY,
              screenWidth,
              layout
            ),
            sceneKey: 'game',
          },
        };
        eventQueue.addEvent(createRequest);
      }
    },
  };
};

/** Default side-wall parallax system (uses `sideWallTuning`). */
export const SideWallParallaxSystem = createSideWallParallaxSystem();
