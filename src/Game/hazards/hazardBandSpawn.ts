import { ECS } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/ecs';
import type { ComponentStore } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/component';
import type { Entity } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/entity';
import {
  ObstacleRowComponentData,
  ObstacleRowComponentName,
} from '@/Game/ecs-components/ObstacleRowComponent';
import {
  createHazardBandLeadComponent,
  HazardBandLeadComponentData,
  HazardBandLeadComponentName,
} from '@/Game/ecs-components/HazardBandLead';
import {
  createHazardBandMemberComponent,
  HazardBandMemberComponentName,
} from '@/Game/ecs-components/HazardBandMember';
import type { PlatformShaftTemplateCtx } from '@/Game/path/platformShaft/platformShaftRowPathTemplate';
import type {
  PendulumHazard,
  PistonHazard,
  PlatformShaftHazard,
  PlatformSlabHazard,
  PivotHazard,
} from '@/Game/path/platformShaft/types';
import {
  growHazardBandMemberIds,
  resolveRowEntitiesForBeatRange,
} from '@/Game/grid/gridAnchor';
import { gridSpanFromHazard } from '@/Game/grid/gridSpan';

export type HazardSpawnFromBeatArgs = {
  ecs: ECS;
  sceneEntity: Entity;
  ctx: PlatformShaftTemplateCtx;
  rowIndex: number;
  rowEntity: Entity;
  rowData: ObstacleRowComponentData;
  leftX: number;
  rowLength: number;
  obstacleDimension: { width: number; height: number };
};

const findLeadEntityForHazard = (
  ecs: ECS,
  hazardId: string,
  shaftSegmentEpoch?: number
): Entity | undefined => {
  'worklet';
  const leadStore = ecs.components[HazardBandLeadComponentName] as
    | ComponentStore<HazardBandLeadComponentData>
    | undefined;
  if (!leadStore) {
    return undefined;
  }
  const leadEntities = ecs.getEntitiesWithComponents([HazardBandLeadComponentName]);
  for (let i = 0; i < leadEntities.length; i++) {
    const entity = leadEntities[i];
    const data = leadStore.get(entity);
    if (data?.hazardId !== hazardId) {
      continue;
    }
    if (
      shaftSegmentEpoch != null &&
      data.shaftSegmentEpoch != null &&
      data.shaftSegmentEpoch !== shaftSegmentEpoch
    ) {
      continue;
    }
    return entity;
  }
  return undefined;
};

const syncHazardBandMembers = (
  ecs: ECS,
  leadEntity: Entity,
  modifierId: string,
  rowEntityIds: Entity[]
): void => {
  'worklet';
  const memberStore = ecs.components[HazardBandMemberComponentName];
  if (!memberStore) {
    return;
  }
  for (let i = 0; i < rowEntityIds.length; i++) {
    const ent = rowEntityIds[i];
    if (ent === leadEntity) {
      continue;
    }
    if (!memberStore.get(ent)) {
      ecs.addComponent(ent, createHazardBandMemberComponent(modifierId, leadEntity));
    }
  }
};

const growOrCreateBand = (
  ecs: ECS,
  hazard: PlatformShaftHazard,
  rowStore: ComponentStore<ObstacleRowComponentData>,
  spawned: string[],
  shaftSegmentEpoch: number | undefined,
  createLead: (leadEntity: Entity, rowEntityIds: Entity[]) => void
): boolean => {
  'worklet';
  const span = gridSpanFromHazard(hazard);
  const existingLead = findLeadEntityForHazard(ecs, hazard.id, shaftSegmentEpoch);
  if (existingLead != null) {
    const leadData = (
      ecs.components[HazardBandLeadComponentName] as
      | ComponentStore<HazardBandLeadComponentData>
      | undefined
    )?.get(existingLead);
    const rowEntityIds = growHazardBandMemberIds(
      leadData?.memberRowEntityIds ?? [],
      rowStore,
      span.rowStart,
      span.rowEnd,
      shaftSegmentEpoch ?? leadData?.shaftSegmentEpoch
    );
    if (rowEntityIds.length === 0) {
      return false;
    }
    ecs.updateComponent<HazardBandLeadComponentData>(
      existingLead,
      HazardBandLeadComponentName,
      (lead) => {
        lead.memberRowEntityIds = rowEntityIds;
        if (shaftSegmentEpoch != null) {
          lead.shaftSegmentEpoch = shaftSegmentEpoch;
        }
      }
    );
    syncHazardBandMembers(ecs, existingLead, hazard.id, rowEntityIds);
    return true;
  }

  const rowEntityIds = resolveRowEntitiesForBeatRange(
    rowStore,
    span.rowStart,
    span.rowEnd,
    { shaftSegmentEpoch }
  );
  if (rowEntityIds.length === 0) {
    return false;
  }

  if (spawned.includes(hazard.id)) {
    if (findLeadEntityForHazard(ecs, hazard.id, shaftSegmentEpoch) != null) {
      return false;
    }
    const staleIdx = spawned.indexOf(hazard.id);
    if (staleIdx >= 0) {
      spawned.splice(staleIdx, 1);
    }
  }

  const leadEntity = rowEntityIds[rowEntityIds.length - 1];
  createLead(leadEntity, rowEntityIds);
  syncHazardBandMembers(ecs, leadEntity, hazard.id, rowEntityIds);
  spawned.push(hazard.id);
  return true;
};

