import { MovementState } from './characterMovementStates';
import { GIGGLE_CRYSTAL_PROFILE_ID } from './characterProfiles';
import type { SwimmerLocomotionData } from '@/Game/ecs-components/Swimmer';

export const createDefaultSwimmerLocomotion = (): SwimmerLocomotionData => {
  'worklet';
  return {
    profileId: GIGGLE_CRYSTAL_PROFILE_ID,
    movementState: MovementState.IDLE,
    currentTier: 1,
    comboTimer: 0,
    currentAngleDeg: 0,
    targetAngleDeg: 0,
    facingDirection: 1,
    pivotLockoutTimer: 0,
    pivotTargetDirection: 0,
    pendingTapDirection: 0,
    meshScaleX: 1,
    meshScaleY: 1,
    previousMovementState: MovementState.IDLE,
  };
};
