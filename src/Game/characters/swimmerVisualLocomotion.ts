import { MovementState } from './characterMovementStates';
import type { ICharacterProfile } from './characterProfileTypes';
import { clearance01FromPx } from './swimmerClearance';
import { swimmerVisualTuning } from '@/config/swimmerVisualTuning';
import {
  swimmerCoastPreset,
  swimmerCoastPresets,
  swimmerPhysicsTuning,
  tapInputTuning,
} from '@/config/swimmerTuning';
import {
  computePinnedAngleInterpPerSec,
  computePinnedVisualTargetAngleDeg,
  shouldEnablePinnedMomentumCoast,
} from '@/Game/characters/swimmerPinnedLocomotion';
import type { SpeedTier, SwimmerLocomotionData } from '@/Game/ecs-components/Swimmer';

import { VisualStrokePhase } from './visualStrokePhase';

const clamp01 = (value: number): number => {
  'worklet';
  return Math.max(0, Math.min(1, value));
};

const lerp = (a: number, b: number, t: number): number => {
  'worklet';
  return a + (b - a) * t;
};

const getOpenWaterMaxAngleDeg = (tier: SpeedTier): number => {
  'worklet';
  return swimmerVisualTuning.OPEN_WATER_MAX_ANGLE_TIER[tier - 1];
};

/** Clearance-aware target lean in degrees (unsigned magnitude). */
export const computeClearanceAwareAngleDeg = (
  velocityX: number,
  tier: SpeedTier,
  clearance01: number
): number => {
  'worklet';
  const openWaterMax = getOpenWaterMaxAngleDeg(tier);
  const speed01 = clamp01(
    Math.abs(velocityX) / swimmerVisualTuning.MAX_VISUAL_SPEED
  );
  const desiredAngle = lerp(
    swimmerVisualTuning.MIN_SPEED_ANGLE_DEG,
    openWaterMax,
    speed01
  );
  const maxAngleByClearance = lerp(
    swimmerVisualTuning.NARROW_GAP_MAX_ANGLE_DEG,
    openWaterMax,
    clearance01
  );
  return Math.min(desiredAngle, maxAngleByClearance);
};

/** Old hyper-casual inchworm lean: speed-scaled max tilt with clearance cap. */
export const computeVelocityLedAngleDeg = (
  velocityX: number,
  clearance01: number
): number => {
  'worklet';
  const fullTiltSpeed =
    swimmerPhysicsTuning.MAX_HORIZONTAL_SPEED *
    swimmerPhysicsTuning.FULL_TILT_SPEED_FRACTION;
  const speed01 = clamp01(Math.abs(velocityX) / Math.max(1, fullTiltSpeed));
  const dynamicMaxTilt = lerp(
    swimmerVisualTuning.LOW_SPEED_MAX_TILT_DEG,
    swimmerVisualTuning.HIGH_SPEED_MAX_TILT_DEG,
    speed01
  );
  const tiltNormalized = Math.max(
    -1,
    Math.min(1, velocityX / Math.max(1, fullTiltSpeed))
  );
  const velocityAngleDeg = tiltNormalized * dynamicMaxTilt;
  const maxByClearance = lerp(
    swimmerVisualTuning.NARROW_GAP_MAX_ANGLE_DEG,
    dynamicMaxTilt,
    clearance01
  );
  const absAngle = Math.abs(velocityAngleDeg);
  if (absAngle <= maxByClearance) {
    return velocityAngleDeg;
  }
  return Math.sign(velocityAngleDeg) * maxByClearance;
};

/** Anticipation duration scaled by water speed — 0 at high speed skips straight to stroke. */
export const computeVisualAnticipationDurationSec = (
  normalizedWaterSpeed: number
): number => {
  'worklet';
  const speed01 = clamp01(normalizedWaterSpeed);
  const fadeStart = swimmerVisualTuning.ANTICIPATION_WATER_SPEED_FADE_START;
  const removeAt = swimmerVisualTuning.ANTICIPATION_WATER_SPEED_REMOVE_AT;
  const full = swimmerVisualTuning.ANTICIPATION_DURATION_SEC;

  if (speed01 >= removeAt || full <= 0) {
    return 0;
  }
  if (speed01 <= fadeStart) {
    return full;
  }
  const t = (removeAt - speed01) / Math.max(0.0001, removeAt - fadeStart);
  return full * t;
};