const trySpawnOrGrowPlatformSlabBand = (
  ecs: ECS,
  hazard: PlatformSlabHazard,
  rowStore: ComponentStore<ObstacleRowComponentData>,
  spawned: string[],
  shaftSegmentEpoch?: number
): boolean => {
  'worklet';
  return growOrCreateBand(ecs, hazard, rowStore, spawned, shaftSegmentEpoch, (leadEntity, rowEntityIds) => {
    ecs.addComponent(
      leadEntity,
      createHazardBandLeadComponent({
        modifierId: hazard.id,
        hazardId: hazard.id,
        side: hazard.side,
        bounds: gridSpanFromHazard(hazard),
        params: hazard.params,
        memberRowEntityIds: rowEntityIds,
        shaftSegmentEpoch,
      })
    );
  });
};

const trySpawnOrGrowPivotBand = (
  ecs: ECS,
  hazard: PivotHazard,
  rowStore: ComponentStore<ObstacleRowComponentData>,
  spawned: string[],
  shaftSegmentEpoch?: number
): boolean => {
  'worklet';
  return growOrCreateBand(ecs, hazard, rowStore, spawned, shaftSegmentEpoch, (leadEntity, rowEntityIds) => {
    ecs.addComponent(
      leadEntity,
      createHazardBandLeadComponent({
        kind: 'pivot',
        modifierId: hazard.id,
        hazardId: hazard.id,
        bounds: gridSpanFromHazard(hazard),
        pivotParams: hazard.params,
        memberRowEntityIds: rowEntityIds,
        shaftSegmentEpoch,
      })
    );
  });
};

const trySpawnOrGrowPendulumBand = (
  ecs: ECS,
  hazard: PendulumHazard,
  rowStore: ComponentStore<ObstacleRowComponentData>,
  spawned: string[],
  shaftSegmentEpoch?: number
): boolean => {
  'worklet';
  return growOrCreateBand(ecs, hazard, rowStore, spawned, shaftSegmentEpoch, (leadEntity, rowEntityIds) => {
    ecs.addComponent(
      leadEntity,
      createHazardBandLeadComponent({
        kind: 'pendulum',
        modifierId: hazard.id,
        hazardId: hazard.id,
        bounds: gridSpanFromHazard(hazard),
        pendulumParams: hazard.params,
        memberRowEntityIds: rowEntityIds,
        shaftSegmentEpoch,
        spawnTimeMs: performance.now(),
      })
    );
  });
};

const trySpawnOrGrowPistonBand = (
  ecs: ECS,
  hazard: PistonHazard,
  rowStore: ComponentStore<ObstacleRowComponentData>,
  spawned: string[],
  shaftSegmentEpoch?: number
): boolean => {
  'worklet';
  return growOrCreateBand(ecs, hazard, rowStore, spawned, shaftSegmentEpoch, (leadEntity, rowEntityIds) => {
    ecs.addComponent(
      leadEntity,
      createHazardBandLeadComponent({
        kind: 'piston',
        modifierId: hazard.id,
        hazardId: hazard.id,
        bounds: gridSpanFromHazard(hazard),
        pistonParams: hazard.params,
        memberRowEntityIds: rowEntityIds,
        shaftSegmentEpoch,
        spawnTimeMs: performance.now(),
      })
    );
  });
};

const trySpawnOrGrowHazardBand = (
  ecs: ECS,
  hazard: PlatformShaftHazard,
  rowStore: ComponentStore<ObstacleRowComponentData>,
  spawned: string[],
  shaftSegmentEpoch?: number
): boolean => {
  'worklet';
  if (hazard.kind === 'hazard_pivot') {
    return trySpawnOrGrowPivotBand(ecs, hazard, rowStore, spawned, shaftSegmentEpoch);
  }
  if (hazard.kind === 'hazard_pendulum') {
    return trySpawnOrGrowPendulumBand(ecs, hazard, rowStore, spawned, shaftSegmentEpoch);
  }
  if (hazard.kind === 'hazard_piston') {
    return trySpawnOrGrowPistonBand(ecs, hazard, rowStore, spawned, shaftSegmentEpoch);
  }
  return trySpawnOrGrowPlatformSlabBand(ecs, hazard, rowStore, spawned, shaftSegmentEpoch);
};

export const maybeSpawnHazardBandsForRow = (args: HazardSpawnFromBeatArgs): void => {
  'worklet';
  const { ecs, ctx, rowIndex } = args;
  const beat = ctx.beat;
  if (!beat?.hazards?.length) {
    return;
  }
  if (!ctx.spawnedHazardIds) {
    ctx.spawnedHazardIds = [];
  }
  const spawned = ctx.spawnedHazardIds;
  const shaftSegmentEpoch = ctx.shaftSegmentEpoch;
  const rowStore = ecs.components[ObstacleRowComponentName];
  if (!rowStore) {
    return;
  }

  for (let i = 0; i < beat.hazards.length; i++) {
    const hazard = beat.hazards[i];
    if (rowIndex < hazard.bounds.rowStart || rowIndex > hazard.bounds.rowEnd) {
      continue;
    }
    trySpawnOrGrowHazardBand(ecs, hazard, rowStore, spawned, shaftSegmentEpoch);
  }

  for (let i = 0; i < beat.hazards.length; i++) {
    const hazard = beat.hazards[i];
    if (hazard.bounds.rowEnd > rowIndex) {
      continue;
    }
    trySpawnOrGrowHazardBand(ecs, hazard, rowStore, spawned, shaftSegmentEpoch);
  }
};

export const countHazardBandLeads = (ecs: ECS): number => {
  'worklet';
  return ecs.getEntitiesWithComponents([HazardBandLeadComponentName]).length;
};

export const countHazardBandMembers = (ecs: ECS): number => {
  'worklet';
  return ecs.getEntitiesWithComponents([HazardBandMemberComponentName]).length;
};
