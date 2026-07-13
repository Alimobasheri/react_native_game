import { MovementState } from './characterMovementStates';
import type { ICharacterProfile } from './characterProfileTypes';
import { beginVisualPivot, beginVisualStroke } from './swimmerVisualLocomotion';
import type { SpeedTier, SwimmerLocomotionData } from '@/Game/ecs-components/Swimmer';
import { clearance01FromPx } from './swimmerClearance';
import {
  hyperCasualPhysicsTuning,
  swimmerPhysicsTuning,
  swimmerCoastPreset,
  swimmerCoastPresets,
  tapInputTuning,
  type SwimmerCoastPresetValues,
} from '@/config/swimmerTuning';

const REFERENCE_FRAME_DT = 1 / 60;

const clamp01 = (value: number): number => {
  'worklet';
  return Math.max(0, Math.min(1, value));
};

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
  preset?: SwimmerCoastPresetValues,
  dragMultiplier = 1
): number => {
  'worklet';
  const coastPreset = preset ?? swimmerCoastPresets[swimmerCoastPreset];
  const safeDt = clampFrameDt(dt);
  const retainPerSecond = getRetainPerSecond(normalizedWaterSpeed, coastPreset);
  const adjustedRetain = Math.pow(retainPerSecond, profile.dragScale);
  const retainPerFrame = Math.pow(Math.max(0.0001, adjustedRetain), safeDt);
  const easedRetain = 1 - (1 - retainPerFrame) * clamp01(dragMultiplier);
  let nextVelocityX = velocityX * easedRetain;

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

type CoastStepParams = {
  dragFactor: number;
  currentResponse: number;
  waterCurrentVelocityX: number;
  safeDt: number;
};

/** Precompute per-tap coast constants — one pow + one exp instead of per frame. */
const computeCoastStepParams = (
  normalizedWaterSpeed: number,
  waterCurrentVelocityX: number,
  profile: ICharacterProfile,
  preset: SwimmerCoastPresetValues,
  frameDt: number
): CoastStepParams => {
  'worklet';
  const safeDt = clampFrameDt(frameDt);
  const retainPerSecond = getRetainPerSecond(normalizedWaterSpeed, preset);
  const adjustedRetain = Math.pow(retainPerSecond, profile.dragScale);
  const dragFactor = Math.pow(Math.max(0.0001, adjustedRetain), safeDt);
  const currentResponse =
    (1 -
      Math.exp(
        -swimmerPhysicsTuning.WATER_CURRENT_RESPONSE_PER_SECOND * safeDt
      )) *
    preset.TAP_MODE_CURRENT_RESPONSE_SCALE;
  return {
    dragFactor,
    currentResponse,
    waterCurrentVelocityX,
    safeDt,
  };
};

/** Single coast frame — mirrors integratePhysicsFrame with precomputed coefficients. */
const integrateCoastStep = (
  velocityX: number,
  params: CoastStepParams
): number => {
  'worklet';
  let vx = velocityX * params.dragFactor;
  if (Math.abs(vx) < hyperCasualPhysicsTuning.VELOCITY_ZERO_EPSILON) {
    vx = 0;
  }
  vx +=
    (params.waterCurrentVelocityX - vx) * params.currentResponse;
  return vx;
};

/**
 * Fast coast displacement — exact match to simulateTapDisplacementPx but precomputes
 * drag/current coefficients once (~120 cheap mul-adds vs ~120 full pow+exp frames).
 */
export const computeCoastDisplacementPx = (
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
  const params = computeCoastStepParams(
    normalizedWaterSpeed,
    waterCurrentVelocityX,
    profile,
    preset,
    frameDt
  );
  const v0 = startVelocityX + tapDirection * impulseMagnitude;
  let vx = v0;
  let displacement = 0;
  const maxFrames = Math.ceil(maxSeconds / Math.max(0.0001, params.safeDt));
  const epsilon = hyperCasualPhysicsTuning.VELOCITY_ZERO_EPSILON;

  for (let frame = 0; frame < maxFrames; frame++) {
    vx = integrateCoastStep(vx, params);
    displacement += vx * params.safeDt;
    if (Math.abs(vx) < epsilon) {
      break;
    }
  }
  return displacement;
};

/** Reference integrator — kept for tests; production uses computeCoastDisplacementPx. */
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

export type PinnedEscapeContext = {
  swimmerX: number;
  ceilingMinX: number;
  ceilingMaxX: number;
};

export const buildPinnedEscapeContext = (
  swimmerX: number,
  columnWidth: number,
  containerCenterX: number,
  containerWidth: number,
  ceilingMinX?: number,
  ceilingMaxX?: number
): PinnedEscapeContext => {
  'worklet';
  if (ceilingMinX !== undefined && ceilingMaxX !== undefined) {
    return { swimmerX, ceilingMinX, ceilingMaxX };
  }
  const containerLeft = containerCenterX - containerWidth / 2;
  const columnCount = Math.max(1, Math.round(containerWidth / columnWidth));
  const col = Math.max(
    0,
    Math.min(columnCount - 1, Math.floor((swimmerX - containerLeft) / columnWidth))
  );
  const minX = containerLeft + col * columnWidth;
  return { swimmerX, ceilingMinX: minX, ceilingMaxX: minX + columnWidth };
};

/** Horizontal coast target while pinned — slide out of the ceiling column, not gap slack. */
export const estimatePinnedEscapeTravelPx = (
  swimmerX: number,
  tapDirection: 1 | -1,
  ceilingMinX: number,
  ceilingMaxX: number,
  columnWidth: number,
  streakMultiplier: number
): number => {
  'worklet';
  const edgeX = tapDirection > 0 ? ceilingMaxX : ceilingMinX;
  const distToEdge = Math.abs(swimmerX - edgeX);
  const exitSlack =
    columnWidth * swimmerPhysicsTuning.PINNED_ESCAPE_EXIT_SLACK_COLUMN_FRACTION;
  const minTravel =
    columnWidth * swimmerPhysicsTuning.PINNED_ESCAPE_MIN_TAP_TRAVEL_COLUMN_FRACTION;
  return Math.max(distToEdge + exitSlack, minTravel) * streakMultiplier;
};

/** Minimum horizontal displacement for pinned tap collision retry. */
export const computePinnedEscapeMinSlidePx = (
  swimmerX: number,
  tapDirection: 1 | -1,
  ceilingMinX: number,
  ceilingMaxX: number,
  columnWidth: number
): number => {
  'worklet';
  const edgeX = tapDirection > 0 ? ceilingMaxX : ceilingMinX;
  const distToEdge = Math.abs(swimmerX - edgeX);
  const exitSlack =
    columnWidth * swimmerPhysicsTuning.PINNED_ESCAPE_EXIT_SLACK_COLUMN_FRACTION;
  const minSlide =
    columnWidth * swimmerPhysicsTuning.PINNED_ESCAPE_MIN_SLIDE_COLUMN_FRACTION;
  return Math.max(minSlide, distToEdge + exitSlack);
};

/** Streak multiplier escalated faster during narrow-gap escape (tap 2+). */
export const computeNarrowEscapeStreakMultiplier = (
  streakMultiplier: number,
  rapidTapStreak: number
): number => {
  'worklet';
  if (rapidTapStreak < 1) {
    return streakMultiplier;
  }
  const excess = Math.max(0, streakMultiplier - 1);
  const boosted =
    1 +
    excess * tapInputTuning.NARROW_ESCAPE_STREAK_RESPONSE +
    rapidTapStreak * tapInputTuning.NARROW_ESCAPE_STREAK_STEP;
  return Math.min(tapInputTuning.RAPID_TAP_MAX_MULT, boosted);
};

export const isCrampedClearancePx = (
  clearancePx: number,
  columnWidth: number
): boolean => {
  'worklet';
  return (
    clearance01FromPx(clearancePx, columnWidth) <=
    tapInputTuning.NARROW_ESCAPE_CLEARANCE01_THRESHOLD
  );
};

export const estimateTravelPx = (
  columnWidth: number,
  streakMultiplier: number,
  preset: SwimmerCoastPresetValues,
  clearancePx: number,
  colliderWidthPx: number,
  rapidTapStreak = 0
): number => {
  'worklet';
  const openTarget =
    preset.TAP_TRAVEL_COLUMN_MULTIPLIER * Math.max(1, columnWidth);
  const slackPx = Math.max(0, clearancePx - colliderWidthPx);
  const narrowTarget = slackPx * 0.96;
  const minTarget = columnWidth * 0.12;
  const cramped = isCrampedClearancePx(clearancePx, columnWidth);
  const isEscapeTap = cramped && rapidTapStreak >= 1;

  if (isEscapeTap) {
    const escapeStreak = computeNarrowEscapeStreakMultiplier(
      streakMultiplier,
      rapidTapStreak
    );
    return openTarget * escapeStreak;
  }

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
  colliderWidthPx: number,
  targetPxOverride?: number,
  rapidTapStreak = 0
): number => {
  'worklet';
  const targetPx =
    targetPxOverride ??
    estimateTravelPx(
      columnWidth,
      streakMultiplier,
      preset,
      clearancePx,
      colliderWidthPx,
      rapidTapStreak
    );
  const probeImpulse = 120;
  const probeTravel = Math.abs(
    computeCoastDisplacementPx(
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

/** |velocityX| at or above which an opposite tap soft-brakes instead of hard-flipping. */
export const getSoftReverseMinCoastSpeedPx = (): number => {
  'worklet';
  return (
    swimmerPhysicsTuning.MAX_HORIZONTAL_SPEED *
    hyperCasualPhysicsTuning.SOFT_REVERSE_SPEED_FRACTION
  );
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
  colliderWidthPx: number,
  pinnedEscape?: PinnedEscapeContext
): HyperCasualTapResult => {
  'worklet';
  const preset = swimmerCoastPresets[swimmerCoastPreset];
  const visualStrokeTier = locomotion.visualStrokeTier ?? locomotion.currentTier;
  const travelTargetPx =
    pinnedEscape !== undefined
      ? estimatePinnedEscapeTravelPx(
          pinnedEscape.swimmerX,
          tapDirection,
          pinnedEscape.ceilingMinX,
          pinnedEscape.ceilingMaxX,
          columnWidth,
          streakMultiplier
        )
      : undefined;
  const rapidTapStreak = locomotion.rapidTapStreak ?? 0;
  const forwardImpulseMag = computeForwardTapImpulseMagnitude(
    columnWidth,
    normalizedWaterSpeed,
    streakMultiplier,
    profile,
    waterCurrentVelocityX,
    tapDirection,
    preset,
    clearancePx,
    colliderWidthPx,
    travelTargetPx,
    rapidTapStreak
  );

  const previousFacing = locomotion.facingDirection;
  const absVelocityX = Math.abs(velocityX);
  const isOppositeTap =
    pinnedEscape === undefined && tapDirection !== previousFacing;
  const isCoastingWithFacing =
    absVelocityX > hyperCasualPhysicsTuning.VELOCITY_ZERO_EPSILON &&
    Math.sign(velocityX) === previousFacing;
  const softReverseThresholdPx = getSoftReverseMinCoastSpeedPx();
  const isHighSpeedOpposite =
    isOppositeTap &&
    isCoastingWithFacing &&
    absVelocityX >= softReverseThresholdPx;
  const isLowSpeedOppositeFlip =
    isOppositeTap && isCoastingWithFacing && !isHighSpeedOpposite;

  let tapImpulseApplied = 0;
  let nextVelocityX = velocityX;

  locomotion.facingDirection = tapDirection;
  locomotion.currentTier = visualStrokeTier;

  if (isHighSpeedOpposite) {
    const brakeImpulse =
      tapDirection *
      forwardImpulseMag *
      hyperCasualPhysicsTuning.REVERSE_IMPULSE_SCALE;
    tapImpulseApplied = brakeImpulse;
    nextVelocityX = brakeImpulse;
    beginVisualPivot(locomotion);
  } else if (isLowSpeedOppositeFlip) {
    const flipImpulse = tapDirection * forwardImpulseMag;
    tapImpulseApplied = flipImpulse;
    nextVelocityX = flipImpulse;
    beginVisualStroke(
      locomotion,
      tapDirection,
      visualStrokeTier,
      normalizedWaterSpeed
    );
  } else {
    const forwardImpulse = tapDirection * forwardImpulseMag;
    tapImpulseApplied = forwardImpulse;
    nextVelocityX += forwardImpulse;
    beginVisualStroke(
      locomotion,
      tapDirection,
      visualStrokeTier,
      normalizedWaterSpeed
    );
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
    isSoftReverseTap: isHighSpeedOpposite,
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
