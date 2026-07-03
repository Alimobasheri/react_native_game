/**
 * In-run stage title overlays (intro / done / next stage).
 * Worklet-safe.
 */

export const stageOverlayTuning = {
  INTRO_MS: 2200,
  DONE_MS: 2400,
  NEXT_MS: 2200,
  INTRO_FONT_REF_PX: 34,
  DONE_FONT_REF_PX: 48,
  NEXT_FONT_REF_PX: 40,
  /** Always-on current stage chip (top center). */
  PERSISTENT_FONT_REF_PX: 22,
  PERSISTENT_TOP_REF_PX: 52,
  /** Paragraph layout width for centered stage strings. */
  CENTER_TEXT_MAX_WIDTH_REF_PX: 360,
  /** Top-center done banner offset from safe top (reference px). */
  DONE_TOP_REF_PX: 72,
} as const;
