import type { ECS } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/ecs';
import type { ComponentStore } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/component';
import { firstDataFromStore } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/query';
import {
  ContainerComponentName,
  type ContainerComponentData,
} from '@/Game/ecs-components/Container';
import {
  HazardBandLeadComponentName,
  type HazardBandLeadComponentData,
} from '@/Game/ecs-components/HazardBandLead';
import {
  HazardBandMemberComponentName,
} from '@/Game/ecs-components/HazardBandMember';
import {
  ObstacleRowComponentName,
  type ObstacleRowComponentData,
} from '@/Game/ecs-components/ObstacleRowComponent';
import {
  ObstaclesManagerComponentName,
  type ObstaclesManagerComponentData,
} from '@/Game/ecs-components/ObstaclesManager';
import {
  SwimmerComponentName,
  type SwimmerComponentData,
} from '@/Game/ecs-components/Swimmer';
import {
  WaterComponentName,
  type WaterComponentData,
} from '@/Game/ecs-components/Water';
import { getGameSession } from '@/Game/session/gameSessionQuery';
import { getObstacleWidth, LAYOUT_CONSTANTS } from '@/Layout';
import {
  resolveRowEntityForBeat,
  rowEntityMatchesBandBeat,
} from '@/Game/grid/gridAnchor';

export const platformShaftVanishDiagTuning = {
  ENABLED: typeof __DEV__ !== 'undefined' && __DEV__,
  SHOW_BUTTON: true,
} as const;

type CompactRow = {
  entity: number;
  y: number;
  beatRowIndex?: number;
  shaftSegmentEpoch?: number;
  prevRowEntity: number | null;
  gaps: number[];
  effectiveGaps?: number[];
  hasPressAabb: boolean;
  pressAabb?: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  visible: boolean;
};

type CompactBandMember = {
  entity: number;
  exists: boolean;
  beatRowIndex?: number;
  shaftSegmentEpoch?: number;
  y?: number;
  inBounds: boolean;
  epochMatches: boolean;
  visible: boolean;
  effectiveGaps?: number[];
  hasPressAabb: boolean;
};

type CompactBand = {
  leadEntity: number;
  hazardId: string;
  side: string;
  bounds: HazardBandLeadComponentData['bounds'];
  shaftSegmentEpoch?: number;
  memberRowEntityIds: number[];
  expectedMemberEntityIds: number[];
  staleMemberIds: number[];
  missingBeatRows: number[];
  leadRowExists: boolean;
  leadRowBeat?: number;
  nearWaterBeat: boolean;
  localSec: number;
  maxWorldBeat: number;
  prevPressExtent: number;
  pressClockOpen: boolean;
  members: CompactBandMember[];
};

export type PlatformShaftVanishDiagDump = {
  tag: 'PLATFORM_SHAFT_VANISH_DIAG';
  exportedAtMs: number;
  sessionPhase?: string;
  manager?: {
    totalRowsGenerated?: number;
    lockedTemplateName?: string;
    storyLockedShaftRecipe?: string;
    storyLockedShaftSeed?: number;
    storyLockedShaftDifficulty?: number;
    storyLockShaftLoop?: boolean;
    templateInfo?: ObstaclesManagerComponentData['templateInfo'];
  };
  container?: {
    centerY: number;
    height: number;
    waterSurfaceY: number;
    top: number;
    bottom: number;
    blockHeight: number;
  };
  water?: {
    raisingSpeed: number;
    baseSpeed: number;
    centerRowEntity?: number;
    lastCenterRowEntity?: number;
    releaseRestZoneActive?: boolean;
    platformFlowPerRange?: [number, number, number, number];
  };
  swimmer?: {
    x: number;
    y: number;
    velocityX: number;
    isCollidingWithObstacle: boolean;
    isPinnedFromAbove?: boolean;
    ceilingBrushThisFrame?: boolean;
    isSideBlocked?: boolean;
    movementBlockedThisFrame?: boolean;
    sideBlockedDirection?: -1 | 0 | 1;
    columnApprox?: number;
  };
  focus?: {
    centerBeatRowIndex?: number;
    waterSurfaceY?: number;
    centerRowEntity?: number;
    focusBeatStart?: number;
    focusBeatEnd?: number;
  };
  counts: {
    rowCount: number;
    leadCount: number;
    memberCount: number;
  };
  nearbyRows: CompactRow[];
  nearbyBands: CompactBand[];
};

