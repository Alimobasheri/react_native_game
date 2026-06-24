import { Component } from '@/containers/ReactNativeSkiaGameEngine/services-ecs';
import { MovementState } from '@/Game/characters/characterMovementStates';
import type { SecondaryItemPersistedState } from '@/Game/characters/secondaryItemTypes';

export const SwimmerComponentName = 'Swimmer';

export const SWIMMER_ACCESSORY_LAYER_INDEX = 1;

export type SpeedTier = 1 | 2 | 3;

export type SwimmerLocomotionData = {
  profileId: string;
  movementState: MovementState;
  currentTier: SpeedTier;
  /** Seconds remaining in the combo tap window. */
  comboTimer: number;
  currentAngleDeg: number;
  targetAngleDeg: number;
  facingDirection: 1 | -1;
  /** Seconds remaining in pivot input lockout. */
  pivotLockoutTimer: number;
  /** Queued facing direction for post-brake tier-1 strike. */
  pivotTargetDirection?: -1 | 1 | 0;
  /** One-shot tap direction consumed by physics each frame. */
  pendingTapDirection?: -1 | 1 | 0;
  /** Current procedural mesh scale X (volume-conserved with meshScaleY). */
  meshScaleX?: number;
  /** Current procedural mesh scale Y (volume-conserved with meshScaleX). */
  meshScaleY?: number;
  /** Prior frame movement state for pivot edge detection. */
  previousMovementState?: MovementState;
  /** Persisted secondary attachment simulation state. */
  accessoryState?: SecondaryItemPersistedState;
};

export type SwimmerComponentData = {
  /** World-space center X (pixels). */
  x: number;
  /** World-space center Y (pixels). */
  y: number;
  velocityX: number;
  /** Profile-driven locomotion state for tap tiers and tilt targets. */
  locomotion: SwimmerLocomotionData;
  waterSurfaceY: number;
  containerWidth: number;
  containerCenterX: number;
  containerCenterY: number;
  isInInitialPhase: boolean;
  isCollidingWithObstacle: boolean;
  isPinnedFromAbove?: boolean;
  fallingVelocityY: number;
  useColumnControl?: boolean;
  column?: number;
  bobbingPhase?: number;
  /** Visual tilt angle in radians (kinematics-driven for column control). */
  angle?: number;
  /** Unscaled render mesh width for procedural deformation. */
  meshBaseWidth?: number;
  /** Unscaled render mesh height for procedural deformation. */
  meshBaseHeight?: number;
  /** Visual skin id (body + accessory art). */
  skinId?: string;
  gameOverDispatched?: boolean;
  disableGameOver?: boolean;
};

export const createSwimmerComponent = (
  data: SwimmerComponentData
): Component<SwimmerComponentData> => {
  'worklet';
  return {
    name: SwimmerComponentName,
    data,
  };
};
