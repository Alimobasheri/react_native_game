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
  /**
   * Full breath cycle — rest → slow inhale → hold → fast exhale → rest.
   * Segment fractions must sum to 1.0 (Animation Mentor / graph-editor timing).
   */
  INTERNAL_RIPPLE_CYCLE_SEC: 2.1,
  INTERNAL_BREATH_REST_FRAC: 0.08,
  INTERNAL_BREATH_INHALE_FRAC: 0.4,
  INTERNAL_BREATH_HOLD_FRAC: 0.12,
  INTERNAL_BREATH_EXHALE_FRAC: 0.32,
  /** Inhale ease power — lower = softer start into belly fill. */
  INTERNAL_BREATH_INHALE_EASE: 1.85,
  /** Exhale ease power — lower = quicker initial release. */
  INTERNAL_BREATH_EXHALE_EASE: 0.62,
  /** Kinematic breath — minimum fill while gliding (still "alive"). */
  KINEMATIC_GLIDE_MIN_FILL: 0.28,
  /** Anticipation charge curve — lower = faster rush at end of wind-up. */
  KINEMATIC_ANTICIPATION_CHARGE_EASE: 0.65,
  /** Pivot gasp — how empty after the quick direction-change exhale. */
  KINEMATIC_PIVOT_GASP_FLOOR: 0.1,
  /** Pivot gasp — lower = air leaves faster at turn start. */
  KINEMATIC_PIVOT_EXHALE_POWER: 0.42,
  /** Fraction of pivot spent on the quick exhale before the tiny gasp catch. */
  KINEMATIC_PIVOT_EXHALE_FRAC: 0.68,
  /** Small inhale twitch at end of pivot (gasp for air). */
  KINEMATIC_PIVOT_GASP_CATCH: 0.09,
  /** Recovery tail held empty before next anticipation. */
  KINEMATIC_RECOVERY_REST_FRAC: 0.18,
  /** uPhase drift multiplier during active stroke phases. */
  KINEMATIC_ACTION_PHASE_SPEED: 0.45,
  /** Secondary parallax on baked body caustics. */
  INTERNAL_RIPPLE_INTENSITY: 0.35,
  INTERNAL_RIPPLE_INTENSITY_DEBUG: 0.5,
  /** Rising fill glow — obvious on dark cave bg. */
  INTERNAL_RIPPLE_GLOW_BASE: 0.22,
  INTERNAL_RIPPLE_GLOW_PEAK: 0.82,
  /** Residual pool at bottom when breath envelope is zero. */
  INTERNAL_RIPPLE_FILL_FLOOR: 0.06,
  /** Radial bloom origin in body UV (0–1, y=0 top, y=1 bottom). */
  INTERNAL_RIPPLE_FILL_ORIGIN_X: 0.5,
  INTERNAL_RIPPLE_FILL_ORIGIN_Y: 0.9,
  INTERNAL_RIPPLE_GLOW_DEBUG: 1.0,
  /** Future score fever — scales band + brightness (1.0 = idle). */
  INTERNAL_JUICE_BOOST_DEFAULT: 1,
  /** Kelp Drifter — slow horizontal strand sway inside the body. */
  INTERNAL_KELP_SWAY_CYCLE_SEC: 2.4,
  INTERNAL_KELP_SWAY_INTENSITY: 0.22,
  INTERNAL_KELP_SWAY_GLOW: 0.35,
  /** Root-pinned sway: horizontal tip amplitude (mesh fraction). */
  INTERNAL_KELP_SWAY_TIP_AMPLITUDE_X: 0.09,
  /** Root-pinned sway: vertical tip amplitude (mesh fraction). */
  INTERNAL_KELP_SWAY_TIP_AMPLITUDE_Y: 0.003,
  /** Bend curve power — higher = more motion at tips vs mid-strand. */
  INTERNAL_KELP_SWAY_BEND_POWER: 1.5,
  /** Strand band in body UV (y=0 top, y=1 bottom) — ~half body height. */
  INTERNAL_KELP_STRAND_REGION_TOP: 0.46,
  INTERNAL_KELP_STRAND_REGION_BOTTOM: 0.96,
  /** Sleepy blink — slower, softer close for relaxed skins. */
  SLEEPY_BLINK_INTERVAL_MIN_SEC: 3.5,
  SLEEPY_BLINK_INTERVAL_MAX_SEC: 8.0,
  SLEEPY_BLINK_DURATION_MIN_SEC: 0.14,
  SLEEPY_BLINK_DURATION_MAX_SEC: 0.22,
  SLEEPY_BLINK_CLOSED_OPACITY: 0.28,
  SLEEPY_BLINK_CLOSED_SCALE_Y: 0.35,
} as const;
