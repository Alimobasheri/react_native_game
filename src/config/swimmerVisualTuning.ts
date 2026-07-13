/**
 * Visual-only swimmer tuning — angles, stroke timing, mesh vs collider split.
 * Safe to import from Reanimated worklets (plain data only).
 */

export const swimmerVisualTuning = {
  /** Expressive render mesh width as a fraction of one grid column. */
  VISUAL_WIDTH_COLUMN_RATIO: 0.65,
  VISUAL_HEIGHT_TO_WIDTH_RATIO: 1.8,

  /** Navigation hitbox width — narrower than visual mesh (forgiving in gaps). */
  COLLIDER_WIDTH_COLUMN_RATIO: 0.63,
  /** Navigation hitbox height = collider width × this (0.95 ≈ slightly wider than tall). */
  COLLIDER_HEIGHT_TO_WIDTH_RATIO: 0.85,

  /**
   * Ceiling-pin collider — narrower and taller for sliding under blocks.
   * height = (column × PINNED_COLLIDER_WIDTH_COLUMN_RATIO) × PINNED_COLLIDER_HEIGHT_TO_WIDTH_RATIO
   */
  PINNED_COLLIDER_WIDTH_COLUMN_RATIO: 0.63,
  PINNED_COLLIDER_HEIGHT_TO_WIDTH_RATIO: 0.85,

  /** Open-water lean caps per combo tier (degrees). Still clamped by clearance. */
  OPEN_WATER_MAX_ANGLE_TIER: [35, 45, 60] as const,
  /** Max lean when clearance is at or below narrow-gap threshold. */
  NARROW_GAP_MAX_ANGLE_DEG: 40,
  /** Minimum lean at rest / low speed. */
  MIN_SPEED_ANGLE_DEG: 8,
  /** |velocityX| reference for legacy tier path and FX intensity. */
  MAX_VISUAL_SPEED: 520,

  /**
   * Speed-scaled inchworm lean caps (degrees).
   * Low |vx| → modest tilt for gap entry; high |vx| → dramatic up to 90°.
   */
  LOW_SPEED_MAX_TILT_DEG: 58,
  HIGH_SPEED_MAX_TILT_DEG: 90,

  /** Horizontal clearance at or below one column → fully narrow lean cap. */
  NARROW_GAP_CLEARANCE_COLUMNS: 1,
  /** Horizontal clearance at or above this many columns → fully open lean cap. */
  OPEN_WATER_CLEARANCE_COLUMNS: 4,
  /** Smoothing rate for clearance-driven angle clamping. */
  CLEARANCE_ANGLE_SMOOTH_PER_SEC: 14,

  /** Visual stroke phase durations (seconds) — decoupled from physics state machine. */
  ANTICIPATION_DURATION_SEC: 0.04,
  /**
   * Normalized water speed (0..1) below which anticipation uses full duration.
   * Above fade start, duration lerps to zero by REMOVE_AT.
   */
  ANTICIPATION_WATER_SPEED_FADE_START: 0.25,
  /** Normalized water speed at/above which anticipation is skipped (jump to stroke). */
  ANTICIPATION_WATER_SPEED_REMOVE_AT: 0.5,
  STROKE_DURATION_SEC: 0.135,
  GLIDE_VISUAL_SETTLE_SEC: 0.26,
  RECOVERY_DURATION_SEC: 0.14,
  PIVOT_VISUAL_DURATION_SEC: 0.15,

  /** Start-ready idle presentation. */
  START_READY_BOB_PX: 4,
  START_READY_ROLL_DEG: 1.8,
  START_READY_BOB_FREQUENCY_HZ: 1.1,

  /** Wake droplet spawn interval during stroke / glide (seconds). */
  WAKE_SPAWN_INTERVAL_SEC: 0.038,
  WAKE_MIN_SPEED: 60,
} as const;
