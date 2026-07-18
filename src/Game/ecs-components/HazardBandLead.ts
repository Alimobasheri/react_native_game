import { Component } from '@/containers/ReactNativeSkiaGameEngine/services-ecs';
import type { Entity } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/entity';
import type { HazardBandBounds } from '@/Game/grid/types';
import type {
  PendulumHazardParams,
  PistonHazardParams,
  PlatformSide,
  PlatformSlabParams,
  PivotHazardParams,
} from '@/Game/path/platformShaft/types';

export const HazardBandLeadComponentName = 'HazardBandLead';

export type HazardBandKind = 'platform_slab' | 'pivot' | 'pendulum' | 'piston';

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
  /** Pendulum-only params when kind === 'pendulum'. */
  pendulumParams?: PendulumHazardParams;
  /** Wall-clock ms when pendulum/piston band was spawned — motion phase anchor. */
  spawnTimeMs?: number;
  /** Child head entity id (Matter body). */
  pendulumHeadEntityId?: Entity;
  /** True once Matter head body was created for this band. */
  pendulumMatterSpawned?: boolean;
  /** Tether visually snapped on strike. */
  pendulumTetherSnapped?: boolean;
  /** Piston-only params when kind === 'piston'. */
  pistonParams?: PistonHazardParams;
  /** Previous-frame head center Y (world) for swept collision. */
  pistonPrevHeadCenterY?: number;
  /** Previous-frame head center X (world) for swept collision. */
  pistonPrevHeadCenterX?: number;
  /** Current-frame head center Y (world). */
  pistonCurrHeadCenterY?: number;
  /** Current-frame head center X (world). */
  pistonCurrHeadCenterX?: number;
  /** True after telegraph elapsed and ping-pong motion has begun. */
  pistonMotionStarted?: boolean;
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

export type CreatePendulumLeadArgs = {
  kind: 'pendulum';
  modifierId: string;
  hazardId: string;
  bounds: HazardBandBounds;
  pendulumParams: PendulumHazardParams;
  memberRowEntityIds: Entity[];
  shaftSegmentEpoch?: number;
  spawnTimeMs?: number;
};

export type CreatePistonLeadArgs = {
  kind: 'piston';
  modifierId: string;
  hazardId: string;
  bounds: HazardBandBounds;
  pistonParams: PistonHazardParams;
  memberRowEntityIds: Entity[];
  shaftSegmentEpoch?: number;
  spawnTimeMs?: number;
};

export type CreateHazardBandLeadArgs =
  | CreatePlatformSlabLeadArgs
  | CreatePivotLeadArgs
  | CreatePendulumLeadArgs
  | CreatePistonLeadArgs;

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
  if (args.kind === 'pendulum') {
    return {
      name: HazardBandLeadComponentName,
      data: {
        kind: 'pendulum',
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
        pendulumParams: args.pendulumParams,
        currentAngleRad: 0,
        spawnTimeMs: args.spawnTimeMs ?? 0,
        pendulumMatterSpawned: false,
        pendulumTetherSnapped: false,
      },
    };
  }
  if (args.kind === 'piston') {
    return {
      name: HazardBandLeadComponentName,
      data: {
        kind: 'piston',
        modifierId: args.modifierId,
        hazardId: args.hazardId,
        side: args.pistonParams.safeExitSide === 'left' ? 'left' : 'right',
        bounds: args.bounds,
        params: {},
        memberRowEntityIds: args.memberRowEntityIds.slice(),
        shaftSegmentEpoch: args.shaftSegmentEpoch,
        phase01: 0,
        maxWorldBeat: -1,
        localSec: 0,
        prevPressExtent: 0,
        pistonParams: args.pistonParams,
        spawnTimeMs: args.spawnTimeMs ?? 0,
        pistonMotionStarted: false,
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
