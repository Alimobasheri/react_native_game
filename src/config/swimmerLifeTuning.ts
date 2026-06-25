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
  INTERNAL_RIPPLE_OPACITY_MIN: 0.06,
  INTERNAL_RIPPLE_OPACITY_MAX: 0.26,
  /** Ripple band height as a fraction of body mesh height. */
  INTERNAL_RIPPLE_BAND_HEIGHT_RATIO: 0.14,
  /** Ripple band width as a fraction of body mesh width. */
  INTERNAL_RIPPLE_BAND_WIDTH_RATIO: 0.72,
  /** Vertical travel span as a fraction of body mesh height (lower → upper body). */
  INTERNAL_RIPPLE_TRAVEL_RATIO: 0.62,
} as const;
