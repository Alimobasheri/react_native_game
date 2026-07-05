import { Component } from '@/containers/ReactNativeSkiaGameEngine/services-ecs';
import type { Entity } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/entity';
import type { HazardBandBounds } from '@/Game/grid/types';
import type {
  PlatformSide,
  PlatformSlabParams,
} from '@/Game/path/platformShaft/types';

export const HazardBandLeadComponentName = 'HazardBandLead';

export type HazardBandKind = 'platform_slab';

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
};

export type CreateHazardBandLeadArgs = {
  modifierId: string;
  hazardId: string;
  side: PlatformSide;
  bounds: HazardBandBounds;
  params: PlatformSlabParams;
  memberRowEntityIds: Entity[];
  shaftSegmentEpoch?: number;
};

export const createHazardBandLeadComponent = (
  args: CreateHazardBandLeadArgs
): Component<HazardBandLeadComponentData> => {
  'worklet';
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
