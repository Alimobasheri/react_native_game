import { ECS } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/ecs';
import type { ComponentStore } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/component';
import type { Entity } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/entity';
import { firstDataFromStore } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/query';
import {
  ContainerComponentData,
  ContainerComponentName,
} from '@/Game/ecs-components/Container';
import {
  createHazardBandLeadComponent,
  HazardBandLeadComponentData,
  HazardBandLeadComponentName,
} from '@/Game/ecs-components/HazardBandLead';
import {
  HazardBandMemberComponentName,
} from '@/Game/ecs-components/HazardBandMember';
import {
  ObstacleRowComponentData,
  ObstacleRowComponentName,
} from '@/Game/ecs-components/ObstacleRowComponent';
import {
  WaterComponentData,
  WaterComponentName,
} from '@/Game/ecs-components/Water';
import type { EventQueueContextType } from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs/useEventQueue/useEventQueue';
import type { AABB } from '@/Game/collision/swimmerBlockCollision';
import { getObstacleRowPitch } from '@/assets/swimmerBlocks';
import { rowEntityBeatIndexFromRow } from '@/Game/grid/hazardBandRowBeat';
import { hazardLocalSecFromBeatRow, resolveAnimStartRow } from '@/Game/grid/hazardPhase';
import { resolvePlatformSlabOccupancy, unionBlockedCols } from '@/Game/grid/resolveOccupancy';
import { rowSpanOf } from '@/Game/grid/gridSpan';
import {
  hazardBandCouplesToWaterLock,
  latchedWorldBeat,
  resolveSegmentWaterLockRow,
  worldBeatFromWaterLock,
} from '@/Game/grid/worldBeatFromWaterLock';
import { waterTransitionBandFromSurface } from '@/Game/grid/waterTransitionBand';
import { flowNormFromPressVelocity } from '@/Game/hazards/flowFromPlatform';
import { gapColsClosedByPressForCollision, pressExtentAtLocalSec, simPlatformPress } from '@/Game/hazards/platformPressMotion';
import { solidColumnCentersFromGaps } from '@/Game/path/obstacleRowGeometry';
import { minGapWidthCols } from '@/Game/path/platformShaft/primitives';
import type { PlatformSlabHazard } from '@/Game/path/platformShaft/types';
import { getObstacleWidth, LAYOUT_CONSTANTS } from '@/Layout';
import { gridSpanToWorld, slabAabbFromWorldRect } from '@/Game/grid/gridSpanToWorld';
import { getGameSession, isGameOverPhase, isStartReady } from '@/Game/session/gameSessionQuery';
import { platformShaftTuning } from '@/config/platformShaftTuning';
import { appendHazardSteelToRowRender, restoreOrangeOnlyHazardRowRender } from '@/Game/render/appendHazardSteelToRowRender';
import {
  RenderComponentData,
  RenderComponentName,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';

const gapsDiffer = (base: readonly number[], effective: readonly number[]): boolean => {
  'worklet';
  if (base.length !== effective.length) {
    return true;
  }
  for (let i = 0; i < base.length; i++) {
    if (base[i] !== effective[i]) {
      return true;
    }
  }
  return false;
};

export type MergeRowHazardPassArgs = {
  ecs: ECS;
  components: Record<string, ComponentStore<unknown>>;
  deltaTime: number;
  eventQueue: EventQueueContextType;
};

const leadAsPlatformSlab = (lead: HazardBandLeadComponentData): PlatformSlabHazard => {
  'worklet';
  return {
    id: lead.hazardId,
    kind: 'hazard_platform',
    side: lead.side,
    bounds: {
      rowStart: lead.bounds.rowStart,
      rowEnd: lead.bounds.rowEnd,
      colStart: lead.bounds.colStart,
      colEnd: lead.bounds.colEnd,
    },
    params: lead.params,
  };
};

const gapsMinusBlocked = (baseGaps: readonly number[], blockCols: number[]): number[] => {
  'worklet';
  const effectiveGaps: number[] = [];
  for (let g = 0; g < baseGaps.length; g++) {
    const col = baseGaps[g];
    let blocked = false;
    for (let b = 0; b < blockCols.length; b++) {
      if (blockCols[b] === col) {
        blocked = true;
        break;
      }
    }
    if (!blocked) {
      effectiveGaps.push(col);
    }
  }
  effectiveGaps.sort((a, b) => a - b);
  return effectiveGaps;
};

const mergeBlockColsForEntity = (
  blockColsByEntity: Map<number, number[]>,
  entity: Entity,
  cols: number[]
): void => {
  'worklet';
  const existing = blockColsByEntity.get(entity) ?? [];
  blockColsByEntity.set(entity, unionBlockedCols(existing, cols));
};

const rowIntersectsViewport = (
  rowY: number,
  blockHeight: number,
  containerTop: number,
  containerBottom: number
): boolean => {
  'worklet';
  const rowTop = rowY - blockHeight / 2;
  const rowBottom = rowY + blockHeight / 2;
  return rowBottom >= containerTop && rowTop <= containerBottom;
};

const restoreSteelOnEntity = (
  ecs: ECS,
  renderStore: ComponentStore<RenderComponentData>,
  rowStore: ComponentStore<ObstacleRowComponentData>,
  entity: Entity
): void => {
  'worklet';
  const renderData = renderStore.get(entity);
  const row = rowStore.get(entity);
  if (!renderData || !row) {
    return;
  }
  const restored = restoreOrangeOnlyHazardRowRender({
    existingLayers: renderData.renderLayers ?? [],
    rowY: row.y,
  });
  ecs.updateComponent<RenderComponentData>(entity, RenderComponentName, (render) => {
    render.renderLayers = restored.renderLayers;
    render.position = { ...render.position, y: restored.positionY };
    render.isDirty = true;
  });
};

const healLiveMemberIds = (
  memberIds: readonly Entity[],
  rowStore: ComponentStore<ObstacleRowComponentData>
): Entity[] => {
  'worklet';
  const live: Entity[] = [];
  for (let i = 0; i < memberIds.length; i++) {
    const ent = memberIds[i];
    if (rowStore.get(ent)) {
      live.push(ent);
    }
  }
  return live;
};

const stripHazardBandFromLead = (
  ecs: ECS,
  components: Record<string, ComponentStore<unknown>>,
  leadEntity: Entity,
  memberIds: readonly Entity[],
  rowStore: ComponentStore<ObstacleRowComponentData>
): void => {
  'worklet';
  const renderStore = components[RenderComponentName] as
    | ComponentStore<RenderComponentData>
    | undefined;
  if (renderStore) {
    for (let i = 0; i < memberIds.length; i++) {
      const ent = memberIds[i];
      restoreSteelOnEntity(ecs, renderStore, rowStore, ent);
    }
  }
  ecs.removeComponent(leadEntity, HazardBandLeadComponentName);
  for (let i = 0; i < memberIds.length; i++) {
    const ent = memberIds[i];
    if (ecs.components[HazardBandMemberComponentName]?.get(ent)) {
      ecs.removeComponent(ent, HazardBandMemberComponentName);
    }
  }
};

export const mergeRowHazardPass = (args: MergeRowHazardPassArgs): void => {
  'worklet';
  const { ecs, components, deltaTime } = args;

  const leadStore = components[HazardBandLeadComponentName] as
    | ComponentStore<HazardBandLeadComponentData>
    | undefined;
  const rowStore = components[ObstacleRowComponentName] as
    | ComponentStore<ObstacleRowComponentData>
    | undefined;
  if (!leadStore || !rowStore) {
    return;
  }

  const leadEntities = ecs.getEntitiesWithComponents([HazardBandLeadComponentName]);
  if (leadEntities.length === 0) {
    return;
  }

  const containerData = firstDataFromStore<ContainerComponentData>(
    components[ContainerComponentName] as ComponentStore<ContainerComponentData>
  );
  const waterData = firstDataFromStore<WaterComponentData>(
    components[WaterComponentName] as ComponentStore<WaterComponentData>
  );
  if (!containerData || !waterData) {
    return;
  }

  const session = getGameSession(components);
  if (isStartReady(session) || isGameOverPhase(session)) {
    return;
  }

  const columnWidth = getObstacleWidth(containerData.width);
  const blockHeight = columnWidth;
  const rowPitch = getObstacleRowPitch(blockHeight);
  const rowLength = LAYOUT_CONSTANTS.COLUMNS;
  const leftX = containerData.centerX - containerData.width / 2;
  const columnGridWidth = columnWidth * rowLength;
  const containerCenterX = leftX + columnGridWidth * 0.5;
  const raisingSpeed = waterData.raisingSpeed ?? 0;
  const rowDurationSec = raisingSpeed > 0 ? blockHeight / raisingSpeed : 0.1;
  const waterSurfaceY = containerData.waterSurfaceY;
  const transitionBand = waterTransitionBandFromSurface(waterSurfaceY, blockHeight);
  const containerTop = containerData.centerY - containerData.height / 2;
  const containerBottom = containerData.centerY + containerData.height / 2;
  const deltaSeconds = deltaTime / 1000;

  const blockColsByEntity = new Map<number, number[]>();
  const effectiveGapsByEntity = new Map<number, number[]>();
  const slabAabbByEntity = new Map<number, AABB>();
  const memberEntityIds: number[] = [];
  let maxPlatformFlow = 0;

  for (let li = 0; li < leadEntities.length; li++) {
    let activeLeadEntity = leadEntities[li];
    let leadData = leadStore.get(activeLeadEntity);
    if (!leadData) {
      continue;
    }

    let liveMembers = healLiveMemberIds(leadData.memberRowEntityIds, rowStore);
    if (liveMembers.length === 0) {
      stripHazardBandFromLead(ecs, components, activeLeadEntity, leadData.memberRowEntityIds, rowStore);
      continue;
    }

    if (!rowStore.get(activeLeadEntity) && liveMembers.length > 0) {
      const newLeadEntity = liveMembers[liveMembers.length - 1];
      if (!leadStore.get(newLeadEntity)) {
        ecs.addComponent(
          newLeadEntity,
          createHazardBandLeadComponent({
            modifierId: leadData.modifierId,
            hazardId: leadData.hazardId,
            side: leadData.side,
            bounds: leadData.bounds,
            params: leadData.params,
            memberRowEntityIds: liveMembers,
            shaftSegmentEpoch: leadData.shaftSegmentEpoch,
          })
        );
        ecs.updateComponent<HazardBandLeadComponentData>(
          newLeadEntity,
          HazardBandLeadComponentName,
          (lead) => {
            lead.phase01 = leadData.phase01;
            lead.maxWorldBeat = leadData.maxWorldBeat;
            lead.localSec = leadData.localSec;
            lead.prevPressExtent = leadData.prevPressExtent;
            lead.lastSteelRenderEntity = leadData.lastSteelRenderEntity;
          }
        );
      }
      activeLeadEntity = newLeadEntity;
      leadData = leadStore.get(activeLeadEntity)!;
      liveMembers = healLiveMemberIds(leadData.memberRowEntityIds, rowStore);
    }

    for (let ri = 0; ri < liveMembers.length; ri++) {
      const ent = liveMembers[ri];
      if (memberEntityIds.indexOf(ent) < 0) {
        memberEntityIds.push(ent);
      }
    }

    const hazard = leadAsPlatformSlab(leadData);
    const lockRow = resolveSegmentWaterLockRow({
      rowStore,
      centerRowEntity: waterData.centerRowEntity,
      shaftSegmentEpoch: leadData.shaftSegmentEpoch,
      waterSurfaceY,
      blockHeight,
    });
    let bandBeat = -1;
    if (lockRow) {
      bandBeat = worldBeatFromWaterLock(
        lockRow.beatRowIndex,
        lockRow.y,
        rowPitch,
        transitionBand,
        blockHeight
      );
    }
    const latchedBeat = latchedWorldBeat(leadData.maxWorldBeat ?? -1, bandBeat);
    const animStartRow = resolveAnimStartRow(hazard);
    const pressClockOpen =
      (leadData.pressClockOpen ?? false) ||
      (latchedBeat >= animStartRow && Number.isFinite(animStartRow));
    const beatLocalSec = pressClockOpen
      ? hazardLocalSecFromBeatRow(hazard, latchedBeat, rowDurationSec)
      : 0;
    // Never rewind phase — completed presses stay extended (row handoff jitter / lock flips).
    const latchedLocalSec = Math.max(leadData.localSec ?? 0, beatLocalSec);
    const latchedPressExtent = pressExtentAtLocalSec(hazard, latchedLocalSec).pressExtent;
    const prevPressExtent = leadData.prevPressExtent ?? 0;
    const pressVelocity =
      deltaSeconds > 0 ? (latchedPressExtent - prevPressExtent) / deltaSeconds : 0;
    const latchedPhase01 = pressExtentAtLocalSec(hazard, latchedLocalSec).pressT;

    for (let ri = 0; ri < liveMembers.length; ri++) {
      const rowEntity = liveMembers[ri];
      const row = rowStore.get(rowEntity);
      if (!row) {
        continue;
      }
      const beatIdx = rowEntityBeatIndexFromRow(row);
      if (beatIdx == null) {
        continue;
      }

      const occ = resolvePlatformSlabOccupancy({
        baseGaps: row.gaps,
        hazard,
        beatRow: beatIdx,
        localSec: latchedLocalSec,
        columns: rowLength,
      });
      const rowSim =
        occ ??
        simPlatformPress(hazard, rowLength, latchedLocalSec, beatIdx);
      if (rowSim) {
        if (occ) {
          effectiveGapsByEntity.set(rowEntity, occ.effectiveGaps);
        }
        const closedGapCols = gapColsClosedByPressForCollision(row.gaps, rowSim);
        if (closedGapCols.length > 0) {
          mergeBlockColsForEntity(blockColsByEntity, rowEntity, closedGapCols);
        }
        const worldRect = gridSpanToWorld({
          slabStart: rowSim.slabStart,
          slabEnd: rowSim.slabEnd,
          rowYs: [row.y],
          leftX,
          columnWidth,
          blockHeight,
          rowPitch,
          columns: rowLength,
        });
        slabAabbByEntity.set(rowEntity, slabAabbFromWorldRect(worldRect));
      }
    }

    const rowSpan = rowSpanOf(leadData.bounds);
    let restGaps: number[] = [];
    for (let ri = 0; ri < liveMembers.length; ri++) {
      const row = rowStore.get(liveMembers[ri]);
      if (row && row.beatRowIndex === leadData.bounds.rowStart) {
        restGaps = row.gaps;
        break;
      }
    }
    const drawSim = simPlatformPress(
      hazard,
      rowLength,
      latchedLocalSec,
      leadData.bounds.rowStart
    );
    const couplesToWater = hazardBandCouplesToWaterLock({
      waterLockRow: lockRow,
      memberRowEntityIds: liveMembers,
      transitionBand,
      blockHeight,
    });
    if (couplesToWater && restGaps.length > 0 && drawSim) {
      if (drawSim.pressExtent > 0.001) {
        const effective = gapsMinusBlocked(restGaps, drawSim.blockCols);
        const gapW = minGapWidthCols(effective);
        const pressDir =
          hazard.params.pressDirection ?? (hazard.side === 'left' ? 'right' : 'left');
        const flowNorm = flowNormFromPressVelocity({
          pressVelocity,
          gapWidthCols: Math.max(1, gapW),
          rowSpan,
          maxRowSpan: platformShaftTuning.FLOW_ROW_SPAN_NORM,
          pressDirection: pressDir,
        });
        if (Math.abs(flowNorm) > Math.abs(maxPlatformFlow)) {
          maxPlatformFlow = flowNorm;
        }
      }
    }

    const renderStore = components[RenderComponentName] as
      | ComponentStore<RenderComponentData>
      | undefined;
    if (renderStore) {
      for (let ri = 0; ri < liveMembers.length; ri++) {
        const rowEntity = liveMembers[ri];
        const memberRow = rowStore.get(rowEntity);
        if (!memberRow) {
          continue;
        }
        const beatIdx = memberRow.beatRowIndex;
        if (beatIdx == null) {
          continue;
        }
        const rowSim = simPlatformPress(
          hazard,
          rowLength,
          latchedLocalSec,
          beatIdx
        );
        const renderData = renderStore.get(rowEntity);
        if (!renderData || !rowSim) {
          continue;
        }
        const visible = rowIntersectsViewport(
          memberRow.y,
          blockHeight,
          containerTop,
          containerBottom
        );
        if (!visible) {
          restoreSteelOnEntity(ecs, renderStore, rowStore, rowEntity);
          continue;
        }
        const worldRect = gridSpanToWorld({
          slabStart: rowSim.slabStart,
          slabEnd: rowSim.slabEnd,
          rowYs: [memberRow.y],
          leftX,
          columnWidth,
          blockHeight,
          rowPitch,
          columns: rowLength,
        });
        const appended = appendHazardSteelToRowRender({
          existingLayers: renderData.renderLayers ?? [],
          worldRect,
          leadRowY: memberRow.y,
        });
        ecs.updateComponent<RenderComponentData>(rowEntity, RenderComponentName, (render) => {
          render.position = { x: containerCenterX, y: appended.positionY };
          render.renderLayers = appended.renderLayers;
          render.isDirty = true;
        });
      }
    }

    ecs.updateComponent<HazardBandLeadComponentData>(
      activeLeadEntity,
      HazardBandLeadComponentName,
      (lead) => {
        lead.memberRowEntityIds = liveMembers;
        lead.maxWorldBeat = latchedBeat;
        lead.pressClockOpen = pressClockOpen;
        lead.phase01 = Math.max(lead.phase01 ?? 0, latchedPhase01);
        lead.localSec = latchedLocalSec;
        lead.prevPressExtent = latchedPressExtent;
      }
    );
  }

  rowStore.forEach((rowEntity, rowData) => {
    const isMember = memberEntityIds.indexOf(rowEntity) >= 0;
    const blockCols = blockColsByEntity.get(rowEntity) ?? [];
    const occGaps = effectiveGapsByEntity.get(rowEntity);
    const narrowedGaps =
      occGaps && gapsDiffer(rowData.gaps, occGaps) ? occGaps.slice() : undefined;

    if (!isMember || (blockCols.length === 0 && !narrowedGaps && !slabAabbByEntity.has(rowEntity))) {
      if (rowData.effectiveGaps || rowData.effectiveSolidColumnCentersX || rowData.effectivePressSlabAabb) {
        ecs.updateComponent<ObstacleRowComponentData>(rowEntity, ObstacleRowComponentName, (row) => {
          row.effectiveGaps = undefined;
          row.effectiveSolidColumnCentersX = undefined;
          row.effectivePressSlabAabb = undefined;
        });
      }
      return;
    }

    const effectiveGaps = narrowedGaps;
    const effectiveSolidColumnCentersX =
      effectiveGaps != null
        ? solidColumnCentersFromGaps(
          effectiveGaps,
          rowLength,
          containerCenterX,
          columnGridWidth
        )
        : undefined;
    const effectivePressSlabAabb = slabAabbByEntity.get(rowEntity);
    ecs.updateComponent<ObstacleRowComponentData>(rowEntity, ObstacleRowComponentName, (row) => {
      row.effectiveGaps = effectiveGaps;
      row.effectiveSolidColumnCentersX = effectiveSolidColumnCentersX;
      row.effectivePressSlabAabb = effectivePressSlabAabb;
    });
  });

  const waterStore = components[WaterComponentName] as ComponentStore<WaterComponentData>;
  if (waterStore) {
    waterStore.forEach((waterEntity) => {
      ecs.updateComponent<WaterComponentData>(waterEntity, WaterComponentName, (water) => {
        if (Math.abs(maxPlatformFlow) > 0.01) {
          water.platformFlowPerRange = [maxPlatformFlow, 0, 0, 0];
        } else {
          water.platformFlowPerRange = [0, 0, 0, 0];
        }
      });
    });
  }
};
