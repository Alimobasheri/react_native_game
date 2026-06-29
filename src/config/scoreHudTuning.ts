/**
 * Score HUD tuning — combo badge pulse and text shadow.
 * Worklet-safe: plain constants only.
 */

export const scoreHudTuning = {
  COMBO_BADGE_WIDTH: 140,
  COMBO_BADGE_HEIGHT: 110,
  COMBO_BADGE_FONT: 105,
  COMBO_STREAK_LABEL_WIDTH: 200,
  COMBO_STREAK_LABEL_HEIGHT: 40,
  COMBO_STREAK_LABEL_FONT: 28,
  COMBO_PANEL_GAP: 12,
  COMBO_STREAK_LABEL_GAP: 4,
  COMBO_PULSE_PERIOD_MS: 550,
  COMBO_PULSE_SCALE_PEAK: 1.12,
  COMBO_PULSE_OPACITY_MIN: 0.82,
  COMBO_TEXT_SHADOW: {
    dx: 0,
    dy: 4,
    blur: 8,
    color: '#0A0518',
    shadowOnly: true,
  },
} as const;
