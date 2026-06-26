/**
 * Procedural swimmer life animation tuning (worklet-safe).
 */

export const swimmerLifeTuning = {
  BLINK_INTERVAL_MIN_SEC: 2.5,
  BLINK_INTERVAL_MAX_SEC: 6.0,
  BLINK_DURATION_MIN_SEC: 0.09,
  BLINK_DURATION_MAX_SEC: 0.14,
  BLINK_CLOSED_OPACITY: 0.12,
  BLINK_CLOSED_SCALE_Y: 0.18,
  /** Full upward ripple cycle duration inside the body rect. */
  INTERNAL_RIPPLE_CYCLE_SEC: 3.4,
  INTERNAL_RIPPLE_OPACITY_MIN: 0.9,
  INTERNAL_RIPPLE_OPACITY_MAX: 0.9,
  /** Ripple band height as a fraction of body mesh height. */
  INTERNAL_RIPPLE_BAND_HEIGHT_RATIO: 0.3,
  /** Ripple band width as a fraction of body mesh width. */
  INTERNAL_RIPPLE_BAND_WIDTH_RATIO: 0.82,
  /** Vertical travel span as a fraction of body mesh height (lower → upper body). */
  INTERNAL_RIPPLE_TRAVEL_RATIO: 0.62,
  /** Kelp Drifter — slow horizontal strand sway inside the body. */
  INTERNAL_KELP_SWAY_CYCLE_SEC: 5.8,
  INTERNAL_KELP_SWAY_OPACITY_MIN: 0.05,
  INTERNAL_KELP_SWAY_OPACITY_MAX: 0.22,
  INTERNAL_KELP_SWAY_BAND_HEIGHT_RATIO: 0.55,
  INTERNAL_KELP_SWAY_BAND_WIDTH_RATIO: 0.38,
  INTERNAL_KELP_SWAY_AMPLITUDE_RATIO: 0.09,
  INTERNAL_KELP_SWAY_REST_Y_RATIO: 0.08,
  /** Sleepy blink — slower, softer close for relaxed skins. */
  SLEEPY_BLINK_INTERVAL_MIN_SEC: 3.5,
  SLEEPY_BLINK_INTERVAL_MAX_SEC: 8.0,
  SLEEPY_BLINK_DURATION_MIN_SEC: 0.14,
  SLEEPY_BLINK_DURATION_MAX_SEC: 0.22,
  SLEEPY_BLINK_CLOSED_OPACITY: 0.28,
  SLEEPY_BLINK_CLOSED_SCALE_Y: 0.35,
} as const;
