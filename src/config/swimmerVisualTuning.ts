/**
 * Visual-only swimmer tuning — angles, stroke timing, mesh vs collider split.
 * Safe to import from Reanimated worklets (plain data only).
 */

export const swimmerVisualTuning = {
  /** Expressive render mesh width as a fraction of one grid column. */
  VISUAL_WIDTH_COLUMN_RATIO: 0.65,
  VISUAL_HEIGHT_TO_WIDTH_RATIO: 1.8,

  /** Fair navigation collider — upright core, decoupled from visual mesh / stroke scale. */
  COLLIDER_WIDTH_COLUMN_RATIO: 0.55,
  COLLIDER_HEIGHT_TO_WIDTH_RATIO: 0.95,

  /**
   * Fair ceiling-contact bounds while pinned — taller than navigation collider,
   * never tied to visual squash scale.
   */
  PINNED_COLLIDER_WIDTH_COLUMN_RATIO: 0.55,
  PINNED_COLLIDER_HEIGHT_TO_WIDTH_RATIO: 1.65,

  /** Open-water lean caps per combo tier (degrees). Still clamped by clearance. */
  OPEN_WATER_MAX_ANGLE_TIER: [80, 85, 90] as const,
  /** Max lean when clearance is at or below narrow-gap threshold. */
  NARROW_GAP_MAX_ANGLE_DEG: 14,
  /** Minimum lean at rest / low speed. */
  MIN_SPEED_ANGLE_DEG: 8,
  /** |velocityX| reference for full open-water lean. */
  MAX_VISUAL_SPEED: 520,

  /** Horizontal clearance (px) treated as a one-column gap. */
  NARROW_GAP_CLEARANCE_PX: 52,
  /** Clearance (px) treated as fully open water for angle caps. */
  OPEN_WATER_CLEARANCE_PX: 180,
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

  /** Wake trail spawn interval while gliding fast (seconds). */
  WAKE_SPAWN_INTERVAL_SEC: 0.07,
  WAKE_MIN_SPEED: 80,
} as const;
