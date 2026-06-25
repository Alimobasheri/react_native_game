/**
 * Secondary attachment tuning (worklet-safe).
 */

export const secondaryItemTuning = {
  LAGGING_SPRING_STIFFNESS: 180,
  LAGGING_SPRING_DAMPING: 12,
  LAGGING_SPRING_VELOCITY_FACTOR: 0.05,
  LAGGING_SPRING_OFFSET_CLAMP: 15,
  LAGGING_SPRING_PIVOT_WHIPLASH: 2.5,
  /** Crest LaggingSpring — stronger lag + bottom-anchored bend. */
  CREST_SPRING_STIFFNESS: 120,
  CREST_SPRING_DAMPING: 10,
  CREST_SPRING_VELOCITY_FACTOR: 0.08,
  CREST_SPRING_OFFSET_CLAMP: 18,
  CREST_BEND_ANGLE_FACTOR: 0.048,
  CREST_BEND_ANGLE_CURVE: 0.0018,
  CREST_BEND_ANGLE_CLAMP: 0.55,
  /** Portion of stalk bend routed to horizontal skew (rest stays in tip rotation). */
  CREST_STALK_SKEW_BLEND: 0.55,
  /** Skew gain applied to stalk bend radians (Skia skew sx ≈ tan(angle)). */
  CREST_STALK_SKEW_GAIN: 0.85,
  CREST_WIND_LIFT_FACTOR: 0.012,
  CREST_WIND_LIFT_CLAMP: 6,
  /** Converts wind-lift spring displacement into extra tip angle (radians). */
  CREST_WIND_LIFT_ANGLE_FACTOR: 0.0045,
  /** Idle breeze sway on the crest tip. */
  CREST_WIND_AMBIENT_AMPLITUDE: 0.042,
  CREST_WIND_PHASE_SPEED: 1.6,
  /** Faster leaf flutter layered on stalk bend. */
  CREST_FLUTTER_AMPLITUDE: 0.03,
  CREST_FLUTTER_PHASE_SPEED: 5.2,
  CREST_PIVOT_WHIPLASH: 3.2,
  PROCEDURAL_CHAIN_SEGMENT_COUNT: 3,
  PROCEDURAL_CHAIN_SEGMENT_LENGTH: 6,
  PROCEDURAL_CHAIN_LAG_PER_SEGMENT: 0.12,
  SHADER_REACTIVE_BASE_OPACITY: 0.85,
  SHADER_REACTIVE_TIER_OPACITY_BOOST: 0.05,
  SHADER_REACTIVE_SPEED_OPACITY_SCALE: 0.0004,
  SHADER_REACTIVE_TIER_OFFSET_SQUEEZE: 1.5,
} as const;
