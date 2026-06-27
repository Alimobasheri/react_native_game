/**
 * Procedural mesh squash/stretch tuning (worklet-safe).
 * Rigid slab during normal swimming; exaggerated squash only when pinned.
 */

export const swimmerDeformationTuning = {
  /** ANTICIPATION — brief load widen (not rubbery squeeze). */
  ANTICIPATION_SCALE_X: 1.045,
  ANTICIPATION_SCALE_Y: 0.97,
  /** STRIKE — minimal stretch; lean comes from rotation. */
  STRIKE_SCALE_X: 0.99,
  STRIKE_SCALE_Y: 1.02,
  /** PIVOT_BRAKE — forward shovel compression. */
  PIVOT_BRAKE_SCALE_X: 1.06,
  PIVOT_BRAKE_SCALE_Y: 0.95,
  /** PINNED / game-over — comedic squash. */
  PINNED_SCALE_X: 1.35,
  PINNED_SCALE_Y: 0.6,
  /** IDLE buoyancy sine amplitude on scaleX (fallback when no breath sync). */
  IDLE_BUOYANCY_AMPLITUDE: 0.0075,
  /** IDLE breath-synced puff (driven by SwimmerLifeSystem envelope). */
  IDLE_BREATH_SCALE_X: 0.032,
  IDLE_BREATH_SCALE_Y: 0.022,
  IDLE_SCALE_Y: 0.992,
  /** Retain base for scale interpolation: blend = 1 - pow(base, dt). */
  INTERP_RETAIN_BASE: 0.001,
} as const;
