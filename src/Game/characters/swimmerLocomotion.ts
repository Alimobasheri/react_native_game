import { MovementState } from './characterMovementStates';
import { GIGGLE_CRYSTAL_PROFILE_ID } from './characterProfiles';

export type SwimmerLocomotionTier = 1 | 2 | 3;

export type SwimmerLocomotionData = {
  profileId: string;
  movementState: MovementState;
  currentTier: SwimmerLocomotionTier;
  /** Seconds remaining in the combo tap window. */
  comboTimer: number;
  currentAngleDeg: number;
  targetAngleDeg: number;
  facingDirection: 1 | -1;
  /** One-shot tap direction consumed by physics; 0 means none pending. */
  pendingTapDirection?: -1 | 1 | 0;
};

export const createDefaultSwimmerLocomotion = (): SwimmerLocomotionData => {
  return {
    profileId: GIGGLE_CRYSTAL_PROFILE_ID,
    movementState: MovementState.IDLE,
    currentTier: 1,
    comboTimer: 0,
    currentAngleDeg: 0,
    targetAngleDeg: 0,
    facingDirection: 1,
    pendingTapDirection: 0,
  };
};
