import {
  firstEntityFromStore,
} from '@/containers/ReactNativeSkiaGameEngine/services-ecs/query';
import type { SystemProcessArgs } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';
import {
  ContainerComponentName,
  type ContainerComponentData,
} from '@/Game/ecs-components/Container';
import {
  WaterComponentName,
  type WaterComponentData,
} from '@/Game/ecs-components/Water';
import { ObstacleRowComponentName } from '@/Game/ecs-components/ObstacleRowComponent';
import { SwimmerComponentName } from '@/Game/ecs-components/Swimmer';
import {
  RenderComponentName,
  type RenderComponentData,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { getObstacleWidth, getWaterSurfaceRestY } from '@/Layout';
import {
  getObstacleBlockDimensions,
  getObstacleBlockHeight,
} from '@/assets/swimmerBlocks';
import {
  getGameSession,
  isGameOverPhase,
  isStartReady,
} from '@/Game/session/gameSessionQuery';
import { buildProfileFromContainerGeometry } from '@/Game/water/buildWaterSurfaceProfileParams';
import type { SwimmerFrameContext } from '@/Game/swimmerPhysics/types';

/**
 * One shared read of container, water, and session — every swimmer reuses this snapshot.
 *
 * @see docs/game-design/swimmer-physics-flow.md#per-frame-pipeline
 */
export const buildSwimmerFrameContext = (
  ctx: SystemProcessArgs
): SwimmerFrameContext | null => {
  'worklet';

  const containerEntity = firstEntityFromStore(ctx.components[ContainerComponentName]);
  if (containerEntity === undefined) {
    return null;
  }

  const container = ctx.components[ContainerComponentName].get(containerEntity) as
    | ContainerComponentData
    | undefined;
  if (!container) {
    return null;
  }

  const waterEntity = firstEntityFromStore(ctx.components[WaterComponentName]);
  if (waterEntity === undefined) {
    return null;
  }

  const water = ctx.components[WaterComponentName].get(waterEntity) as
    | WaterComponentData
    | undefined;
  if (!water) {
    return null;
  }

  const session = getGameSession(ctx.components);
  if (isGameOverPhase(session)) {
    return null;
  }

  const waterRender = ctx.components[RenderComponentName]?.get(waterEntity) as
    | RenderComponentData
    | undefined;
  const shaderUniforms = (waterRender?.shader?.uniforms ?? {}) as Record<string, unknown>;

  const containerTop = container.centerY - container.height / 2;
  const containerBottom = container.centerY + container.height / 2;
  const waterLevelNorm = Math.max(
    0,
    Math.min(
      1,
      1 - (container.waterSurfaceY - containerTop) / Math.max(0.0001, container.height)
    )
  );

  let isInInitialPhase = true;
  if (ctx.entities.length > 0) {
    const firstSwimmer = ctx.components[SwimmerComponentName].get(ctx.entities[0]);
    if (firstSwimmer) {
      isInInitialPhase = firstSwimmer.isInInitialPhase;
    }
  }

  const blockDimensions = getObstacleBlockDimensions(container.width);
  const blockHeight = getObstacleBlockHeight(container.width);

  return {
    ecs: ctx.ecs,
    components: ctx.components,
    deltaSeconds: ctx.deltaTime / 1000,
    startReady: isStartReady(session),
    session,
    containerEntity,
    container,
    containerTop,
    containerBottom,
    waterEntity,
    water,
    waterSurfaceRestY: getWaterSurfaceRestY(container.centerY, container.height),
    waterLevelNorm,
    profileBase: buildProfileFromContainerGeometry(water, container, shaderUniforms),
    obstacleWidth: getObstacleWidth(container.width),
    blockDimensions,
    blockHeight,
    rowHeight: blockHeight,
    obstacleRowStore: ctx.components[ObstacleRowComponentName],
    entities: ctx.entities,
    isInInitialPhase,
  };
};
