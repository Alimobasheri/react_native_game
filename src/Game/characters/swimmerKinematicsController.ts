import { MovementState } from './characterMovementStates';
import { getCharacterProfile } from './characterProfileRegistry';
import type { ICharacterProfile } from './characterProfileTypes';
import type { IKinematicTelemetry } from './kinematicTelemetry';
import { swimmerKinematicsTuning } from '@/config/swimmerKinematicsTuning';
import type {
  SpeedTier,
  SwimmerLocomotionData,
} from '@/Game/ecs-components/Swimmer';

export type PivotSplashHandler = (
  prefabKey: string,
  impactSpeed: number
) => void;

const clampFrameDt = (dt: number): number => {
  'worklet';
  const minDt = 0;
  const maxDt = swimmerKinematicsTuning.MAX_FRAME_DT;
  if (dt < minDt) {
    return minDt;
  }
  if (dt > maxDt) {
    return maxDt;
  }
  return dt;
};

const getComboWindowSec = (profile: ICharacterProfile): number => {
  'worklet';
  return profile.comboWindowMs / 1000;
};

const getTierMultiplier = (
  profile: ICharacterProfile,
  tier: SpeedTier
): number => {
  'worklet';
  return profile.comboForceMultipliers[tier - 1];
};

const getStrikeImpulse = (
  profile: ICharacterProfile,
  direction: 1 | -1,
  tier: SpeedTier
): number => {
  'worklet';
  const tierMultiplier = getTierMultiplier(profile, tier);
  return (
    (direction * profile.baseStrikeForce * tierMultiplier) / profile.mass
  );
};

const getGlideExitThreshold = (profile: ICharacterProfile): number => {
  'worklet';
  const tierOneSpeed =
    (profile.baseStrikeForce * profile.comboForceMultipliers[0]) / profile.mass;
  return tierOneSpeed * swimmerKinematicsTuning.GLIDE_EXIT_SPEED_RATIO;
};

const getDeceleratingIdleThreshold = (profile: ICharacterProfile): number => {
  'worklet';
  return (
    getGlideExitThreshold(profile) *
    swimmerKinematicsTuning.DECELERATING_IDLE_SPEED_RATIO
  );
};

const getPivotLockoutSec = (
  profile: ICharacterProfile,
  tier: SpeedTier
): number => {
  'worklet';
  return profile.pivotLockoutDurations[tier - 1] / 1000;
};

export const getCharacterProfileForSwimmer = (
  profileId: string
): ICharacterProfile => {
  'worklet';
  return getCharacterProfile(profileId);
};

export const degreesToRadians = (degrees: number): number => {
  'worklet';
  return (degrees * Math.PI) / 180;
};

const applyTierStrike = (
  profile: ICharacterProfile,
  locomotion: SwimmerLocomotionData,
  velocityX: number,
  direction: 1 | -1
): number => {
  'worklet';
  locomotion.facingDirection = direction;

  const comboWindowSec = getComboWindowSec(profile);
  if (locomotion.comboTimer > 0) {
    const nextTier = locomotion.currentTier + 1;
    locomotion.currentTier = nextTier > 3 ? 3 : (nextTier as SpeedTier);
  } else {
    locomotion.currentTier = 1;
  }

  locomotion.comboTimer = comboWindowSec;
  locomotion.movementState = MovementState.STRIKE;

  const strikeImpulse = getStrikeImpulse(
    profile,
    direction,
    locomotion.currentTier
  );
  locomotion.targetAngleDeg =
    direction * profile.targetSwimAngles[locomotion.currentTier - 1];
  return velocityX + strikeImpulse;
};

const beginPivotBrake = (
  profile: ICharacterProfile,
  locomotion: SwimmerLocomotionData,
  velocityX: number,
  direction: 1 | -1,
  onPivotSplash: PivotSplashHandler | null
): number => {
  'worklet';
  const shovelAngle = swimmerKinematicsTuning.PIVOT_SHOVEL_ANGLE_DEG;
  const impactSpeed = Math.abs(velocityX);

  locomotion.movementState = MovementState.PIVOT_BRAKE;
  locomotion.targetAngleDeg = -shovelAngle * locomotion.facingDirection;
  locomotion.pivotLockoutTimer = getPivotLockoutSec(
    profile,
    locomotion.currentTier
  );

  const splashHandler = onPivotSplash;
  if (splashHandler) {
    splashHandler(profile.splashFxPrefabKey, impactSpeed);
  }

  locomotion.currentTier = 1;
  locomotion.comboTimer = 0;
  locomotion.pivotTargetDirection = direction;
  return velocityX;
};

const tryCompletePivotBrake = (
  profile: ICharacterProfile,
  locomotion: SwimmerLocomotionData,
  velocityX: number
): number => {
  'worklet';
  if (locomotion.movementState !== MovementState.PIVOT_BRAKE) {
    return velocityX;
  }

  const completionSpeed = swimmerKinematicsTuning.PIVOT_COMPLETION_SPEED;
  const absVelocityX = Math.abs(velocityX);
  const lockoutExpired = locomotion.pivotLockoutTimer <= 0;
  const velocityStopped = absVelocityX <= completionSpeed;

  if (!lockoutExpired && !velocityStopped) {
    return velocityX;
  }

  const targetDirection = locomotion.pivotTargetDirection;
  if (targetDirection !== -1 && targetDirection !== 1) {
    return velocityX;
  }

  locomotion.facingDirection = targetDirection;
  locomotion.currentTier = 1;
  locomotion.pivotTargetDirection = 0;
  locomotion.pivotLockoutTimer = 0;
  locomotion.movementState = MovementState.STRIKE;

  const strikeImpulse = getStrikeImpulse(profile, targetDirection, 1);
  locomotion.targetAngleDeg = targetDirection * profile.targetSwimAngles[0];
  return strikeImpulse;
};

