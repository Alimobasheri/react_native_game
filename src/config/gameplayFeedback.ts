/**
 * Gameplay skill-feedback tuning — Layer A flashes (Phase 1).
 * Worklet-safe: plain constants only.
 */

export const gameplayFeedbackTuning = {
  /** Master kill switch for near-miss flashes and bonuses. */
  ENABLED: true,
  /** clearance01 at or below this counts as near-pin (matches swimmerWaterFxTuning). */
  NEAR_PIN_CLEARANCE01: 0.35,
  /** Minimum ms between near-miss events. */
  NEAR_MISS_COOLDOWN_MS: 900,
  /** Max near-miss bonus events per run. */
  NEAR_MISS_MAX_PER_RUN: 20,
  NEAR_MISS_BONUS_MIN: 10,
  NEAR_MISS_BONUS_MAX: 25,
  /** Probability of NICE! vs CLOSE! (0..1). */
  NICE_ALT_WEIGHT: 0.3,
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
  /** Bonus text offset from word anchor (reference px). */
  BONUS_OFFSET_X_REF_PX: 72,
  BONUS_OFFSET_Y_REF_PX: -8,
  /** Vertical offset above swimmer for flash anchor (reference px). */
  ANCHOR_ABOVE_SWIMMER_REF_PX: 56,
} as const;

export const gameplayFeedbackCopy = {
  NEAR_MISS: 'CLOSE!',
  NEAR_MISS_ALT: 'NICE!',
} as const;
