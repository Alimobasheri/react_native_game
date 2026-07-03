/**
 * Centralized numeric tuning for the swimmer game (physics, input, water shader runtime).
 * Safe to import from Reanimated worklets: plain data only, no React or host APIs.
 */

export const swimmerPhysicsTuning = {
  /** Swimmer render width and collision hitbox width as a fraction of one grid column. */
  SWIMMER_WIDTH_COLUMN_RATIO: 3,
  SWIMMER_HEIGHT_TO_WIDTH_RATIO: 2.1,

  MAX_HORIZONTAL_SPEED: 520,
  PINNED_VELOCITY_DAMPING: 0.93,
  /** Floor for pinned escape tap travel target (fraction of column width). */
  PINNED_ESCAPE_MIN_TAP_TRAVEL_COLUMN_FRACTION: 0.45,
  /** Extra slide past ceiling column edge to clear pin (fraction of column width). */
  PINNED_ESCAPE_EXIT_SLACK_COLUMN_FRACTION: 0.15,
  /** Floor for pinned tap collision retry min slide (fraction of column width). */
  PINNED_ESCAPE_MIN_SLIDE_COLUMN_FRACTION: 0.35,
  /** Per-tap kinematic nudge while pinned when velocity slide is blocked (fraction of column). */
  PINNED_TAP_VISIBLE_NUDGE_COLUMN_FRACTION: 0.1,
  /** Water-current pull scale on a pinned escape tap frame (keep impulse). */
  PINNED_TAP_WATER_CURRENT_SCALE: 0.00,
  /** Zero lateral water advection while pinned unless this frame applies a tap impulse. */
  PINNED_BLOCK_WATER_CURRENT_ADVECTION: true,
  TAP_IMPULSE_MULTIPLIER_MIN: 1,
  TAP_IMPULSE_MULTIPLIER_MAX: 3.5,
  MAX_WATER_CURRENT_SPEED: 400,
  WATER_CURRENT_RESPONSE_PER_SECOND: 2.5,
  WATER_CURRENT_SURGE_BOOST: 0.6,
  SURFACE_FOLLOW_RESPONSE_PER_SECOND: 12,
  /** Fraction of full swimmer height placed below the computed surface crest. */
  SURFACE_SUBMERGENCE_RATIO: 0.1,
  SURFACE_BOB_BLEND: 1.2,
  /** Visual tilt cap (radians) — matches former Matter body rotation. */
  MAX_TILT_RADIANS: (90 * Math.PI) / 180,
  /** |velocityX| at which MAX_TILT_RADIANS is reached. */
  FULL_TILT_SPEED_FRACTION: 0.25,
  /** Max upward/downward integration per frame as a fraction of block height (anti-tunnel). */
  MAX_VERTICAL_STEP_BLOCK_FRACTION: 0.35,
  /** Max horizontal integration per collision sub-step as a fraction of block width. */
  MAX_HORIZONTAL_STEP_BLOCK_FRACTION: 0.45,
  /** Collision sub-step size as a fraction of block height (swept AABB). */
  COLLISION_SUBSTEP_BLOCK_FRACTION: 0.32,
} as const;

/** Start-screen idle water vs post-tap ramp (see beginGameplay + StartScreenSystem). */
export const gameSessionTuning = {
  /** Title-screen water speed as a fraction of gameplay speed. */
  VISUAL_RAISING_SPEED_RATIO: 0.45,
  /** Ms to ease from visual → gameplay speed after the first tap. */
  SPEED_RAMP_MS: 400,
  /** Ms for title/CTA slide-in and slide-out (no opacity fade). */
  OVERLAY_SLIDE_MS: 380,
  /** Ms to fade the in-game tap-left/right tutorial after first steer. */
  OVERLAY_FADE_MS: 240,
  /** Ms for game-over dim layer fade-in. */
  GAME_OVER_DIM_FADE_MS: 120,
  /** Ms for game-over panel scale/slide intro. */
  GAME_OVER_PANEL_INTRO_MS: 320,
  /** Ms for game-over score count-up. */
  GAME_OVER_SCORE_ANIM_MS: 500,
  /** Ms for game-over overlay fade-out on retry. */
  GAME_OVER_FADE_OUT_MS: 180,
  /** Delay before retry button appears during game-over intro. */
  GAME_OVER_RETRY_INTRO_DELAY_MS: 300,
  /** Delay before revive button appears during game-over intro. */
  GAME_OVER_REVIVE_INTRO_DELAY_MS: 520,
} as const;

