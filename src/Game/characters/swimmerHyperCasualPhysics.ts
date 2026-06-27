import { MovementState } from './characterMovementStates';
import type { ICharacterProfile } from './characterProfileTypes';
import { beginVisualPivot, beginVisualStroke } from './swimmerVisualLocomotion';
import type { SpeedTier, SwimmerLocomotionData } from '@/Game/ecs-components/Swimmer';
import {
  hyperCasualPhysicsTuning,
  swimmerPhysicsTuning,
  swimmerCoastPreset,
  swimmerCoastPresets,
  type SwimmerCoastPresetValues,
} from '@/config/swimmerTuning';

const REFERENCE_FRAME_DT = 1 / 60;

export type HyperCasualTapResult = {
  velocityX: number;
  facingDirection: 1 | -1;
  visualStrokeTier: SpeedTier;
  isSoftReverseTap: boolean;
  streakMultiplier: number;
  /** Impulse applied this frame (px/s), signed. */
  tapImpulseApplied: number;
};

const clampFrameDt = (dt: number): number => {
  'worklet';
  if (dt < 0) {
    return 0;
  }
  if (dt > hyperCasualPhysicsTuning.MAX_FRAME_DT) {
    return hyperCasualPhysicsTuning.MAX_FRAME_DT;
  }
  return dt;
};

const getRetainPerSecond = (
  normalizedWaterSpeed: number,
  preset: SwimmerCoastPresetValues
): number => {
  'worklet';
  const speed = Math.max(0, Math.min(1, normalizedWaterSpeed));
  return (
    preset.MAX_RETAIN_PER_SECOND -
    (preset.MAX_RETAIN_PER_SECOND - preset.MIN_RETAIN_PER_SECOND) * speed
  );
};

export const applyHyperCasualDrag = (
  velocityX: number,
  normalizedWaterSpeed: number,
  profile: ICharacterProfile,
  dt: number,
  preset?: SwimmerCoastPresetValues
): number => {
  'worklet';
  const coastPreset = preset ?? swimmerCoastPresets[swimmerCoastPreset];
  const safeDt = clampFrameDt(dt);
  const retainPerSecond = getRetainPerSecond(normalizedWaterSpeed, coastPreset);
  const adjustedRetain = Math.pow(retainPerSecond, profile.dragScale);
  let nextVelocityX =
    velocityX * Math.pow(Math.max(0.0001, adjustedRetain), safeDt);

  if (Math.abs(nextVelocityX) < hyperCasualPhysicsTuning.VELOCITY_ZERO_EPSILON) {
    nextVelocityX = 0;
  }
  return nextVelocityX;
};

const integratePhysicsFrame = (
  velocityX: number,
  normalizedWaterSpeed: number,
  waterCurrentVelocityX: number,
  profile: ICharacterProfile,
  preset: SwimmerCoastPresetValues,
  frameDt: number
): number => {
  'worklet';
  let vx = applyHyperCasualDrag(
    velocityX,
    normalizedWaterSpeed,
    profile,
    frameDt,
    preset
  );
  const currentResponse =
    (1 -
      Math.exp(
        -swimmerPhysicsTuning.WATER_CURRENT_RESPONSE_PER_SECOND * frameDt
      )) *
    preset.TAP_MODE_CURRENT_RESPONSE_SCALE;
  vx += (waterCurrentVelocityX - vx) * currentResponse;
  return vx;
};

/** Mirrors SwimmerPhysicsSystem per-frame order: drag, advection, integrate. */
export const simulateTapDisplacementPx = (
  impulseMagnitude: number,
  tapDirection: 1 | -1,
  startVelocityX: number,
  normalizedWaterSpeed: number,
  waterCurrentVelocityX: number,
  profile: ICharacterProfile,
  preset: SwimmerCoastPresetValues,
  frameDt: number,
  maxSeconds: number
): number => {
  'worklet';
  const safeDt = clampFrameDt(frameDt);
  let vx = startVelocityX + tapDirection * impulseMagnitude;
  let displacement = 0;
  const maxFrames = Math.ceil(maxSeconds / Math.max(0.0001, safeDt));

  for (let frame = 0; frame < maxFrames; frame++) {
    vx = integratePhysicsFrame(
      vx,
      normalizedWaterSpeed,
      waterCurrentVelocityX,
      profile,
      preset,
      safeDt
    );
    displacement += vx * safeDt;
    if (Math.abs(vx) < hyperCasualPhysicsTuning.VELOCITY_ZERO_EPSILON) {
      break;
    }
  }
  return displacement;
};

export const estimateTravelPx = (
  columnWidth: number,
  streakMultiplier: number,
  preset: SwimmerCoastPresetValues,
  clearancePx: number,
  colliderWidthPx: number
): number => {
  'worklet';
  const openTarget =
    preset.TAP_TRAVEL_COLUMN_MULTIPLIER * Math.max(1, columnWidth);
  const slackPx = Math.max(0, clearancePx - colliderWidthPx);
  const narrowTarget = slackPx * 0.96;
  const minTarget = columnWidth * 0.12;
  const targetPx = Math.min(openTarget, Math.max(narrowTarget, minTarget));
  return targetPx * streakMultiplier;
};

