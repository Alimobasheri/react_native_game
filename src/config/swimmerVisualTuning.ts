/**
 * Visual-only swimmer tuning — angles, stroke timing, mesh vs collider split.
 * Safe to import from Reanimated worklets (plain data only).
 */

export const swimmerVisualTuning = {
  /** Expressive render mesh width as a fraction of one grid column. */
  VISUAL_WIDTH_COLUMN_RATIO: 0.65,
  VISUAL_HEIGHT_TO_WIDTH_RATIO: 1.8,

  /** Fair navigation collider — upright core, decoupled from visual mesh / stroke scale. */
  COLLIDER_WIDTH_COLUMN_RATIO: 0.9,
  COLLIDER_HEIGHT_TO_WIDTH_RATIO: 0.95,

  /**
   * Fair ceiling-contact bounds while pinned — taller than navigation collider,
   * never tied to visual squash scale.
   */
  PINNED_COLLIDER_WIDTH_COLUMN_RATIO: 0.6,
  PINNED_COLLIDER_HEIGHT_TO_WIDTH_RATIO: 1.8,

  /** Open-water lean caps per combo tier (degrees). Still clamped by clearance. */
  OPEN_WATER_MAX_ANGLE_TIER: [35, 45, 60] as const,
  /** Max lean when clearance is at or below narrow-gap threshold. */
  NARROW_GAP_MAX_ANGLE_DEG: 20,
  /** Minimum lean at rest / low speed. */
  MIN_SPEED_ANGLE_DEG: 8,
  /** |velocityX| reference for full open-water lean. */
  MAX_VISUAL_SPEED: 520,

  /** Horizontal clearance at or below one column → fully narrow lean cap. */
  NARROW_GAP_CLEARANCE_COLUMNS: 1,
  /** Horizontal clearance at or above this many columns → fully open lean cap. */
  OPEN_WATER_CLEARANCE_COLUMNS: 4,
  /** Smoothing rate for clearance-driven angle clamping. */
  CLEARANCE_ANGLE_SMOOTH_PER_SEC: 14,

  /** Visual stroke phase durations (seconds) — decoupled from physics state machine. */
  ANTICIPATION_DURATION_SEC: 0.055,
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