const updateKinematicsTimers = (
  locomotion: SwimmerLocomotionData,
  dt: number
): void => {
  'worklet';
  const nextComboTimer = locomotion.comboTimer - dt;
  locomotion.comboTimer = nextComboTimer > 0 ? nextComboTimer : 0;

  const nextPivotTimer = locomotion.pivotLockoutTimer - dt;
  locomotion.pivotLockoutTimer = nextPivotTimer > 0 ? nextPivotTimer : 0;
};

const applyPivotBrakePhysics = (
  profile: ICharacterProfile,
  velocityX: number,
  dt: number
): number => {
  'worklet';
  const mass = profile.mass;
  const brakeExponent = 1 / mass;
  const retainBase = swimmerKinematicsTuning.PIVOT_BRAKE_RETAIN_PER_FRAME_BASE;
  const brakeFactor = Math.pow(retainBase, dt * brakeExponent);
  let nextVelocityX = velocityX * brakeFactor;

  const epsilon = swimmerKinematicsTuning.VELOCITY_ZERO_EPSILON;
  if (Math.abs(nextVelocityX) < epsilon) {
    nextVelocityX = 0;
  }
  return nextVelocityX;
};

const applyPhysicsDrag = (
  profile: ICharacterProfile,
  velocityX: number,
  dt: number
): number => {
  'worklet';
  const baseDrag = profile.baseDrag;
  const dragFactor = Math.exp(-baseDrag * dt);
  let nextVelocityX = velocityX * dragFactor;

  const epsilon = swimmerKinematicsTuning.VELOCITY_ZERO_EPSILON;
  if (Math.abs(nextVelocityX) < epsilon) {
    nextVelocityX = 0;
  }
  return nextVelocityX;
};

const interpolateKinematicsAngle = (
  profile: ICharacterProfile,
  locomotion: SwimmerLocomotionData,
  dt: number
): void => {
  'worklet';
  const baseDrag = profile.baseDrag;
  const interpScale = swimmerKinematicsTuning.ANGLE_INTERP_DRAG_SCALE;
  const step = Math.min(1, baseDrag * interpScale * dt);
  const delta = locomotion.targetAngleDeg - locomotion.currentAngleDeg;
  locomotion.currentAngleDeg += delta * step;
};

const processKinematicsStateTransitions = (
  profile: ICharacterProfile,
  locomotion: SwimmerLocomotionData,
  velocityX: number
): number => {
  'worklet';
  if (locomotion.movementState === MovementState.PIVOT_BRAKE) {
    return velocityX;
  }

  const glideExitThreshold = getGlideExitThreshold(profile);
  const deceleratingIdleThreshold = getDeceleratingIdleThreshold(profile);
  const absVelocityX = Math.abs(velocityX);

  if (locomotion.movementState === MovementState.STRIKE) {
    locomotion.movementState = MovementState.GLIDE;
    return velocityX;
  }

  if (locomotion.movementState === MovementState.GLIDE) {
    if (absVelocityX < glideExitThreshold) {
      locomotion.movementState = MovementState.DECELERATING;
      locomotion.targetAngleDeg = 0;
    }
    return velocityX;
  }

  if (locomotion.movementState === MovementState.DECELERATING) {
    if (absVelocityX < deceleratingIdleThreshold) {
      locomotion.movementState = MovementState.IDLE;
      return 0;
    }
  }

  return velocityX;
};

export const swimmerKinematicsOnTap = (
  profile: ICharacterProfile,
  locomotion: SwimmerLocomotionData,
  velocityX: number,
  direction: 1 | -1,
  onPivotSplash: PivotSplashHandler | null = null
): number => {
  'worklet';
  if (
    locomotion.pivotLockoutTimer > 0 ||
    locomotion.movementState === MovementState.PIVOT_BRAKE
  ) {
    return velocityX;
  }

  const forwardMomentum = velocityX * locomotion.facingDirection;
  const pivotMomentumMin = swimmerKinematicsTuning.PIVOT_FORWARD_MOMENTUM_MIN;
  if (
    direction !== locomotion.facingDirection &&
    forwardMomentum > pivotMomentumMin
  ) {
    return beginPivotBrake(profile, locomotion, velocityX, direction, onPivotSplash);
  }

  return applyTierStrike(profile, locomotion, velocityX, direction);
};

export const swimmerKinematicsUpdate = (
  profile: ICharacterProfile,
  locomotion: SwimmerLocomotionData,
  velocityX: number,
  dt: number
): number => {
  'worklet';
  const safeDt = clampFrameDt(dt);
  updateKinematicsTimers(locomotion, safeDt);

  let nextVelocityX = velocityX;
  if (locomotion.movementState === MovementState.PIVOT_BRAKE) {
    nextVelocityX = applyPivotBrakePhysics(profile, nextVelocityX, safeDt);
  } else {
    nextVelocityX = applyPhysicsDrag(profile, nextVelocityX, safeDt);
  }

  interpolateKinematicsAngle(profile, locomotion, safeDt);
  nextVelocityX = tryCompletePivotBrake(profile, locomotion, nextVelocityX);
  nextVelocityX = processKinematicsStateTransitions(
    profile,
    locomotion,
    nextVelocityX
  );
  return nextVelocityX;
};

export const getSwimmerKinematicsTelemetry = (
  locomotion: SwimmerLocomotionData,
  velocityX: number
): IKinematicTelemetry => {
  'worklet';
  return {
    velocityX,
    currentAngle: locomotion.currentAngleDeg,
    state: locomotion.movementState,
    currentTier: locomotion.currentTier,
    facingDirection: locomotion.facingDirection,
  };
};
