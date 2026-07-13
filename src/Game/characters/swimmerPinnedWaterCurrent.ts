import { swimmerPhysicsTuning } from '@/config/swimmerTuning';

const clamp01 = (value: number): number => {
  'worklet';
  return Math.max(0, Math.min(1, value));
};

const lerp = (a: number, b: number, t: number): number => {
  'worklet';
  return a + (b - a) * t;
};

/**
 * Extra per-frame velocity bleed while pinned (on top of hyper-casual coast drag).
 * Flat under block → strong stop. High lean → lighter slide, still friction.
 */
export const computePinnedVelocityDamping = (angleDeg: number): number => {
  'worklet';
  const angle01 = clamp01(
    Math.abs(angleDeg) /
      Math.max(1, swimmerPhysicsTuning.PINNED_VELOCITY_DAMPING_ANGLE_REF_DEG)
  );
  return lerp(
    swimmerPhysicsTuning.PINNED_VELOCITY_DAMPING,
    swimmerPhysicsTuning.PINNED_VELOCITY_DAMPING_AT_MAX_ANGLE,
    angle01
  );
};

/**
 * Mirrors SwimmerPhysicsSystem water-advection gate while pinned.
 */
export const computePinnedWaterCurrentResponse = (
  pinned: boolean,
  tapThisFrame: boolean,
  blockAdvection: boolean,
  baseResponse: number
): number => {
  'worklet';
  if (blockAdvection && pinned && !tapThisFrame) {
    return 0;
  }
  if (pinned && tapThisFrame) {
    return baseResponse * swimmerPhysicsTuning.PINNED_TAP_WATER_CURRENT_SCALE;
  }
  return baseResponse;
};