export const waterPhysicsTuning = {
  /**
   * @deprecated No continuous water accel — stage speed owned by StageSpeedSystem.
   * Kept for story controls only.
   */
  WATER_SPEED_ACCELERATION_PER_SECOND: 2.2,
  WATER_SPEED_MAX: 400,
  FLOW_ACCEL_PER_SECOND: 6,
  FLOW_IMPULSE_ON_ROW_CHANGE: 3.2,
  FLOW_IMPULSE_BLEND_PER_SECOND: 18.4,
  FLOW_DRAG_PER_SECOND: 0.07,
  FLOW_OFFSET_SCALE: 6.8,
  FLOW_OFFSET_RETURN_PER_SECOND: 1.8,
  GAP_BLEND_SPEED_PER_SECOND: 2.7,
  SURGE_RISE_PER_SECOND: 1.05,
  SURGE_DECAY_PER_SECOND: 0.09,
  SURFACE_CENTER_SMOOTH_PER_SECOND: 1.2,
  CURVE_AMP_SMOOTH_PER_SECOND: 0.9,
  CURVE_TILT_SMOOTH_PER_SECOND: 1.3,
  CALMNESS_SMOOTH_PER_SECOND: 9,
  BAND_HEIGHT_SMOOTH_PER_SECOND: 8,
  MIN_BAND_HALF_HEIGHT: 0.01,
  MAX_BAND_HALF_HEIGHT: 0.5,
} as const;

/**
 * Failed-timing side-block bounce — PT-006 body disruption (physics-owned, not praise).
 * Pillar D lite: calmnessDip dulls water briefly on hard wall hit.
 */
export const bounceDisruptorTuning = {
  debounceMs: 120,
  squashDurationSec: 0.12,
  /** Fraction of MAX_HORIZONTAL_SPEED — impulse opposite block direction. */
  reboundSpeedScale: 0.08,
  /** Floor for narrow-gap rebound scale (clearance01 multiplier). */
  narrowReboundScaleMin: 0.3,
  calmnessDip: 0.15,
} as const;

export const tapInputTuning = {
  /** Same-direction taps within this window increment rapidTapStreak. */
  RAPID_TAP_WINDOW_MS: 220,
  /** Base per-streak step — each rapid tap adds `streak × step(streak)` to the multiplier. */
  RAPID_TAP_STEP_MULT: 0.22,
  /** Step grows with streak count so later taps in a chain accelerate harder. */
  RAPID_TAP_STREAK_ACCEL: 0.1,
  /** Streak ceiling for tap-fueled steering (~6–9 rapid taps to max). */
  RAPID_TAP_MAX_MULT: 4.4,
  /** clearance01 at or below this — cramped corridor (matches NEAR_PIN foam threshold). */
  NARROW_ESCAPE_CLEARANCE01_THRESHOLD: 0.35,
  /**
   * Amplifies (streakMultiplier − 1) during narrow escape taps (tap 2+ in cramped gaps).
   * 2.0 = double the normal streak bonus on top of full-column travel.
   */
  NARROW_ESCAPE_STREAK_RESPONSE: 2,
  /** Per escape-streak depth added to multiplier during narrow escape. */
  NARROW_ESCAPE_STREAK_STEP: 0.35,
} as const;

export type SwimmerCoastPresetName = 'snappy' | 'balanced' | 'floaty';

/** Switch active coast profile — change this one line to A/B feel. */
export const swimmerCoastPreset: SwimmerCoastPresetName = 'snappy';

export type SwimmerCoastPresetValues = {
  TAP_TRAVEL_COLUMN_MULTIPLIER: number;
  MIN_RETAIN_PER_SECOND: number;
  MAX_RETAIN_PER_SECOND: number;
  DISTANCE_SCALE_WATER_SPEED_FACTOR: number;
  TAP_MODE_CURRENT_RESPONSE_SCALE: number;
  OPPOSING_CURRENT_IMPULSE_BOOST: number;
  VELOCITY_LEAN_SMOOTH_PER_SEC: number;
};

/** Each preset is a complete editable table — tune numbers directly. */
export const swimmerCoastPresets: Record<
  SwimmerCoastPresetName,
  SwimmerCoastPresetValues
