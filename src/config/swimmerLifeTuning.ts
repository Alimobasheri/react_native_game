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
  INTERNAL_KELP_SWAY_CYCLE_SEC: 0.9,
  INTERNAL_KELP_SWAY_INTENSITY: 0.4,
  INTERNAL_KELP_SWAY_GLOW: 4,
  /** Root-pinned sway: horizontal tip amplitude (mesh fraction). */
  INTERNAL_KELP_SWAY_TIP_AMPLITUDE_X: 0.09,
  /** Root-pinned sway: vertical tip amplitude (mesh fraction). */
  INTERNAL_KELP_SWAY_TIP_AMPLITUDE_Y: 0.003,
  /** Bend curve power — higher = more motion at tips vs mid-strand. */
  INTERNAL_KELP_SWAY_BEND_POWER: 1.5,
  /** Strand band in body UV (y=0 top, y=1 bottom) — ~half body height. */
  INTERNAL_KELP_STRAND_REGION_TOP: 0.4,
  INTERNAL_KELP_STRAND_REGION_BOTTOM: 0.96,
  /** Kelp kinematic sway — amplitude scales per visual phase. */
  KINEMATIC_KELP_IDLE_AMPLITUDE: 0.72,
  KINEMATIC_KELP_ANTICIPATION_AMPLITUDE: 0.52,
  KINEMATIC_KELP_STROKE_AMPLITUDE: 1.28,
  KINEMATIC_KELP_GLIDE_AMPLITUDE: 0.68,
  KINEMATIC_KELP_RECOVERY_AMPLITUDE: 0.58,
  KINEMATIC_KELP_PIVOT_PEAK_AMPLITUDE: 1.42,
  KINEMATIC_KELP_MIN_AMPLITUDE: 0.45,
  KINEMATIC_KELP_MAX_AMPLITUDE: 1.55,
  /** Phase speed multipliers for internal sway cycle. */
  KINEMATIC_KELP_ACTION_SPEED_SCALE: 0.55,
  KINEMATIC_KELP_ANTICIPATION_SPEED_SCALE: 0.38,
  KINEMATIC_KELP_STROKE_SPEED_SCALE: 1.55,
  KINEMATIC_KELP_GLIDE_SPEED_SCALE: 0.42,
  KINEMATIC_KELP_RECOVERY_SPEED_SCALE: 0.48,
  KINEMATIC_KELP_PIVOT_SPEED_SCALE: 1.25,
  /** Glide amplitude decay — higher = slower strand settle after stroke. */
  KINEMATIC_KELP_GLIDE_DECAY_POWER: 1.35,
  /** Pivot whip timing inside pivot visual window. */
  KINEMATIC_KELP_PIVOT_WHIP_FRAC: 0.38,
  KINEMATIC_KELP_PIVOT_WHIP_POWER: 0.55,
  /** Direction bias targets (-1..1) blended via lag spring. */
  KINEMATIC_KELP_ANTICIPATION_BIAS: 0.22,
  KINEMATIC_KELP_STROKE_BIAS: 0.38,
  KINEMATIC_KELP_GLIDE_BIAS: 0.14,
  KINEMATIC_KELP_PIVOT_INERTIA_BIAS: 0.48,
  KINEMATIC_KELP_PIVOT_CATCH_BIAS: 0.16,
  KINEMATIC_KELP_VELOCITY_BIAS_GAIN: 0.0042,
  KINEMATIC_KELP_BIAS_CLAMP: 0.62,
  KINEMATIC_KELP_BIAS_SPRING_STIFFNESS: 14,
  KINEMATIC_KELP_BIAS_SPRING_DAMPING: 5.5,
  /** Sleepy blink — slower, softer close for relaxed skins. */
  SLEEPY_BLINK_INTERVAL_MIN_SEC: 3.5,
  SLEEPY_BLINK_INTERVAL_MAX_SEC: 8.0,
  SLEEPY_BLINK_DURATION_MIN_SEC: 0.14,
  SLEEPY_BLINK_DURATION_MAX_SEC: 0.22,
  SLEEPY_BLINK_CLOSED_OPACITY: 0.28,
  SLEEPY_BLINK_CLOSED_SCALE_Y: 0.35,
} as const;
