/**
 * Gameplay flash VFX layout — Layer A presentation (Phase 1).
 * Skill-moment copy and detection: see skillFeedback.ts.
 * Worklet-safe: plain constants only.
 */

export const gameplayFeedbackTuning = {
  /** Flash float-up + fade duration. */
  FLASH_DURATION_MS: 400,
  /** Reference-space vertical drift (scaled at runtime). */
  FLASH_RISE_REF_PX: 48,
  /** Reference-space font size (scaled at runtime). */
  FLASH_FONT_REF_PX: 42,
  FLASH_STROKE_WIDTH: 2.5,
  /** Concurrent flash slots: 3 word + 2 bonus. */
  FLASH_POOL_SIZE: 5,
  WORD_SLOT_COUNT: 3,
  BONUS_SLOT_COUNT: 2,
  /** Skia circle behind word flash. */
  SHOW_SPARK_RING: true,
  SPARK_RADIUS_FONT_MULT: 0.85,
  SPARK_STROKE_WIDTH: 3,
  /** Bonus text offset from word anchor (reference px) — stacked above word. */
  BONUS_OFFSET_X_REF_PX: 0,
  BONUS_OFFSET_Y_REF_PX: -44,
  /** Vertical offset above swimmer for flash anchor (reference px). */
  ANCHOR_ABOVE_SWIMMER_REF_PX: 56,
  /** Vertical gap between stacked concurrent word flashes (reference px). */
  WORD_STACK_GAP_REF_PX: 36,
} as const;

export const gameplayFeedbackCopy = {
  FLOW_STREAK_LABEL: 'Flow Streak',
} as const;