> = {
  snappy: {
    TAP_TRAVEL_COLUMN_MULTIPLIER: 1.05,
    MIN_RETAIN_PER_SECOND: 0.06,
    MAX_RETAIN_PER_SECOND: 0.12,
    DISTANCE_SCALE_WATER_SPEED_FACTOR: 0.12,
    TAP_MODE_CURRENT_RESPONSE_SCALE: 0.28,
    OPPOSING_CURRENT_IMPULSE_BOOST: 0.35,
    VELOCITY_LEAN_SMOOTH_PER_SEC: 48,
  },
  balanced: {
    TAP_TRAVEL_COLUMN_MULTIPLIER: 1.05,
    MIN_RETAIN_PER_SECOND: 0.1,
    MAX_RETAIN_PER_SECOND: 0.18,
    DISTANCE_SCALE_WATER_SPEED_FACTOR: 0.1,
    TAP_MODE_CURRENT_RESPONSE_SCALE: 0.35,
    OPPOSING_CURRENT_IMPULSE_BOOST: 0.4,
    VELOCITY_LEAN_SMOOTH_PER_SEC: 36,
  },
  floaty: {
    TAP_TRAVEL_COLUMN_MULTIPLIER: 1.05,
    MIN_RETAIN_PER_SECOND: 0.15,
    MAX_RETAIN_PER_SECOND: 0.25,
    DISTANCE_SCALE_WATER_SPEED_FACTOR: 0.08,
    TAP_MODE_CURRENT_RESPONSE_SCALE: 0.45,
    OPPOSING_CURRENT_IMPULSE_BOOST: 0.45,
    VELOCITY_LEAN_SMOOTH_PER_SEC: 28,
  },
};

export const getActiveCoastPreset = (): SwimmerCoastPresetValues => {
  'worklet';
  return swimmerCoastPresets[swimmerCoastPreset];
};

/** Hyper-casual globals not tied to coast preset (worklet-safe). */
export const hyperCasualPhysicsTuning = {
  /** |velocityX| below this is treated as idle (px/s). */
  VELOCITY_ZERO_EPSILON: 0.5,
  IDLE_SPEED_THRESHOLD: 8,
  DECELERATING_SPEED_THRESHOLD: 40,
  /**
   * Opposite tap soft-brakes only when |velocityX| / MAX_HORIZONTAL_SPEED reaches
   * this fraction (physics-based, not time). Below — cancel coast and full impulse.
   */
  SOFT_REVERSE_SPEED_FRACTION: 0.38,
  /** Opposite-tap impulse scale when soft brake applies (high-momentum coast only). */
  REVERSE_IMPULSE_SCALE: 0.65,
  MAX_SPLASH_STRENGTH: 1.35,
  MAX_FRAME_DT: 0.1,
} as const;

export type SwimmerLocomotionMode = 'hybrid' | 'kinematic';

/** Default tap locomotion model — hybrid restores hyper-casual physics + visual phases. */
export const swimmerLocomotionMode: SwimmerLocomotionMode = 'hybrid';

/** Water shader uniform animation step: `iTime += deltaTime / iTimeDeltaDivisor`. */
export const waterShaderRuntimeTuning = {
  iTimeDeltaDivisor: 100,
  /** Slightly transparent so the swimmer reads through the fill. */
  DEFAULT_RENDER_OPACITY: 0.82,
} as const;

export const sideWallTuning = {
  /** How far (px) each side wall extends inward over the play channel (blocks, water, swimmer). */
  CONTAINER_OVERLAP_PX: 14,
  /**
   * Parallax speed as a multiple of water `raisingSpeed` (blocks = 1.0).
   * Side walls draw *in front* of blocks — they must scroll at or above gameplay
   * speed or foreground lags and reads as moving backward. Keep only slightly
   * above 1.0; values like 1.2 feel dizzy in peripheral vision.
   */
  PARALLAX_SPEED_FACTOR: 1.08,
  /**
   * Alpha-following inner-edge shadow on the wall sprites (Skia drop shadow).
   */
  INNER_SHADOW_DX: 0,
  INNER_SHADOW_DY: 2,
  INNER_SHADOW_BLUR: 14,
  INNER_SHADOW_COLOR: '#120B22',
} as const;
