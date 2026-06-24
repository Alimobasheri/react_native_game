/**
 * Procedural mesh squash/stretch tuning (worklet-safe).
 * Mass volume conservation uses scaleX * scaleY = 1 in the deformation engine.
 */

export const swimmerDeformationTuning = {
  /** ANTICIPATION horizontal squeeze (vertical stretch via 1 / scaleX). */
  ANTICIPATION_SCALE_X: 0.85,
  /** PIVOT_BRAKE horizontal compression. */
  PIVOT_BRAKE_SCALE_X: 0.75,
  /** Reference |velocityX| for STRIKE stretch normalization (pixels/s). */
  STRIKE_SPEED_REFERENCE: 500,
  /** Max fractional stretch added on top of 1.0 during STRIKE. */
  STRIKE_SPEED_FACTOR_CAP: 0.3,
  /** IDLE buoyancy sine amplitude on scaleX. */
  IDLE_BUOYANCY_AMPLITUDE: 0.02,
  /** Retain base for scale interpolation: blend = 1 - pow(base, dt). */
  INTERP_RETAIN_BASE: 0.001,
} as const;
