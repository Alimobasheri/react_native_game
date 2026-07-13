import { hyperCasualPhysicsTuning, swimmerPhysicsTuning } from '@/config/swimmerTuning';

const clamp01 = (value: number): number => {
  'worklet';
  return Math.max(0, Math.min(1, value));
};

const lerp = (a: number, b: number, t: number): number => {
  'worklet';
  return a + (b - a) * t;
};

/** Stretched body lean while under a ceiling pin. */
export const isPinnedHighAngleLean = (angleDeg: number): boolean => {
  'worklet';
  return (
    Math.abs(angleDeg) >= swimmerPhysicsTuning.PINNED_EDGE_SLIDE_MIN_ANGLE_DEG
  );
};

const hasPinnedMomentum = (velocityX: number): boolean => {
  'worklet';
  return (
    Math.abs(velocityX) >= swimmerPhysicsTuning.PINNED_MOMENTUM_COAST_MIN_SPEED_PX
  );
};

/**
 * Pinned-only lip slide: high lean AND leftover speed — not free-swim.
 * Used for collision assist / angle stick while already pinned.
 */
export const shouldEnablePinnedMomentumCoast = (
  angleDeg: number,
  velocityX: number
): boolean => {
  'worklet';
  return isPinnedHighAngleLean(angleDeg) && hasPinnedMomentum(velocityX);
};

/** @deprecated Prefer shouldEnablePinnedMomentumCoast */
export const shouldEnablePinnedEdgeSlide = (
  angleDeg: number,
  velocityX: number,
  _tapThisFrame: boolean,
  _tapDirection: -1 | 0 | 1
): boolean => {
  'worklet';
  return shouldEnablePinnedMomentumCoast(angleDeg, velocityX);
};

/**
 * Hyper-casual coast drag scale while pinned only.
 * 1 = full free-swim friction. High lean → lighter, never zero.
 */
export const computePinnedCoastDragMultiplier = (angleDeg: number): number => {
  'worklet';
  const angle01 = clamp01(
    Math.abs(angleDeg) /
      Math.max(1, swimmerPhysicsTuning.PINNED_VELOCITY_DAMPING_ANGLE_REF_DEG)
  );
  return lerp(
    1,
    swimmerPhysicsTuning.PINNED_EDGE_SLIDE_COAST_DRAG_MULTIPLIER,
    angle01
  );
};

/** Hold stretched lean while pinned — do not snap upright mid-slide. */
export const computePinnedVisualTargetAngleDeg = (
  currentAngleDeg: number,
  velocityLedTargetDeg: number,
  velocityX: number,
  momentumCoast: boolean,
  facingDirection: 1 | -1,
  tapDirection: -1 | 0 | 1
): number => {
  'worklet';
  if (!isPinnedHighAngleLean(currentAngleDeg) && !momentumCoast) {
    return velocityLedTargetDeg;
  }

  const leanDir =
    tapDirection !== 0
      ? tapDirection
      : Math.abs(velocityX) > hyperCasualPhysicsTuning.IDLE_SPEED_THRESHOLD
        ? (Math.sign(velocityX) as 1 | -1)
        : facingDirection;
  const minLean = Math.max(
    Math.abs(currentAngleDeg),
    swimmerPhysicsTuning.PINNED_EDGE_SLIDE_MIN_ANGLE_DEG
  );
  const velocityLean = Math.abs(velocityLedTargetDeg);
  const targetMag = Math.max(minLean, velocityLean, Math.abs(currentAngleDeg));
  return leanDir * targetMag;
};

export const computePinnedAngleInterpPerSec = (
  currentAngleDeg: number,
  momentumCoast: boolean
): number => {
  'worklet';
  if (!isPinnedHighAngleLean(currentAngleDeg) && !momentumCoast) {
    return 0;
  }
  return swimmerPhysicsTuning.PINNED_ANGLE_STICK_PER_SEC;
};

/** Extending press slab pushes pinned swimmer laterally with the steel surface. */
export const blendPinnedSlabSurfaceVelocityX = (
  velocityX: number,
  slabSurfaceVelocityX: number,
  deltaSeconds: number
): number => {
  'worklet';
  if (Math.abs(slabSurfaceVelocityX) < 0.5) {
    return velocityX;
  }
  const response =
    1 -
    Math.exp(
      -swimmerPhysicsTuning.PINNED_SLAB_SURFACE_RESPONSE_PER_SECOND * deltaSeconds
    );
  return velocityX + (slabSurfaceVelocityX - velocityX) * response;
};
