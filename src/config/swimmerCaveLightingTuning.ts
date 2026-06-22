/**
 * Cave background depth lighting — palette and strengths for swimmer game.
 * Worklet-safe: plain numbers and literal tuples only (no parseInt / hex helpers).
 */

/** Style bible §4 — Cave palette (RGB 0–1). */
export const CAVE_COLOR_TOP: [number, number, number] = [
  18 / 255,
  11 / 255,
  34 / 255,
];
export const CAVE_COLOR_MID: [number, number, number] = [
  33 / 255,
  19 / 255,
  55 / 255,
];
export const CAVE_COLOR_BOTTOM: [number, number, number] = [
  60 / 255,
  32 / 255,
  84 / 255,
];

/** Vertical position (0 top → 1 bottom) of mid-tone anchor. */
export const CAVE_MID_STOP = 0.42;
/** Additive RGB brighten toward gameplay lane center. */
export const CAVE_LANE_LIFT = 0.09;
/** Baseline / max vignette when the lane is packed with visible blocks. */
export const CAVE_VIGNETTE_STRENGTH = 0.9;
/** Minimum vignette when few or no blocks are on screen. */
export const CAVE_VIGNETTE_STRENGTH_MIN = 0.3;
export const CAVE_VIGNETTE_SOFTNESS = 0.55;
/** 0 = circular, 1 = aspect-corrected ellipse. */
export const CAVE_VIGNETTE_ROUNDNESS = 0.65;
/** Keeps parallax cave texture as quiet silhouette, not primary color. */
export const CAVE_PARALLAX_TEXTURE_OPACITY = 0.82;

export const CAVE_ATMOSPHERE_GRADIENT_SHADER_KEY = 'screenAtmosphereGradient';
export const CAVE_ATMOSPHERE_VIGNETTE_SHADER_KEY = 'screenEdgeVignette';

/** @deprecated Use named CAVE_* exports — kept for non-worklet imports. */
export const swimmerCaveLightingTuning = {
  COLOR_TOP: CAVE_COLOR_TOP,
  COLOR_MID: CAVE_COLOR_MID,
  COLOR_BOTTOM: CAVE_COLOR_BOTTOM,
  MID_STOP: CAVE_MID_STOP,
  LANE_LIFT: CAVE_LANE_LIFT,
  VIGNETTE_STRENGTH: CAVE_VIGNETTE_STRENGTH,
  VIGNETTE_STRENGTH_MIN: CAVE_VIGNETTE_STRENGTH_MIN,
  VIGNETTE_SOFTNESS: CAVE_VIGNETTE_SOFTNESS,
  VIGNETTE_ROUNDNESS: CAVE_VIGNETTE_ROUNDNESS,
  PARALLAX_TEXTURE_OPACITY: CAVE_PARALLAX_TEXTURE_OPACITY,
} as const;
