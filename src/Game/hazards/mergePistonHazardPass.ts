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
} from '@/Game/ecs-components/ObstacleRowComponent';
import {
  aabbFromPistonHead,
  buildPistonPose,
  pistonTSecFromSpawn,
  resolvePistonMountRowY,
  type PistonPose,
} from '@/Game/hazards/pistonMotion';
import { buildPistonHazardRenderLayers } from '@/Game/render/buildPistonHazardRenderLayers';
import { SwimmerRenderLayer } from '@/Game/render/swimmerRenderLayers';

export type MergePistonLeadArgs = {
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
  containerTop: number;
  containerBottom: number;
  rowDurationSec: number;
  memberEntityIds: number[];
};

export type MergePistonLeadResult = {
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

export const mergePistonHazardLead = (
  args: MergePistonLeadArgs
): MergePistonLeadResult => {
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
    containerTop,
    containerBottom,
    rowDurationSec,
    memberEntityIds,
  } = args;

  const pistonParams = leadData.pistonParams;
  if (!pistonParams) {
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

  const mountRowY = resolvePistonMountRowY(memberYs, pistonParams.mount);
  if (mountRowY > containerBottom + blockHeight * 4) {
    return { culled: true };
  }

  for (let ri = 0; ri < liveMembers.length; ri++) {
    const ent = liveMembers[ri];
    if (memberEntityIds.indexOf(ent) < 0) {
      memberEntityIds.push(ent);
    }
  }

  const nowMs = performance.now();
  const tSec = pistonTSecFromSpawn(nowMs, leadData.spawnTimeMs ?? 0);
  const pose = buildPistonPose({
    mountRowY,
    column: pistonParams.column,
    leftX,
    columnWidth,
    blockHeight,
    params: pistonParams,
    tSec,
    rowDurationSec,
  });

  // Head + track are NOT row solids: no effectivePressSlabAabb, no gap changes.
  // Contact is handled exclusively by pistonStrike (bounce), never pin/press.
  const renderStore = components[RenderComponentName] as
    | ComponentStore<RenderComponentData>
    | undefined;
  if (
    renderStore &&
    rowIntersectsViewport(mountRowY, blockHeight, containerTop, containerBottom)
  ) {
    // PS-TODO-006: spawn metallic click/ratchet SFX when band first enters viewport.
    // PS-TODO-007: telegraph warning tick + light haptic while telegraphPulse01 > 0.
    // PS-TODO-008: faint sliding friction loop while pose.extension01 is changing.
    const layers = buildPistonHazardRenderLayers({
      pose,
      columnWidth,
    });
    ecs.updateComponent<RenderComponentData>(
      activeLeadEntity,
      RenderComponentName,
      (render) => {
        render.position = { x: pose.headCenterX, y: pose.mountY };
        render.renderLayers = layers;
        // Machinery on obstacle layer — above water, with blocks (SH-011).
        render.renderLayer = SwimmerRenderLayer.Obstacles;
        render.isDirty = true;
      }
    );
  }

  ecs.updateComponent<HazardBandLeadComponentData>(
    activeLeadEntity,
    HazardBandLeadComponentName,
    (lead) => {
      lead.memberRowEntityIds = liveMembers;
      lead.phase01 = pose.extension01;
      // Shift curr → prev so swimmer swept collision sees last-frame AABB.
      const hadCurr =
        lead.pistonCurrHeadCenterX != null &&
        lead.pistonCurrHeadCenterY != null;
      lead.pistonPrevHeadCenterX = hadCurr
        ? lead.pistonCurrHeadCenterX
        : pose.headCenterX;
      lead.pistonPrevHeadCenterY = hadCurr
        ? lead.pistonCurrHeadCenterY
        : pose.headCenterY;
      lead.pistonCurrHeadCenterX = pose.headCenterX;
      lead.pistonCurrHeadCenterY = pose.headCenterY;
      lead.pistonMotionStarted = pose.motionStarted;
      lead.localSec = tSec;
    }
  );

  return { culled: false };
};

export type PistonHeadSolid = {
  aabb: AABB;
  prevAabb: AABB;
  velocityX: number;
  velocityY: number;
  leadEntityId: number;
  hazardId: string;
  safeExitSide: 'left' | 'right';
  headCenterX: number;
  headCenterY: number;
};

export const pistonHeadSolidFromLead = (
  leadEntityId: Entity,
  leadData: HazardBandLeadComponentData,
  memberYs: readonly number[],
  leftX: number,
  columnWidth: number,
  blockHeight: number,
  rowDurationSec: number
): PistonHeadSolid | null => {
  'worklet';
  const pistonParams = leadData.pistonParams;
  if (!pistonParams || memberYs.length === 0) {
    return null;
  }

  const mountRowY = resolvePistonMountRowY(memberYs, pistonParams.mount);
  const tSec = pistonTSecFromSpawn(performance.now(), leadData.spawnTimeMs ?? 0);
  const pose = buildPistonPose({
    mountRowY,
    column: pistonParams.column,
    leftX,
    columnWidth,
    blockHeight,
    params: pistonParams,
    tSec,
    rowDurationSec,
  });

  // Prefer stored prev/curr from merge pass (authoritative last-frame pair).
  const currCenterX =
    leadData.pistonCurrHeadCenterX ?? pose.headCenterX;
  const currCenterY =
    leadData.pistonCurrHeadCenterY ?? pose.headCenterY;
  const prevCenterX =
    leadData.pistonPrevHeadCenterX ?? currCenterX;
  const prevCenterY =
    leadData.pistonPrevHeadCenterY ?? currCenterY;
  const currAabb = aabbFromPistonHead(
    currCenterX,
    currCenterY,
    pose.widthPx,
    pose.heightPx
  );
  const prevAabb = aabbFromPistonHead(
    prevCenterX,
    prevCenterY,
    pose.widthPx,
    pose.heightPx
  );

  return {
    aabb: currAabb,
    prevAabb,
    velocityX: 0,
    velocityY: pose.velocityY,
    leadEntityId,
    hazardId: leadData.hazardId,
    safeExitSide: pistonParams.safeExitSide,
    headCenterX: currCenterX,
    headCenterY: currCenterY,
  };
};

export const buildPistonPoseForLead = (
  leadData: HazardBandLeadComponentData,
  memberYs: readonly number[],
  leftX: number,
  columnWidth: number,
  blockHeight: number,
  rowDurationSec: number
): PistonPose | null => {
  'worklet';
  const pistonParams = leadData.pistonParams;
  if (!pistonParams || memberYs.length === 0) {
    return null;
  }
  const mountRowY = resolvePistonMountRowY(memberYs, pistonParams.mount);
  const tSec = pistonTSecFromSpawn(performance.now(), leadData.spawnTimeMs ?? 0);
  return buildPistonPose({
    mountRowY,
    column: pistonParams.column,
    leftX,
    columnWidth,
    blockHeight,
    params: pistonParams,
    tSec,
    rowDurationSec,
  });
};