/** Solve impulse so simulated coast travel matches the column target after drag + advection. */
export const computeForwardTapImpulseMagnitude = (
  columnWidth: number,
  normalizedWaterSpeed: number,
  streakMultiplier: number,
  profile: ICharacterProfile,
  waterCurrentVelocityX: number,
  tapDirection: 1 | -1,
  preset: SwimmerCoastPresetValues,
  clearancePx: number,
  colliderWidthPx: number
): number => {
  'worklet';
  const targetPx = estimateTravelPx(
    columnWidth,
    streakMultiplier,
    preset,
    clearancePx,
    colliderWidthPx
  );
  const probeImpulse = 120;
  const probeTravel = Math.abs(
    simulateTapDisplacementPx(
      probeImpulse,
      tapDirection,
      0,
      normalizedWaterSpeed,
      waterCurrentVelocityX,
      profile,
      preset,
      REFERENCE_FRAME_DT,
      2
    )
  );
  if (probeTravel < 0.5) {
    return probeImpulse;
  }
  return probeImpulse * (targetPx / probeTravel);
};

export const applyHyperCasualTap = (
  profile: ICharacterProfile,
  locomotion: SwimmerLocomotionData,
  velocityX: number,
  tapDirection: 1 | -1,
  columnWidth: number,
  normalizedWaterSpeed: number,
  streakMultiplier: number,
  waterCurrentVelocityX: number,
  clearancePx: number,
  colliderWidthPx: number
): HyperCasualTapResult => {
  'worklet';
  const preset = swimmerCoastPresets[swimmerCoastPreset];
  const visualStrokeTier = locomotion.visualStrokeTier ?? locomotion.currentTier;
  const forwardImpulseMag = computeForwardTapImpulseMagnitude(
    columnWidth,
    normalizedWaterSpeed,
    streakMultiplier,
    profile,
    waterCurrentVelocityX,
    tapDirection,
    preset,
    clearancePx,
    colliderWidthPx
  );

  const absVelocityX = Math.abs(velocityX);
  const isCoastingWithFacing =
    absVelocityX >= hyperCasualPhysicsTuning.SOFT_REVERSE_MIN_COAST_SPEED &&
    Math.sign(velocityX) === locomotion.facingDirection;
  const isSoftReverseTap =
    tapDirection !== locomotion.facingDirection && isCoastingWithFacing;

  let tapImpulseApplied = 0;
  let nextVelocityX = velocityX;

  locomotion.facingDirection = tapDirection;
  locomotion.currentTier = visualStrokeTier;

  if (isSoftReverseTap) {
    const reverseImpulse =
      tapDirection *
      forwardImpulseMag *
      hyperCasualPhysicsTuning.REVERSE_IMPULSE_SCALE;
    tapImpulseApplied = reverseImpulse;
    nextVelocityX += reverseImpulse;
    beginVisualPivot(locomotion);
  } else {
    const forwardImpulse = tapDirection * forwardImpulseMag;
    tapImpulseApplied = forwardImpulse;
    nextVelocityX += forwardImpulse;
    beginVisualStroke(locomotion, tapDirection, visualStrokeTier);
  }

  if (nextVelocityX > swimmerPhysicsTuning.MAX_HORIZONTAL_SPEED) {
    nextVelocityX = swimmerPhysicsTuning.MAX_HORIZONTAL_SPEED;
  } else if (nextVelocityX < -swimmerPhysicsTuning.MAX_HORIZONTAL_SPEED) {
    nextVelocityX = -swimmerPhysicsTuning.MAX_HORIZONTAL_SPEED;
  }

  return {
    velocityX: nextVelocityX,
    facingDirection: tapDirection,
    visualStrokeTier,
    isSoftReverseTap,
    streakMultiplier,
    tapImpulseApplied,
  };
};

/** Splash strength from streak + visual tier (capped). */
export const computeHybridSplashStrength = (
  visualStrokeTier: SpeedTier,
  streakMultiplier: number
): number => {
  'worklet';
  const streakBoost = Math.max(0, streakMultiplier - 1) * 0.05;
  return Math.min(
    hyperCasualPhysicsTuning.MAX_SPLASH_STRENGTH,
    0.75 + visualStrokeTier * 0.12 + streakBoost
  );
};

/** Velocity-derived physics telemetry state for downstream consumers. */
export const deriveMovementStateFromVelocity = (
  velocityX: number,
  previousState: MovementState
): MovementState => {
  'worklet';
  const absVelocityX = Math.abs(velocityX);
  const idleThreshold = hyperCasualPhysicsTuning.IDLE_SPEED_THRESHOLD;
  const deceleratingIdleThreshold =
    hyperCasualPhysicsTuning.DECELERATING_SPEED_THRESHOLD;

  if (absVelocityX <= idleThreshold) {
    return MovementState.IDLE;
  }
  if (
    absVelocityX <= deceleratingIdleThreshold ||
    previousState === MovementState.DECELERATING
  ) {
    return MovementState.DECELERATING;
  }
  return MovementState.GLIDE;
};

export const updateHyperCasualLocomotionTelemetry = (
  locomotion: SwimmerLocomotionData,
  velocityX: number
): void => {
  'worklet';
  const previousState =
    locomotion.previousMovementState ?? locomotion.movementState;
  locomotion.previousMovementState = locomotion.movementState;
  locomotion.movementState = deriveMovementStateFromVelocity(
    velocityX,
    previousState
  );
  locomotion.pivotLockoutTimer = 0;
  locomotion.pivotTargetDirection = 0;
  locomotion.anticipationTimer = 0;
  locomotion.dragTimer = 0;
  locomotion.comboTimer = 0;
};