const rowVisibleInContainer = (
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

const pressAabbSnapshot = (
  row: ObstacleRowComponentData
): CompactRow['pressAabb'] | undefined => {
  'worklet';
  const aabb = row.effectivePressSlabAabb;
  if (!aabb) {
    return undefined;
  }
  return {
    minX: aabb.minX,
    maxX: aabb.maxX,
    minY: aabb.minY,
    maxY: aabb.maxY,
  };
};

const compactRow = (
  entity: number,
  row: ObstacleRowComponentData,
  blockHeight: number,
  containerTop: number,
  containerBottom: number
): CompactRow => {
  'worklet';
  return {
    entity,
    y: row.y,
    beatRowIndex: row.beatRowIndex,
    shaftSegmentEpoch: row.shaftSegmentEpoch,
    prevRowEntity: row.prevRowEntity,
    gaps: row.gaps.slice(),
    effectiveGaps: row.effectiveGaps?.slice(),
    hasPressAabb: !!row.effectivePressSlabAabb,
    pressAabb: pressAabbSnapshot(row),
    visible: rowVisibleInContainer(
      row.y,
      blockHeight,
      containerTop,
      containerBottom
    ),
  };
};

const nearestBeatRowToSurface = (
  rowStore: ComponentStore<ObstacleRowComponentData>,
  waterSurfaceY: number
): number | undefined => {
  'worklet';
  let bestBeat: number | undefined;
  let bestDist = Number.POSITIVE_INFINITY;
  rowStore.forEach((_entity, row) => {
    if (row.beatRowIndex == null) {
      return;
    }
    const dist = Math.abs(row.y - waterSurfaceY);
    if (dist < bestDist) {
      bestDist = dist;
      bestBeat = row.beatRowIndex;
    }
  });
  return bestBeat;
};

export const buildPlatformShaftVanishDiagDump = (
  ecs: ECS,
  components: Record<string, ComponentStore<unknown>>
): PlatformShaftVanishDiagDump => {
  'worklet';
  const rowStore = components[ObstacleRowComponentName] as
    | ComponentStore<ObstacleRowComponentData>
    | undefined;
  const leadStore = components[HazardBandLeadComponentName] as
    | ComponentStore<HazardBandLeadComponentData>
    | undefined;
  const memberStore = components[HazardBandMemberComponentName];
  const water = firstDataFromStore(
    components[WaterComponentName] as ComponentStore<WaterComponentData>
  ) as WaterComponentData | undefined;
  const swimmer = firstDataFromStore(
    components[SwimmerComponentName] as ComponentStore<SwimmerComponentData>
  ) as SwimmerComponentData | undefined;
  const container = firstDataFromStore(
    components[ContainerComponentName] as ComponentStore<ContainerComponentData>
  ) as ContainerComponentData | undefined;
  const manager = firstDataFromStore(
    components[ObstaclesManagerComponentName] as ComponentStore<ObstaclesManagerComponentData>
  ) as ObstaclesManagerComponentData | undefined;
  const session = getGameSession(components);

  const containerTop =
    container != null ? container.centerY - container.height / 2 : -999999;
  const containerBottom =
    container != null ? container.centerY + container.height / 2 : 999999;
  const blockHeight =
    container != null
      ? getObstacleWidth(container.width)
      : 0;

  let centerBeatRowIndex: number | undefined;
  if (rowStore && water?.centerRowEntity != null) {
    centerBeatRowIndex = rowStore.get(water.centerRowEntity)?.beatRowIndex;
  }
  if (centerBeatRowIndex == null && rowStore && container != null) {
    centerBeatRowIndex = nearestBeatRowToSurface(rowStore, container.waterSurfaceY);
  }

  const focusBeatStart =
    centerBeatRowIndex != null
      ? Math.max(0, centerBeatRowIndex - 8)
      : undefined;
  const focusBeatEnd =
    centerBeatRowIndex != null ? centerBeatRowIndex + 8 : undefined;

  const nearbyRows: CompactRow[] = [];
  if (rowStore) {
    rowStore.forEach((entity, row) => {
      const beat = row.beatRowIndex;
      const inFocus =
        focusBeatStart == null ||
        focusBeatEnd == null ||
        (beat != null && beat >= focusBeatStart && beat <= focusBeatEnd);
      const visible =
        blockHeight > 0 &&
        rowVisibleInContainer(row.y, blockHeight, containerTop, containerBottom);
      if (!inFocus && !visible) {
        return;
      }
      nearbyRows.push(
        compactRow(entity, row, blockHeight, containerTop, containerBottom)
      );
    });
    nearbyRows.sort((a, b) => {
      const beatA = a.beatRowIndex ?? 999999;
      const beatB = b.beatRowIndex ?? 999999;
      if (beatA !== beatB) {
        return beatA - beatB;
      }
      return a.y - b.y;
    });
  }

  const nearbyBands: CompactBand[] = [];
  if (leadStore && rowStore) {
    leadStore.forEach((leadEntity, lead) => {
      const bandNearWater =
        centerBeatRowIndex == null
          ? true
          : lead.bounds.rowStart <= centerBeatRowIndex + 8 &&
          lead.bounds.rowEnd >= centerBeatRowIndex - 8;

      const expectedMemberEntityIds: number[] = [];
      const missingBeatRows: number[] = [];
      for (let beat = lead.bounds.rowStart; beat <= lead.bounds.rowEnd; beat++) {
        const expected = resolveRowEntityForBeat(rowStore, beat, {
          shaftSegmentEpoch: lead.shaftSegmentEpoch,
        });
        if (typeof expected === 'number') {
          expectedMemberEntityIds.push(expected);
        } else {
          missingBeatRows.push(beat);
        }
      }

      const members: CompactBandMember[] = [];
      const staleMemberIds: number[] = [];
      for (let i = 0; i < lead.memberRowEntityIds.length; i++) {
        const entity = lead.memberRowEntityIds[i]!;
        const row = rowStore.get(entity);
        const exists = !!row;
        const beat = row?.beatRowIndex;
        const inBounds =
          beat != null &&
          beat >= lead.bounds.rowStart &&
          beat <= lead.bounds.rowEnd;
        const epochMatches =
          !!row &&
          beat != null &&
          rowEntityMatchesBandBeat(row, beat, lead.shaftSegmentEpoch);
        const visible =
          !!row &&
          rowVisibleInContainer(row.y, blockHeight, containerTop, containerBottom);
        if (!exists || !inBounds || !epochMatches) {
          staleMemberIds.push(entity);
        }
        members.push({
          entity,
          exists,
          beatRowIndex: beat,
          shaftSegmentEpoch: row?.shaftSegmentEpoch,
          y: row?.y,
          inBounds,
          epochMatches,
          visible,
          effectiveGaps: row?.effectiveGaps?.slice(),
          hasPressAabb: !!row?.effectivePressSlabAabb,
        });
      }

      const hasVisibleMember = members.some((m) => m.visible);
      const shouldInclude =
        bandNearWater ||
        staleMemberIds.length > 0 ||
        missingBeatRows.length > 0 ||
        hasVisibleMember;
      if (!shouldInclude) {
        return;
      }

      nearbyBands.push({
        leadEntity,
        hazardId: lead.hazardId,
        side: lead.side,
        bounds: lead.bounds,
        shaftSegmentEpoch: lead.shaftSegmentEpoch,
        memberRowEntityIds: lead.memberRowEntityIds.slice(),
        expectedMemberEntityIds,
        staleMemberIds,
        missingBeatRows,
        leadRowExists: !!rowStore.get(leadEntity),
        leadRowBeat: rowStore.get(leadEntity)?.beatRowIndex,
        nearWaterBeat: bandNearWater,
        localSec: lead.localSec,
        maxWorldBeat: lead.maxWorldBeat,
        prevPressExtent: lead.prevPressExtent,
        pressClockOpen: !!lead.pressClockOpen,
        members,
      });
    });
    nearbyBands.sort((a, b) => a.bounds.rowStart - b.bounds.rowStart);
  }

  const rowCount = rowStore?.count() ?? 0;
  const leadCount = leadStore?.count() ?? 0;
  const memberCount = memberStore?.count() ?? 0;
  const columnApprox =
    swimmer && container
      ? Math.max(
        0,
        Math.min(
          LAYOUT_CONSTANTS.COLUMNS - 1,
          Math.floor(
            ((swimmer.x - (container.centerX - container.width / 2)) /
              Math.max(1, container.width)) *
            LAYOUT_CONSTANTS.COLUMNS
          )
        )
      )
      : undefined;

  return {
    tag: 'PLATFORM_SHAFT_VANISH_DIAG',
    exportedAtMs: Date.now(),
    sessionPhase: session?.phase,
    manager: manager
      ? {
        totalRowsGenerated: manager.totalRowsGenerated,
        lockedTemplateName: manager.lockedTemplateName,
        storyLockedShaftRecipe: manager.storyLockedShaftRecipe,
        storyLockedShaftSeed: manager.storyLockedShaftSeed,
        storyLockedShaftDifficulty: manager.storyLockedShaftDifficulty,
        storyLockShaftLoop: manager.storyLockShaftLoop,
        templateInfo: manager.templateInfo,
      }
      : undefined,
    container: container
      ? {
        centerY: container.centerY,
        height: container.height,
        waterSurfaceY: container.waterSurfaceY,
        top: containerTop,
        bottom: containerBottom,
        blockHeight,
      }
      : undefined,
    water: water
      ? {
        raisingSpeed: water.raisingSpeed,
        baseSpeed: water.baseSpeed,
        centerRowEntity: water.centerRowEntity,
        lastCenterRowEntity: water.lastCenterRowEntity,
        releaseRestZoneActive: water.releaseRestZoneActive,
        platformFlowPerRange: water.platformFlowPerRange,
      }
      : undefined,
    swimmer: swimmer
      ? {
        x: swimmer.x,
        y: swimmer.y,
        velocityX: swimmer.velocityX,
        isCollidingWithObstacle: swimmer.isCollidingWithObstacle,
        isPinnedFromAbove: swimmer.isPinnedFromAbove,
        ceilingBrushThisFrame: swimmer.ceilingBrushThisFrame,
        isSideBlocked: swimmer.isSideBlocked,
        movementBlockedThisFrame: swimmer.movementBlockedThisFrame,
        sideBlockedDirection: swimmer.sideBlockedDirection,
        columnApprox,
      }
      : undefined,
    focus: {
      centerBeatRowIndex,
      waterSurfaceY: container?.waterSurfaceY,
      centerRowEntity: water?.centerRowEntity,
      focusBeatStart,
      focusBeatEnd,
    },
    counts: {
      rowCount,
      leadCount,
      memberCount,
    },
    nearbyRows,
    nearbyBands,
  };
};

export const logPlatformShaftVanishDiagDump = (
  dump: PlatformShaftVanishDiagDump
): void => {
  'worklet';
  console.log('[PLATFORM_SHAFT_VANISH_DIAG]\n' + JSON.stringify(dump, null, 2));
};