const enterVisualAnticipationOrStroke = (
  locomotion: SwimmerLocomotionData,
  anticipationSec: number
): void => {
  'worklet';
  locomotion.visualGlideSettleTimer = 0;
  locomotion.visualRecoveryTimer = 0;
  locomotion.visualPivotTimer = 0;

  if (anticipationSec <= 0) {
    locomotion.visualPhase = VisualStrokePhase.STROKE;
    locomotion.visualAnticipationTimer = 0;
    locomotion.visualStrokeTimer = swimmerVisualTuning.STROKE_DURATION_SEC;
    return;
  }

  locomotion.visualPhase = VisualStrokePhase.ANTICIPATION;
  locomotion.visualAnticipationTimer = anticipationSec;
  locomotion.visualStrokeTimer = 0;
};

export const beginVisualStroke = (
  locomotion: SwimmerLocomotionData,
  direction: 1 | -1,
  tier: SpeedTier,
  normalizedWaterSpeed = 0
): void => {
  'worklet';
  locomotion.visualStrokeDirection = direction;
  locomotion.visualStrokeTier = tier;
  enterVisualAnticipationOrStroke(
    locomotion,
    computeVisualAnticipationDurationSec(normalizedWaterSpeed)
  );
  locomotion.targetAngleDeg =
    direction * swimmerVisualTuning.MIN_SPEED_ANGLE_DEG;
};

export const beginVisualPivot = (locomotion: SwimmerLocomotionData): void => {
  'worklet';
  locomotion.visualPhase = VisualStrokePhase.PIVOT;
  locomotion.visualPivotTimer = swimmerVisualTuning.PIVOT_VISUAL_DURATION_SEC;
  locomotion.visualAnticipationTimer = 0;
  locomotion.visualStrokeTimer = 0;
  locomotion.visualGlideSettleTimer = 0;
  locomotion.visualRecoveryTimer = 0;
};

const advanceVisualPhaseTimers = (
  locomotion: SwimmerLocomotionData,
  dt: number,
  normalizedWaterSpeed: number
): void => {
  'worklet';
  if ((locomotion.visualAnticipationTimer ?? 0) > 0) {
    const next = locomotion.visualAnticipationTimer! - dt;
    locomotion.visualAnticipationTimer = next > 0 ? next : 0;
    if (locomotion.visualAnticipationTimer <= 0) {
      locomotion.visualPhase = VisualStrokePhase.STROKE;
      locomotion.visualStrokeTimer = swimmerVisualTuning.STROKE_DURATION_SEC;
    }
    return;
  }

  if ((locomotion.visualStrokeTimer ?? 0) > 0) {
    const next = locomotion.visualStrokeTimer! - dt;
    locomotion.visualStrokeTimer = next > 0 ? next : 0;
    if (locomotion.visualStrokeTimer <= 0) {
      locomotion.visualPhase = VisualStrokePhase.GLIDE;
      locomotion.visualGlideSettleTimer =
        swimmerVisualTuning.GLIDE_VISUAL_SETTLE_SEC;
    }
    return;
  }

  if ((locomotion.visualGlideSettleTimer ?? 0) > 0) {
    const next = locomotion.visualGlideSettleTimer! - dt;
    locomotion.visualGlideSettleTimer = next > 0 ? next : 0;
    if (locomotion.visualGlideSettleTimer <= 0) {
      locomotion.visualPhase = VisualStrokePhase.RECOVERY;
      locomotion.visualRecoveryTimer =
        swimmerVisualTuning.RECOVERY_DURATION_SEC;
    }
    return;
  }

  if ((locomotion.visualRecoveryTimer ?? 0) > 0) {
    const next = locomotion.visualRecoveryTimer! - dt;
    locomotion.visualRecoveryTimer = next > 0 ? next : 0;
    if (locomotion.visualRecoveryTimer <= 0) {
      locomotion.visualPhase = VisualStrokePhase.IDLE;
    }
    return;
  }

  if ((locomotion.visualPivotTimer ?? 0) > 0) {
    const next = locomotion.visualPivotTimer! - dt;
    locomotion.visualPivotTimer = next > 0 ? next : 0;
    if (locomotion.visualPivotTimer <= 0) {
      enterVisualAnticipationOrStroke(
        locomotion,
        computeVisualAnticipationDurationSec(normalizedWaterSpeed)
      );
    }
  }
};

