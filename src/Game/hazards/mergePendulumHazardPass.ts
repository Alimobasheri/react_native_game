import { ECS } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/ecs';
import type { ComponentStore } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/component';
import type { Entity } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/entity';
import type { AABB } from '@/Game/collision/swimmerBlockCollision';
import {
  RenderComponentData,
  RenderComponentName,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import {
  HazardBandLeadComponentData,
  HazardBandLeadComponentName,
} from '@/Game/ecs-components/HazardBandLead';
import {
  ObstacleRowComponentData,
  ObstacleRowComponentName,
} from '@/Game/ecs-components/ObstacleRowComponent';
import type { WaterComponentData } from '@/Game/ecs-components/Water';
import {
  aabbFromPendulumHeadWorld,
  buildPendulumHeadTransformFromParams,
  columnsBlockedByPendulumAtY,
  pendulumAnchorWorldCenter,
  pendulumAngleRad,
  pendulumHeadAabbFromMatterBody,
  pendulumHeadTransformToWorld,
  pendulumHeadVelocityAtPoint,
  pendulumHeadXNorm,
  pendulumTSecFromSpawn,
  pendulumTroughForce,
} from '@/Game/hazards/pendulumMotion';
import { effectiveGapsFromBlockedCols } from '@/Game/hazards/pivotMotion';
import {
  maybeSpawnPendulumHeadBody,
  removePendulumHeadEntities,
  syncPendulumHeadMatterBody,
} from '@/Game/hazards/pendulumHeadSpawn';
import { buildPendulumHazardRenderLayers } from '@/Game/render/buildPendulumHazardRenderLayers';
import { SwimmerRenderLayer } from '@/Game/render/swimmerRenderLayers';
import { MatterBodyComponentName } from '@/containers/ReactNativeSkiaGameEngine/internal/components/matterBody';

export type MergePendulumLeadArgs = {
  ecs: ECS;
  components: Record<string, ComponentStore<unknown>>;
  activeLeadEntity: Entity;
  leadData: HazardBandLeadComponentData;
  liveMembers: Entity[];
  rowStore: ComponentStore<ObstacleRowComponentData>;
  leftX: number;
  columnWidth: number;
  blockHeight: number;
  rowLength: number;
  containerLeftX: number;
  containerWidth: number;
  containerTop: number;
  containerBottom: number;
  waterSurfaceY: number;
  waterData: WaterComponentData;
  sceneKey: string;
  blockColsByEntity: Map<number, number[]>;
  effectiveGapsByEntity: Map<number, number[]>;
  slabAabbByEntity: Map<number, AABB>;
  memberEntityIds: number[];
};

export type MergePendulumLeadResult = {
  culled: boolean;
};

const rowIntersectsViewport = (
  rowY: number,
  blockHeight: number,
  containerTop: number,
  containerBottom: number
): boolean => {
  'worklet';
  const pad = blockHeight * 1.5;
  const rowTop = rowY - blockHeight / 2;
  const rowBottom = rowY + blockHeight / 2;
  return rowBottom >= containerTop - pad && rowTop <= containerBottom + pad;
};

export const mergePendulumHazardLead = (
  args: MergePendulumLeadArgs
): MergePendulumLeadResult => {
  'worklet';
  const {
    ecs,
    components,
    activeLeadEntity,
    leadData,
    liveMembers,
    rowStore,
    leftX,
    columnWidth,
    blockHeight,
    rowLength,
    containerLeftX,
    containerWidth,
    containerTop,
    containerBottom,
    waterSurfaceY,
    waterData,
    sceneKey,
    blockColsByEntity,
    effectiveGapsByEntity,
    slabAabbByEntity,
    memberEntityIds,
  } = args;

  const pendulumParams = leadData.pendulumParams;
  if (!pendulumParams) {
    return { culled: false };
  }

  const memberYs: number[] = [];
  for (let i = 0; i < liveMembers.length; i++) {
    const row = rowStore.get(liveMembers[i]);
    if (row) {
      memberYs.push(row.y);
    }
  }
  if (memberYs.length === 0) {
    return { culled: false };
  }

  let anchorRowY = memberYs[0];
  for (let i = 1; i < memberYs.length; i++) {
    if (memberYs[i] < anchorRowY) {
      anchorRowY = memberYs[i];
    }
  }

  if (anchorRowY > containerBottom + blockHeight * 4) {
    removePendulumHeadEntities({ ecs, components, leadData });
    return { culled: true };
  }

  maybeSpawnPendulumHeadBody({
    ecs,
    components,
    leadEntity: activeLeadEntity,
    leadData,
    rowStore,
    leftX,
    columnWidth,
    blockHeight,
    sceneKey,
  });

  const nowMs = performance.now();
  const tSec = pendulumTSecFromSpawn(nowMs, leadData.spawnTimeMs ?? 0);
  const angleRad = pendulumAngleRad(
    tSec,
    pendulumParams.maxAngleRads,
    pendulumParams.swingFrequencyHz,
    pendulumParams.phaseOffsetRads
  );

  syncPendulumHeadMatterBody({
    ecs,
    components,
    leadData,
    leftX,
    columnWidth,
    blockHeight,
    memberRowYs: memberYs,
    tSec,
  });

  const anchor = pendulumAnchorWorldCenter(
    anchorRowY,
    pendulumParams.anchorCol,
    leftX,
    columnWidth,
    blockHeight
  );
  const pivotX = anchor.x;
  const pivotY = anchor.y;

  const headTransform = buildPendulumHeadTransformFromParams(
    anchorRowY,
    pendulumParams.anchorCol,
    leftX,
    columnWidth,
    blockHeight,
    pendulumParams,
    tSec
  );

  let headAabb = aabbFromPendulumHeadWorld(
    pivotX,
    pivotY,
    headTransform
  );
  const headEntityId = leadData.pendulumHeadEntityId;
  if (headEntityId != null) {
    const matterBody = components[MatterBodyComponentName]?.get(
      headEntityId
    ) as Matter.Body | undefined;
    if (matterBody) {
      headAabb = pendulumHeadAabbFromMatterBody(matterBody);
    }
  }

  const blockedAtWater = columnsBlockedByPendulumAtY(
    pivotX,
    pivotY,
    headTransform,
    waterSurfaceY,
    rowLength,
    leftX,
    columnWidth
  );

  for (let ri = 0; ri < liveMembers.length; ri++) {
    const rowEntity = liveMembers[ri];
    const row = rowStore.get(rowEntity);
    if (!row) {
      continue;
    }
    if (memberEntityIds.indexOf(rowEntity) < 0) {
      memberEntityIds.push(rowEntity);
    }
    const effective = effectiveGapsFromBlockedCols(row.gaps, blockedAtWater);
    if (effective.length !== row.gaps.length) {
      effectiveGapsByEntity.set(rowEntity, effective);
    }
    if (blockedAtWater.length > 0) {
      blockColsByEntity.set(rowEntity, blockedAtWater.slice());
    }
    slabAabbByEntity.set(rowEntity, headAabb);
  }

  waterData.pendulumXNorm = pendulumHeadXNorm(
    pivotX + headTransform.centerX,
    containerLeftX,
    containerWidth
  );
  waterData.pendulumForce = pendulumTroughForce(
    angleRad,
    pendulumParams.maxAngleRads
  );

  const showTrail =
    Math.abs(angleRad) >= pendulumParams.maxAngleRads * 0.85;

  const renderStore = components[RenderComponentName] as
    | ComponentStore<RenderComponentData>
    | undefined;
  if (
    renderStore &&
    rowIntersectsViewport(anchorRowY, blockHeight, containerTop, containerBottom)
  ) {
    const pendulumLayers = buildPendulumHazardRenderLayers({
      headTransform,
      columnWidth,
      blockHeight,
      tetherSnapped: leadData.pendulumTetherSnapped,
      showTrail,
    });
    ecs.updateComponent<RenderComponentData>(
      activeLeadEntity,
      RenderComponentName,
      (render) => {
        render.position = { x: pivotX, y: pivotY };
        render.renderLayers = pendulumLayers;
        render.renderLayer = SwimmerRenderLayer.Swimmer;
        render.isDirty = true;
      }
    );
  }

  ecs.updateComponent<HazardBandLeadComponentData>(
    activeLeadEntity,
    HazardBandLeadComponentName,
    (lead) => {
      lead.memberRowEntityIds = liveMembers;
      lead.currentAngleRad = angleRad;
      lead.phase01 =
        (angleRad + pendulumParams.maxAngleRads) /
        (2 * pendulumParams.maxAngleRads);
    }
  );

  return { culled: false };
};

export const pendulumHeadSolidsFromLead = (
  leadData: HazardBandLeadComponentData,
  memberRowYs: readonly number[],
  leftX: number,
  columnWidth: number,
  blockHeight: number,
  rowLength: number,
  matterBody?: Matter.Body
): { aabb: AABB; velocityX: number; velocityY: number; strikeProfile?: string; impulseOverride?: number }[] => {
  'worklet';
  const pendulumParams = leadData.pendulumParams;
  if (!pendulumParams || memberRowYs.length === 0) {
    return [];
  }

  let anchorRowY = memberRowYs[0];
  for (let i = 1; i < memberRowYs.length; i++) {
    if (memberRowYs[i] < anchorRowY) {
      anchorRowY = memberRowYs[i];
    }
  }

  const tSec = pendulumTSecFromSpawn(performance.now(), leadData.spawnTimeMs ?? 0);
  const headTransform = buildPendulumHeadTransformFromParams(
    anchorRowY,
    pendulumParams.anchorCol,
    leftX,
    columnWidth,
    blockHeight,
    pendulumParams,
    tSec
  );

  const anchor = pendulumAnchorWorldCenter(
    anchorRowY,
    pendulumParams.anchorCol,
    leftX,
    columnWidth,
    blockHeight
  );

  let aabb = aabbFromPendulumHeadWorld(anchor.x, anchor.y, headTransform);
  if (matterBody) {
    aabb = pendulumHeadAabbFromMatterBody(matterBody);
  }

  const vel = pendulumHeadVelocityAtPoint(
    anchor.x,
    anchor.y,
    anchor.x + headTransform.centerX,
    anchor.y + headTransform.centerY,
    headTransform.swingAngleRad,
    pendulumParams.maxAngleRads,
    pendulumParams.swingFrequencyHz,
    pendulumParams.phaseOffsetRads,
    tSec
  );

  return [
    {
      aabb,
      velocityX: vel.vx,
      velocityY: vel.vy,
      strikeProfile: pendulumParams.strikeProfile,
    },
  ];
};
