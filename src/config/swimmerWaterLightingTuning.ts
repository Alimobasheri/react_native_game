/**
 * Water visual tuning — palette and idle surface parameters.
 * Safe for worklet import: plain data only.
 * Palette per swimmer.styles.md §4 — bright aqua/cyan complementary to orange blocks.
 */

/** Near-surface body — Water Base #10C8E8 */
export const WATER_COLOR_BASE_RGB: [number, number, number] = [
  16 / 255,
  200 / 255,
  232 / 255,
];

/** Primary water body — Water Mid #17A9E8 */
export const WATER_COLOR_MID_RGB: [number, number, number] = [
  23 / 255,
  169 / 255,
  232 / 255,
];

/** Deeper lower body — Water Deep #087CC8 */
export const WATER_COLOR_DEEP_RGB: [number, number, number] = [
  8 / 255,
  124 / 255,
  200 / 255,
];

/** Glossy surface lip — Water Highlight #9EF7FF (cyan, not near-white) */
export const WATER_COLOR_HIGHLIGHT_RGB: [number, number, number] = [
  158 / 255,
  247 / 255,
  255 / 255,
];

export const WATER_COLOR_HEX = '#17A9E8';

export const swimmerWaterLightingTuning = {
  /** Normalized surface Y in container UV (0=bottom, 1=top). Runtime follows container. */
  waterBaseHeight: 0.3,

  /** Layer A — one broad slow wave across full width (UV units). */
  idleWaveAmplitude: 0.0035,
  idleWaveSpeed: 0.18,
  idleWaveSpatialFreq: 3.4,

  /** Layer B — very subtle secondary wave. */
  secondaryWaveAmplitude: 0.001,
  secondaryWaveSpeed: 0.24,
  secondaryWaveSpatialFreq: 7.0,

  /** Hard cap on combined idle wave height (UV units). */
  idleMaxCombinedAmplitude: 0.006,

  surfaceSmoothness: 0.85,
  surfaceDamping: 0.92,

  /** Layer C — small local dip under character (UV units). */
  characterDipStrength: 0.0025,
  characterDipWidth: 0.16,
  characterRippleStrength: 0.0004,

  characterBobAmount: 3,
  characterBobSpeed: 0.85,
  /** Fraction of swimmer height below surface in idle (0.15 = bottom 15% in water). */
  idleSubmergenceFromBottom: 0.15,
  idleBobBlend: 0.8,

  surfaceHighlightThickness: 0.0035,
  /** Fraction of water body height for bright surface band (0..1). */
  surfaceBandHeight: 0.065,

  internalCurrentSpeed: 0.12,
  internalCurrentOpacity: 0.14,
  internalShapeOpacity: 0.07,

  /** Rising current lines — idle vs gameplay strength (0..1). */
  riseStreakIdleOpacity: 0.16,
  riseStreakActiveOpacity: 0.3,
  riseStreakIdleSpeed: 0.14,
  riseStreakActiveSpeedScale: 1.85,
  riseStreakLongChance: 0.22,

  /** Sparse bubbles — idle vs gameplay (pixel-space circles). */
  bubbleIdleOpacity: 0.14,
  bubbleActiveOpacity: 0.22,
  bubbleIdleSpawnThreshold: 0.5,
  bubbleActiveSpawnThreshold: 0.36,
  bubbleCellWidthPx: 68,
  bubbleCellHeightPx: 120,
  bubbleMinRadiusPx: 3.5,
  bubbleMaxRadiusPx: 8.5,
  /** Bubble scroll scale (lower = slower). Active stays calmer than streaks. */
  bubbleRiseIdleFactor: 0.26,
  bubbleRiseActiveFactor: 0.32,
  /** How much gameplay water `speed` uniform adds to bubble rise (keep low). */
  bubbleRiseFromWaterSpeed: 0.12,

  depthGradientStrength: 1,
  topBrightness: 1.04,
  midWaterSaturation: 1,
  bottomDepthDarkness: 0.88,
  wallDarkeningStrength: 0.1,

  idleBreathingAmount: 0.0005,
  idleBreathingSpeed: 0.32,

  startTransitionDuration: 400,
  idleSurfaceFollowResponsePerSecond: 4,
} as const;

export type SwimmerWaterLightingTuning = typeof swimmerWaterLightingTuning;
