/**
 * Centralized numeric tuning for the swimmer game (physics, input, water shader runtime).
 * Safe to import from Reanimated worklets: plain data only, no React or host APIs.
 */

export const swimmerPhysicsTuning = {
  /** Swimmer render width and collision hitbox width as a fraction of one grid column. */
  SWIMMER_WIDTH_COLUMN_RATIO: 1 / 2,
  SWIMMER_HEIGHT_TO_WIDTH_RATIO: 1.8,

  MAX_HORIZONTAL_SPEED: 520,
  PINNED_VELOCITY_DAMPING: 0.7,
  TAP_IMPULSE_MULTIPLIER_MIN: 1,
  TAP_IMPULSE_MULTIPLIER_MAX: 3.5,
  MAX_WATER_CURRENT_SPEED: 200,
  WATER_CURRENT_RESPONSE_PER_SECOND: 5,
  WATER_CURRENT_SURGE_BOOST: 1.2,
  SURFACE_FOLLOW_RESPONSE_PER_SECOND: 6,
  SURFACE_SUBMERGENCE_RATIO: 0.82,
  SURFACE_BOB_BLEND: 2,
  /** Visual tilt cap (radians) — matches former Matter body rotation. */
  MAX_TILT_RADIANS: (75 * Math.PI) / 180,
  /** |velocityX| at which MAX_TILT_RADIANS is reached. */
  FULL_TILT_SPEED_FRACTION: 0.25,
} as const;

/** Start-screen idle water vs post-tap ramp (see beginGameplay + StartScreenSystem). */
export const gameSessionTuning = {
  /** Title-screen water speed as a fraction of gameplay speed. */
  VISUAL_RAISING_SPEED_RATIO: 0.45,
  /** Ms to ease from visual → gameplay speed after the first tap. */
  SPEED_RAMP_MS: 400,
  OVERLAY_FADE_MS: 240,
} as const;

export const waterPhysicsTuning = {
  /** Pixels/s² added to baseSpeed once the session ramp hands off to WaterPhysicsSystem. */
  WATER_SPEED_ACCELERATION_PER_SECOND: 2.2,
  WATER_SPEED_MAX: 400,
  FLOW_ACCEL_PER_SECOND: 6.8,
  FLOW_IMPULSE_ON_ROW_CHANGE: 3.2,
  FLOW_IMPULSE_BLEND_PER_SECOND: 3.4,
  FLOW_DRAG_PER_SECOND: 0.09,
  FLOW_OFFSET_SCALE: 6.8,
  FLOW_OFFSET_RETURN_PER_SECOND: 1.8,
  GAP_BLEND_SPEED_PER_SECOND: 5.4,
  SURGE_RISE_PER_SECOND: 2.1,
  SURGE_DECAY_PER_SECOND: 0.09,
  SURFACE_CENTER_SMOOTH_PER_SECOND: 1.2,
  CURVE_AMP_SMOOTH_PER_SECOND: 0.9,
  CURVE_TILT_SMOOTH_PER_SECOND: 1.3,
  CALMNESS_SMOOTH_PER_SECOND: 9,
  BAND_HEIGHT_SMOOTH_PER_SECOND: 8,
  MIN_BAND_HALF_HEIGHT: 0.01,
  MAX_BAND_HALF_HEIGHT: 0.5,
} as const;

export const tapInputTuning = {
  RAPID_TAP_WINDOW_MS: 220,
  RAPID_TAP_STEP_MULT: 0.22,
  RAPID_TAP_STREAK_ACCEL: 0.1,
  RAPID_TAP_MAX_MULT: 4.4,
} as const;

/** Water shader uniform animation step: `iTime += deltaTime / iTimeDeltaDivisor`. */
export const waterShaderRuntimeTuning = {
  iTimeDeltaDivisor: 100,
  /** Slightly transparent so the swimmer reads through the fill. */
  DEFAULT_RENDER_OPACITY: 0.82,
} as const;

export const sideWallTuning = {
  /** How far (px) each side wall extends inward over the play channel (blocks, water, swimmer). */
  CONTAINER_OVERLAP_PX: 14,
  /** Parallax speed as a multiple of water `raisingSpeed` (blocks use 1.0). */
  PARALLAX_SPEED_FACTOR: 1.2,
  /**
   * Alpha-following outline shadow (Skia drop shadow — same technique as title logo).
   * Use dx/dy ≈ 0 so the glow follows the sprite silhouette, not a straight offset band.
   */
  INNER_SHADOW_DX: 0,
  INNER_SHADOW_DY: 2,
  INNER_SHADOW_BLUR: 14,
  INNER_SHADOW_COLOR: '#120B22',
} as const;