/** Maps visual stroke phase to deformation state (visual-only; no physics fallback). */
export const visualPhaseToDeformationState = (
  visualPhase: VisualStrokePhase,
  _physicsState: MovementState,
  isPinned: boolean
): MovementState | 'PINNED' => {
  'worklet';
  if (isPinned) {
    return 'PINNED';
  }
  switch (visualPhase) {
    case VisualStrokePhase.ANTICIPATION:
      return MovementState.ANTICIPATION;
    case VisualStrokePhase.STROKE:
      return MovementState.STRIKE;
    case VisualStrokePhase.PIVOT:
      return MovementState.PIVOT_BRAKE;
    case VisualStrokePhase.RECOVERY:
      return MovementState.DECELERATING;
    case VisualStrokePhase.GLIDE:
      return MovementState.GLIDE;
    case VisualStrokePhase.IDLE:
    default:
      return MovementState.IDLE;
  }
};

export const updateSwimmerVisualLocomotion = (
  _profile: ICharacterProfile,
  locomotion: SwimmerLocomotionData,
  velocityX: number,
  clearancePx: number,
  columnWidth: number,
  dt: number,
  startReady: boolean,
  normalizedWaterSpeed = 0,
  isPinned = false,
  tapDirection: -1 | 0 | 1 = 0
): void => {
  'worklet';
  const safeDt = dt > 0 ? dt : 0;
  const currentAngleDeg = locomotion.visualAngleDeg ?? locomotion.currentAngleDeg ?? 0;
  const pinnedMomentumCoast =
    isPinned &&
    shouldEnablePinnedMomentumCoast(currentAngleDeg, velocityX);

  if (!startReady) {
    advanceVisualPhaseTimers(locomotion, safeDt, normalizedWaterSpeed);
  }

  const targetClearance01 = clearance01FromPx(clearancePx, columnWidth);
  const smooth = Math.min(
    1,
    swimmerVisualTuning.CLEARANCE_ANGLE_SMOOTH_PER_SEC * safeDt
  );
  const prevClearance01 = locomotion.clearance01 ?? 1;
  locomotion.clearance01 = prevClearance01 + (targetClearance01 - prevClearance01) * smooth;

  const direction =
    locomotion.visualStrokeDirection ?? locomotion.facingDirection;
  const signedVelocity =
    Math.abs(velocityX) > 1 ? velocityX : direction * Math.abs(velocityX);

  const clearance01 = locomotion.clearance01 ?? 1;
  const rapidTapStreak = locomotion.rapidTapStreak ?? 0;
  const isCramped =
    targetClearance01 <= tapInputTuning.NARROW_ESCAPE_CLEARANCE01_THRESHOLD;
  const angleClearance01 =
    isCramped && rapidTapStreak >= 1 ? 1 : clearance01;
  let targetAngleDeg = computeVelocityLedAngleDeg(
    signedVelocity,
    angleClearance01
  );

  // Subtle phase nudge on top of velocity lean — deformation carries most stroke juice.
  if (
    !isPinned &&
    locomotion.visualPhase === VisualStrokePhase.PIVOT
  ) {
    const pivotLean =
      -swimmerVisualTuning.NARROW_GAP_MAX_ANGLE_DEG * locomotion.facingDirection;
    targetAngleDeg = lerp(targetAngleDeg, pivotLean, 0.55);
  }

  if (isPinned) {
    targetAngleDeg = computePinnedVisualTargetAngleDeg(
      currentAngleDeg,
      targetAngleDeg,
      velocityX,
      pinnedMomentumCoast,
      locomotion.facingDirection,
      tapDirection
    );
  }

  locomotion.targetAngleDeg = targetAngleDeg;

  const defaultInterp = Math.min(
    1,
    swimmerCoastPresets[swimmerCoastPreset].VELOCITY_LEAN_SMOOTH_PER_SEC * safeDt
  );
  const pinnedInterp = Math.min(
    1,
    computePinnedAngleInterpPerSec(currentAngleDeg, pinnedMomentumCoast) * safeDt
  );
  const interpStep =
    isPinned &&
      (pinnedMomentumCoast ||
        Math.abs(currentAngleDeg) >=
        swimmerPhysicsTuning.PINNED_EDGE_SLIDE_MIN_ANGLE_DEG)
      ? pinnedInterp
      : defaultInterp;
  const delta = targetAngleDeg - currentAngleDeg;
  locomotion.visualAngleDeg = currentAngleDeg + delta * interpStep;
  locomotion.currentAngleDeg = locomotion.visualAngleDeg;
};
