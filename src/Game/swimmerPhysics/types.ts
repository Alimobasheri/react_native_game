import type { ComponentStore } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/component';
import type { ECS } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/ecs';
import type { Entity } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/entity';
import type { EventQueueContextType } from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs/useEventQueue/useEventQueue';
import type { SharedValue } from 'react-native-reanimated';
import type { ContainerComponentData } from '@/Game/ecs-components/Container';
import type { WaterComponentData } from '@/Game/ecs-components/Water';
import type { ObstacleRowComponentData } from '@/Game/ecs-components/ObstacleRowComponent';
import type {
  SwimmerComponentData,
  SwimmerLocomotionData,
} from '@/Game/ecs-components/Swimmer';
import type { CollisionRow } from '@/Game/collision/swimmerBlockCollision';
import type { ResolveSwimmerResult } from '@/Game/collision/swimmerBlockCollision';
import type { SwimmerColliderExtents } from '@/Game/characters/swimmerCollider';
import type { WaterSurfaceProfileParams } from '@/Game/water/waterSurfaceProfile';
import type { GameSessionComponentData } from '@/Game/ecs-components/GameSession';

export type SwimmerFrameContext = {
  ecs: ECS;
  components: Record<string, ComponentStore<unknown>>;
  deltaSeconds: number;
  startReady: boolean;
  session: GameSessionComponentData | undefined;
  containerEntity: Entity;
  container: ContainerComponentData;
  containerTop: number;
  containerBottom: number;
  waterEntity: Entity;
  water: WaterComponentData;
  waterSurfaceRestY: number;
  waterLevelNorm: number;
  profileBase: Omit<WaterSurfaceProfileParams, 'xNorm'>;
  obstacleWidth: number;
  blockDimensions: { width: number; height: number };
  blockHeight: number;
  rowHeight: number;
  obstacleRowStore: ComponentStore<ObstacleRowComponentData>;
  entities: Entity[];
  isInInitialPhase: boolean;
};

export type SwimmerSnapshot = {
  entity: Entity;
  component: SwimmerComponentData;
  centerX: number;
  centerY: number;
  wasPinnedFromAbove: boolean;
  normalizedSpeed: number;
  waterSpeed: number;
};

export type BobbingBuoyancyStep = {
  bobbingPhase: number;
  bobbingOffsetY: number;
  depth: number;
  buoyancySpeed: number;
  swimmerVisualHeight: number;
  swimmerVisualWidth: number;
  columnWidth: number;
  navColliderExtents: SwimmerColliderExtents;
  pinnedColliderExtents: SwimmerColliderExtents;
  colliderExtents: SwimmerColliderExtents;
};

export type HorizontalLocomotionStep = {
  velocityX: number;
  locomotion: SwimmerLocomotionData;
  kinematicsAngleRad: number;
  tapImpulseAppliedThisFrame: boolean;
  tapDirectionThisFrame: -1 | 0 | 1;
  waterCurrentVelocityX: number;
  pinnedMomentumCoast: boolean;
  preDragVelocityX: number;
};

export type WaterAdvectionStep = {
  velocityX: number;
};

export type VerticalSurfaceStep = {
  targetY: number;
  curveSurfaceY: number;
  proposedDeltaX: number;
  containerUVX: number;
  rowDeltaY: number;
  maxVerticalStepPx: number;
};

export type ProposeMotionResult = BobbingBuoyancyStep &
  HorizontalLocomotionStep &
  WaterAdvectionStep &
  VerticalSurfaceStep;

import type { PendulumStrikeStep } from '@/Game/swimmerPhysics/react/pendulumStrike';
import type { PistonStrikeStep } from '@/Game/swimmerPhysics/react/pistonStrike';

export type CollisionResolutionStep = {
  finalX: number;
  finalY: number;
  visualAngleRad: number;
  collisionAngleRad: number;
  collisionResult: ResolveSwimmerResult;
  isBlockedFromAbove: boolean;
  isCollidingWithObstacle: boolean;
  proposedDeltaY: number;
  nearbyRows: readonly CollisionRow[];
  minX: number;
  maxX: number;
  /** Signed px/s from an extending press slab pinning the swimmer. */
  pinnedSlabSurfaceVelocityX: number;
  pendulumStrike?: PendulumStrikeStep;
  pistonStrike?: PistonStrikeStep;
  /** Cleared when swimmer fully separates from the latched piston. */
  pistonContactHazardId?: string;
};

export type WallBumpStep = {
  velocityX: number;
  locomotion: SwimmerLocomotionData;
  movementBlockedThisFrame: boolean;
};

export type GameOverStep = {
  shouldDispatchGameOver: boolean;
};

export type ProcessOneSwimmerArgs = {
  frame: SwimmerFrameContext;
  swimmerEntity: Entity;
  eventQueue: EventQueueContextType;
  dimensions: SharedValue<{ width: number; height: number }>;
  swimmer?: SwimmerSnapshot;
};
