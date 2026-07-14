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
import { solidColumnCentersFromGaps } from '@/Game/path/obstacleRowGeometry';
import { flowNormFromPressVelocity } from '@/Game/hazards/flowFromPlatform';
import {
  aabbFromArmTransform,
  angularVelocityFromRpm,
  advancePivotAngle,
  buildArmTransformsForPivot,
  columnsBlockedByPivotAtY,
  effectiveGapsFromBlockedCols,
  hubAabbFromPivot,
  pivotHubWorldCenter,
} from '@/Game/hazards/pivotMotion';
import {
  maybeSpawnPivotArmBodies,
  removePivotArmEntities,
  syncPivotArmMatterBodies,
} from '@/Game/hazards/pivotArmSpawn';
import { buildPivotHazardRenderLayers } from '@/Game/render/buildPivotHazardRenderLayers';
import { SwimmerRenderLayer } from '@/Game/render/swimmerRenderLayers';
import { rowSpanOf } from '@/Game/grid/gridSpan';
import { platformShaftTuning } from '@/config/platformShaftTuning';
import type { WaterComponentData } from '@/Game/ecs-components/Water';

export type MergePivotLeadArgs = {
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
  containerCenterX: number;
  containerTop: number;
  containerBottom: number;
  waterSurfaceY: number;
  waterData: WaterComponentData;
  rowPitch: number;
  rowDurationSec: number;
  deltaSeconds: number;
  sceneKey: string;
  blockColsByEntity: Map<number, number[]>;
  effectiveGapsByEntity: Map<number, number[]>;
  slabAabbByEntity: Map<number, AABB>;
  memberEntityIds: number[];
};

export type MergePivotLeadResult = {
  maxPlatformFlow: number;
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

export const mergePivotHazardLead = (args: MergePivotLeadArgs): MergePivotLeadResult => {
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
    containerCenterX,
    containerTop,
    containerBottom,
    waterSurfaceY,
    deltaSeconds,
    sceneKey,
    blockColsByEntity,
    effectiveGapsByEntity,
    slabAabbByEntity,
    memberEntityIds,
  } = args;

  let maxPlatformFlow = 0;
  const pivotParams = leadData.pivotParams;
  if (!pivotParams) {
    return { maxPlatformFlow, culled: false };
  }

  const memberYs: number[] = [];
  for (let i = 0; i < liveMembers.length; i++) {
    const row = rowStore.get(liveMembers[i]);
    if (row) {
      memberYs.push(row.y);
    }
  }
  if (memberYs.length === 0) {
    return { maxPlatformFlow, culled: false };
  }

  const hub = pivotHubWorldCenter(
    memberYs,
    pivotParams.anchorMode,
    rowLength,
    leftX,
    columnWidth
  );

  if (hub.y > containerBottom + blockHeight * 3) {
    removePivotArmEntities({ ecs, components, leadData });
    return { maxPlatformFlow, culled: true };
  }

  maybeSpawnPivotArmBodies({
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

  // Real-time rotation from band spawn — not water-lock beat (telegraph = spin at top of screen).
  const omega = angularVelocityFromRpm(pivotParams.rpm, pivotParams.direction);
  const prevAngle = leadData.currentAngleRad ?? 0;
  const prevLocalSec = leadData.localSec ?? 0;
  const syncedAngle = advancePivotAngle(prevAngle, omega, deltaSeconds);
  const latchedLocalSec = prevLocalSec + deltaSeconds;

  syncPivotArmMatterBodies({
    ecs,
    components,
    leadData,
    pivotAngleRad: syncedAngle,
    leftX,
    columnWidth,
    blockHeight,
    memberRowYs: memberYs,
  });

  const armTransforms = buildArmTransformsForPivot(
    hub,
    syncedAngle,
    pivotParams,
    columnWidth,
    blockHeight
  );

  const blockedAtWater = columnsBlockedByPivotAtY(
    hub,
    armTransforms,
    waterSurfaceY,
    rowLength,
    leftX,
    columnWidth,
    blockHeight
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
  }

  for (let ai = 0; ai < armTransforms.length; ai++) {
    const aabb = aabbFromArmTransform(armTransforms[ai]);
    slabAabbByEntity.set(activeLeadEntity * 100 + ai, aabb);
    if (aabb.maxY >= waterSurfaceY - blockHeight * 0.5) {
      const rowSpan = rowSpanOf(leadData.bounds);
      const flowNorm = flowNormFromPressVelocity({
        pressVelocity: Math.abs(omega) * columnWidth,
        gapWidthCols: Math.max(2, rowLength - blockedAtWater.length),
        rowSpan,
        maxRowSpan: platformShaftTuning.FLOW_ROW_SPAN_NORM,
        pressDirection: 'right',
      });
      if (Math.abs(flowNorm) > Math.abs(maxPlatformFlow)) {
        maxPlatformFlow = flowNorm;
      }
    }
  }

  const renderStore = components[RenderComponentName] as
    | ComponentStore<RenderComponentData>
    | undefined;
  if (renderStore && rowIntersectsViewport(hub.y, blockHeight, containerTop, containerBottom)) {
    const pivotLayers = buildPivotHazardRenderLayers({
      hubX: hub.x,
      hubY: hub.y,
      columnWidth,
      armTransforms,
    });
    ecs.updateComponent<RenderComponentData>(activeLeadEntity, RenderComponentName, (render) => {
      render.position = { x: hub.x, y: hub.y };
      render.renderLayers = pivotLayers;
      render.renderLayer = SwimmerRenderLayer.Swimmer;
      render.isDirty = true;
    });
  }

  ecs.updateComponent<HazardBandLeadComponentData>(
    activeLeadEntity,
    HazardBandLeadComponentName,
    (lead) => {
      lead.memberRowEntityIds = liveMembers;
      lead.pressClockOpen = true;
      lead.localSec = latchedLocalSec;
      lead.currentAngleRad = syncedAngle;
      lead.phase01 = syncedAngle / (Math.PI * 2);
    }
  );

  return { maxPlatformFlow, culled: false };
};

export const pivotArmAabbsFromLead = (
  leadData: HazardBandLeadComponentData,
  memberRowYs: readonly number[],
  leftX: number,
  columnWidth: number,
  blockHeight: number,
  rowLength: number
): { aabb: AABB; velocityX: number; velocityY: number }[] => {
  'worklet';
  const pivotParams = leadData.pivotParams;
  if (!pivotParams) {
    return [];
  }
  const hub = pivotHubWorldCenter(
    memberRowYs,
    pivotParams.anchorMode,
    rowLength,
    leftX,
    columnWidth
  );
  const angle = leadData.currentAngleRad ?? 0;
  const omega = angularVelocityFromRpm(pivotParams.rpm, pivotParams.direction);
  const transforms = buildArmTransformsForPivot(
    hub,
    angle,
    pivotParams,
    columnWidth,
    blockHeight
  );
  const solids: { aabb: AABB; velocityX: number; velocityY: number }[] = [];
  solids.push({
    aabb: hubAabbFromPivot(hub, columnWidth, blockHeight),
    velocityX: 0,
    velocityY: 0,
  });
  for (let i = 0; i < transforms.length; i++) {
    const t = transforms[i];
    const aabb = aabbFromArmTransform(t);
    const vel = {
      vx: omega * (t.centerY - hub.y),
      vy: -omega * (t.centerX - hub.x),
    };
    solids.push({ aabb, velocityX: vel.vx, velocityY: vel.vy });
  }
  return solids;
};
