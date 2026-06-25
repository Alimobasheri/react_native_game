import { MovementState } from './characterMovementStates';
import { GIGGLE_CRYSTAL_PROFILE_ID } from './characterProfiles';
import { VisualStrokePhase } from './visualStrokePhase';
import type { SwimmerLocomotionData } from '@/Game/ecs-components/Swimmer';

export const createDefaultSwimmerLocomotion = (): SwimmerLocomotionData => {
  'worklet';
  return {
    profileId: GIGGLE_CRYSTAL_PROFILE_ID,
    movementState: MovementState.IDLE,
    currentTier: 1,
    comboTimer: 0,
    anticipationTimer: 0,
    dragTimer: 0,
    currentAngleDeg: 0,
    targetAngleDeg: 0,
    visualAngleDeg: 0,
    clearance01: 1,
    horizontalClearancePx: 0,
    visualPhase: VisualStrokePhase.IDLE,
    visualAnticipationTimer: 0,
    visualStrokeTimer: 0,
    visualGlideSettleTimer: 0,
    visualRecoveryTimer: 0,
    visualPivotTimer: 0,
    visualStrokeDirection: 1,
    visualStrokeTier: 1,
    wakeSpawnTimer: 0,
    facingDirection: 1,
    pivotLockoutTimer: 0,
    pivotTargetDirection: 0,
    pendingTapDirection: 0,
    meshScaleX: 1,
    meshScaleY: 1,
    previousMovementState: MovementState.IDLE,
  };
};
