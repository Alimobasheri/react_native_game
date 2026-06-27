import { MovementState } from './characterMovementStates';
import type { ICharacterProfile } from './characterProfileTypes';
import { clearance01FromPx } from './swimmerClearance';
import { swimmerVisualTuning } from '@/config/swimmerVisualTuning';
import {
  swimmerCoastPreset,
  swimmerCoastPresets,
  swimmerPhysicsTuning,
} from '@/config/swimmerTuning';
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

export const beginVisualStroke = (
  locomotion: SwimmerLocomotionData,
  direction: 1 | -1,
  tier: SpeedTier
): void => {
  'worklet';
  locomotion.visualStrokeDirection = direction;
  locomotion.visualStrokeTier = tier;
  locomotion.visualPhase = VisualStrokePhase.ANTICIPATION;
  locomotion.visualAnticipationTimer =
    swimmerVisualTuning.ANTICIPATION_DURATION_SEC;
  locomotion.visualStrokeTimer = 0;
  locomotion.visualGlideSettleTimer = 0;
  locomotion.visualRecoveryTimer = 0;
  locomotion.visualPivotTimer = 0;
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
  dt: number
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
      locomotion.visualPhase = VisualStrokePhase.ANTICIPATION;
      locomotion.visualAnticipationTimer =
        swimmerVisualTuning.ANTICIPATION_DURATION_SEC;
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
  startReady: boolean
): void => {
  'worklet';
  const safeDt = dt > 0 ? dt : 0;

  if (!startReady) {
    advanceVisualPhaseTimers(locomotion, safeDt);
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
  let targetAngleDeg = computeVelocityLedAngleDeg(signedVelocity, clearance01);

  // Subtle phase nudge on top of velocity lean — deformation carries most stroke juice.
  if (locomotion.visualPhase === VisualStrokePhase.PIVOT) {
    const pivotLean =
      -swimmerVisualTuning.NARROW_GAP_MAX_ANGLE_DEG * locomotion.facingDirection;
    targetAngleDeg = lerp(targetAngleDeg, pivotLean, 0.55);
  }

  locomotion.targetAngleDeg = targetAngleDeg;

  const interpStep = Math.min(
    1,
    swimmerCoastPresets[swimmerCoastPreset].VELOCITY_LEAN_SMOOTH_PER_SEC * safeDt
  );
  const delta = targetAngleDeg - (locomotion.visualAngleDeg ?? 0);
  locomotion.visualAngleDeg = (locomotion.visualAngleDeg ?? 0) + delta * interpStep;
  locomotion.currentAngleDeg = locomotion.visualAngleDeg;
};
