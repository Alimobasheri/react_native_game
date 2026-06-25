import { MovementState } from './characterMovementStates';
import type { SpeedTier, SwimmerLocomotionData } from '@/Game/ecs-components/Swimmer';

export interface IKinematicTelemetry {
  readonly velocityX: number;
  readonly currentAngle: number;
  readonly state: MovementState;
  readonly currentTier: SpeedTier;
  readonly facingDirection: 1 | -1;
}

export const buildKinematicTelemetry = (
  locomotion: SwimmerLocomotionData,
  velocityX: number
): IKinematicTelemetry => {
  'worklet';
  return {
    velocityX,
    currentAngle: locomotion.visualAngleDeg ?? locomotion.currentAngleDeg,
    state: locomotion.movementState,
    currentTier: locomotion.currentTier,
    facingDirection: locomotion.facingDirection,
  };
};
