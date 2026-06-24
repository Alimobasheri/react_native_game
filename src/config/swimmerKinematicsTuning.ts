/**
 * Kinematics controller coupling constants (worklet-safe).
 * Profile-specific physics live on ICharacterProfile; these scale interpolation only.
 */

export const swimmerKinematicsTuning = {
  /** Multiplier applied with profile.baseDrag for angle interpolation speed. */
  ANGLE_INTERP_DRAG_SCALE: 12,
  /** Fraction of tier-1 strike speed used as GLIDE exit threshold. */
  GLIDE_EXIT_SPEED_RATIO: 0.12,
  /** Fraction of GLIDE exit speed used to snap into IDLE from DECELERATING. */
  DECELERATING_IDLE_SPEED_RATIO: 0.15,
  /** Horizontal speed magnitudes below this are treated as zero (pixels/s). */
  VELOCITY_ZERO_EPSILON: 0.5,
  /** Forward momentum threshold (velocity.x * facingDirection) to trigger pivot. */
  PIVOT_FORWARD_MOMENTUM_MIN: 0.1,
  /** Backward shovel dig angle magnitude in degrees. */
  PIVOT_SHOVEL_ANGLE_DEG: 25,
  /** Counter-inertial velocity retain base per pivot-brake frame. */
  PIVOT_BRAKE_RETAIN_PER_FRAME_BASE: 0.01,
  /** Velocity magnitude that completes pivot brake early (pixels/s). */
  PIVOT_COMPLETION_SPEED: 0.05,
  /** Upper bound for per-frame delta time to avoid wild spikes. */
  MAX_FRAME_DT: 0.1,
} as const;
