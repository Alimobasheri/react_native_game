/**
 * Gameplay skill-feedback tuning — Layer A flashes (Phase 1).
 * Worklet-safe: plain constants only.
 */

export const gameplayFeedbackTuning = {
  /** Master kill switch for near-miss flashes and bonuses. */
  ENABLED: true,
  /** clearance01 below this counts as near-pin (matches swimmerWaterFxTuning). */
  NEAR_PIN_CLEARANCE01: 0.35,
  /** clearance01 below this → CLOSE!; between this and NEAR_PIN → NICE! */
  CLOSE_CLEARANCE_BAND_MAX: 0.2,
  /** Minimum ms between near-miss events. */
  NEAR_MISS_COOLDOWN_MS: 500,
  /** Max near-miss bonus events per run. */
  NEAR_MISS_MAX_PER_RUN: 20,
  NEAR_MISS_BONUS_MIN: 10,
  NEAR_MISS_BONUS_MAX: 25,
  /** Flash float-up + fade duration. */
  FLASH_DURATION_MS: 400,
  /** Reference-space vertical drift (scaled at runtime). */
  FLASH_RISE_REF_PX: 48,
  /** Reference-space font size (scaled at runtime). */
  FLASH_FONT_REF_PX: 42,
  FLASH_STROKE_WIDTH: 2.5,
  /** Concurrent word/bonus flash slots. */
  FLASH_POOL_SIZE: 4,
  /** Skia circle behind word flash. */
  SHOW_SPARK_RING: true,
  SPARK_RADIUS_FONT_MULT: 0.85,
  SPARK_STROKE_WIDTH: 3,
  /** Bonus text offset from word anchor (reference px) — stacked above word. */
  BONUS_OFFSET_X_REF_PX: 0,
  BONUS_OFFSET_Y_REF_PX: -44,
  /** Vertical offset above swimmer for flash anchor (reference px). */
  ANCHOR_ABOVE_SWIMMER_REF_PX: 56,
} as const;

export const gameplayFeedbackCopy = {
  NEAR_MISS: 'CLOSE!',
  NEAR_MISS_ALT: 'NICE!',
  TAP_STREAK_LABEL: 'Tap Streak!',
} as const;
