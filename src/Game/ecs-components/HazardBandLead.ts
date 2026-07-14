import { Component } from '@/containers/ReactNativeSkiaGameEngine/services-ecs';
import type { Entity } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/entity';
import type { HazardBandBounds } from '@/Game/grid/types';
import type {
  PlatformSide,
  PlatformSlabParams,
  PivotHazardParams,
} from '@/Game/path/platformShaft/types';

export const HazardBandLeadComponentName = 'HazardBandLead';

export type HazardBandKind = 'platform_slab' | 'pivot';

export type HazardBandLeadComponentData = {
  kind: HazardBandKind;
  modifierId: string;
  hazardId: string;
  side: PlatformSide;
  bounds: HazardBandBounds;
  params: PlatformSlabParams;
  memberRowEntityIds: Entity[];
  shaftSegmentEpoch?: number;
  phase01: number;
  maxWorldBeat: number;
  localSec: number;
  prevPressExtent: number;
  /** True once global water beat crossed animStartRow — drives real-time press (lab elapsedSec). */
  pressClockOpen?: boolean;
  /** Entity that currently owns steel render layers (leading band row). */
  lastSteelRenderEntity?: Entity;
  /** Pivot-only params when kind === 'pivot'. */
  pivotParams?: PivotHazardParams;
  /** Current pivot rotation angle in radians. */
  currentAngleRad?: number;
  /** Child arm entity ids (Matter bodies). */
  pivotArmEntityIds?: Entity[];
  /** Hub render entity (optional). */
  pivotHubEntityId?: Entity;
  /** True once Matter arm bodies were created for this band. */
  pivotMatterSpawned?: boolean;
};

export type CreatePlatformSlabLeadArgs = {
  kind?: 'platform_slab';
  modifierId: string;
  hazardId: string;
  side: PlatformSide;
  bounds: HazardBandBounds;
  params: PlatformSlabParams;
  memberRowEntityIds: Entity[];
  shaftSegmentEpoch?: number;
};

export type CreatePivotLeadArgs = {
  kind: 'pivot';
  modifierId: string;
  hazardId: string;
  bounds: HazardBandBounds;
  pivotParams: PivotHazardParams;
  memberRowEntityIds: Entity[];
  shaftSegmentEpoch?: number;
};

export type CreateHazardBandLeadArgs = CreatePlatformSlabLeadArgs | CreatePivotLeadArgs;

export const createHazardBandLeadComponent = (
  args: CreateHazardBandLeadArgs
): Component<HazardBandLeadComponentData> => {
  'worklet';
  if (args.kind === 'pivot') {
    return {
      name: HazardBandLeadComponentName,
      data: {
        kind: 'pivot',
        modifierId: args.modifierId,
        hazardId: args.hazardId,
        side: 'left',
        bounds: args.bounds,
        params: {},
        memberRowEntityIds: args.memberRowEntityIds.slice(),
        shaftSegmentEpoch: args.shaftSegmentEpoch,
        phase01: 0,
        maxWorldBeat: -1,
        localSec: 0,
        prevPressExtent: 0,
        pivotParams: args.pivotParams,
        currentAngleRad: 0,
        pivotArmEntityIds: [],
        pivotMatterSpawned: false,
      },
    };
  }
  return {
    name: HazardBandLeadComponentName,
    data: {
      kind: 'platform_slab',
      modifierId: args.modifierId,
      hazardId: args.hazardId,
      side: args.side,
      bounds: args.bounds,
      params: args.params,
      memberRowEntityIds: args.memberRowEntityIds.slice(),
      shaftSegmentEpoch: args.shaftSegmentEpoch,
      phase01: 0,
      maxWorldBeat: -1,
      localSec: 0,
      prevPressExtent: 0,
    },
  };
};
