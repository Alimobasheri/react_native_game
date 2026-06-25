/** Swimmer-local water contact FX — spans, strengths, lifetimes. */

export type SwimmerContactFoamKind =
  | 'collar'
  | 'dent'
  | 'splash'
  | 'wake'
  | 'pivotFan'
  | 'pinnedBurst'
  | 'dangerEdge';

/** Subtle gooey merge so dense collar micro-blobs read as soft foam, not beads. */
export const swimmerContactFoamCollarGooeyMerge = {
  blurSigma: 2.4,
  alphaMultiplier: 78,
  alphaThreshold: 5,
} as const;

/** Lighter gooey for pivot/pinned accent blobs only. */
export const swimmerContactFoamGooeyMerge = {
  blurSigma: 3.5,
  alphaMultiplier: 95,
  alphaThreshold: 6,
} as const;

export const swimmerWaterFxTuning = {
  /** Local band centered on swimmer X (not full container width). */
  localBandWidthPx: 80,
  bandHeightPx: 60,
  /** Lower the whole foam band on the waterline. */
  entityYOffsetPx: 10,
  /** Extra downward offset for droplet anchors inside the band. */
  blobYOffsetPx: 6,
  minRadiusPx: 4,
  maxRadiusPx: 6,
  minDrawOpacity: 0.02,
  spineWidthPx: 1.2,
  spineWidthSplashPx: 1.6,
  spineWidthWakePx: 3,
  spineOpacity: 0.88,
  maxBlobOpacity: 0.88,
  /** Draw in front of the water shader within the same render layer. */
  depthSortOffset: 64,
  /** clearance01 below this tints the foam collar toward danger red. */
  NEAR_PIN_CLEARANCE01: 0.35,
  fillColor: '#EAF6FF',
  dangerFillColor: '#FFD4CC',
  splashOffsetPx: 14,
  dentOffsetPx: 8,
  wakeTrailOffsetPx: 22,
  wakeDriftPxPerSec: 48,
  /** Swimmer bottom must reach within this margin of waterSurfaceY to spawn collar / wakes. */
  waterContactMarginPx: 10,
  /** Upward ballistic splash — arcs rise then fall with gravity. */
  splashArc: {
    particleCount: 18,
    launchSpeedMinPx: 88,
    launchSpeedMaxPx: 148,
    gravityPxPerSec2: 138,
    fanSpreadRad: 1.25,
    directionalBiasRad: 0.42,
    lateralKickPx: 18,
    minRadiusPx: 0.65,
    maxRadiusPx: 1.9,
    /** Per-particle launch delay for a chaotic burst. */
    staggerSecMax: 0.055,
    /** Multiplier on splash particle opacity (1 = maxBlobOpacity baseline). */
    opacityScale: 1.28,
  },
  /** Direction-change brake — spray up and back, not a radial spine star. */
  pivotBurst: {
    particleCount: 14,
    launchSpeedMinPx: 72,
    launchSpeedMaxPx: 118,
    gravityPxPerSec2: 132,
    fanSpreadRad: 0.95,
    directionalBiasRad: 0.55,
    lateralKickPx: 14,
    minRadiusPx: 0.7,
    maxRadiusPx: 2.1,
    staggerSecMax: 0.04,
    opacityScale: 1.15,
  },
  /** First frame swimmer gets pinned under a ceiling block — upward dome splash. */
  pinnedBurstArc: {
    particleCount: 22,
    launchSpeedMinPx: 95,
    launchSpeedMaxPx: 165,
    gravityPxPerSec2: 128,
    fanSpreadRad: 1.65,
    directionalBiasRad: 0,
    lateralKickPx: 12,
    minRadiusPx: 0.85,
    maxRadiusPx: 2.6,
    staggerSecMax: 0.035,
    opacityScale: 1.35,
  },
  wakeCurl: {
    /** Trailing wake tips curl slightly above the surface line. */
    upwardCurlPx: 8,
    blobCount: 6,
    minRadiusPx: 3,
    maxRadiusPx: 6,
    trailLengthPx: 30,
    opacityScale: 1.5,
  },
  /**
   * Collar = continuous radiating ripple fronts (2D side-view water disturbance).
   * Multiple narrow ring fronts expand outward simultaneously at different radii,
   * fade with age, and overlap/merge — not a single pulsing circle.
   */
  collar: {
    /** New ripple impulse interval while swimmer is at the surface. */
    emitIntervalSec: 0.34,
    /** Max simultaneous ripple fronts (ring buffer). */
    maxRipples: 9,
    /** Seconds before a ripple front fully dissolves. */
    rippleLifetimeSec: 2.75,
    /** Outward travel speed of each ring front (px/s). */
    expandSpeedPxPerSec: 10.5,
    /** Inner radius where the first front spawns. */
    startRadiusPx: 5,
    /** Stop spawning blobs beyond this radius. */
    maxRadiusPx: 48,
    /** Small blobs placed along each ring front (narrow foam band). */
    blobsPerRing: 16,
    minBlobRadiusPx: 1,
    maxBlobRadiusPx: 1.35,
    /** Thickness jitter of the ring front band. */
    ringBandPx: 1.6,
    /** Opacity falloff exponent as ripple ages (higher = faster fade). */
    temporalFadePower: 1.4,
    /** Skip blobs this close to center (under swimmer body in 2D). */
    bodyClearancePx: 7,
    /** Only draw lower-hemisphere arc (surface-side, not above swimmer). */
    arcMinSin: 0.06,
    /** Global fade when swimmer leaves water (pinned above surface). */
    drainSec: 0.45,
    /** Pause at float depth before ripples resume after re-entry from pin. */
    regrowDelaySec: 0.28,
    /** Ease ripple strength 0→1 after waves resume post-pin. */
    regrowSec: 0.9,
    /**
     * Collar regrows only when center is submerged to ~float depth (not bottom grazing).
     * Matches physics SURFACE_SUBMERGENCE_RATIO (~0.1) — use slightly lower threshold.
     */
    minCenterSubmergeRatio: 0.075,
    surfaceCenterSlopPx: 2,
  },
  /** Outward motion for transient bursts (splash, wake, etc.). */
  loop: {
    innerRadiusPx: 6,
    expandPxPerSec: 12,
    spinRadPerSec: 3.1,
    horizontalStretch: 1.05,
    verticalSquash: 0.28,
    collarLoopPeriodPx: 18,
    phaseStaggerSec: 0.09,
    burstExpandScale: 1.25,
  },
  preset: {
    collar: {
      halfWidthNorm: 0.028,
      strength: 0.9,
      maxAge: Number.POSITIVE_INFINITY,
      blobCount: 30,
      spineCount: 0,
    },
    dent: {
      halfWidthNorm: 0.022,
      strength: 0.85,
      maxAge: 0.28,
      blobCount: 1,
      spineCount: 3,
    },
    splash: {
      halfWidthNorm: 0.032,
      strength: 1.05,
      maxAge: 0.42,
      blobCount: 0,
      spineCount: 0,
    },
    wake: {
      halfWidthNorm: 0.024,
      strength: 0.8,
      maxAge: 0.32,
      blobCount: 0,
      spineCount: 0,
    },
    pivotFan: {
      halfWidthNorm: 0.048,
      strength: 1.2,
      maxAge: 0.48,
      blobCount: 0,
      spineCount: 0,
    },
    pinnedBurst: {
      halfWidthNorm: 0.062,
      strength: 1.35,
      maxAge: 0.55,
      blobCount: 0,
      spineCount: 0,
    },
    dangerEdge: {
      halfWidthNorm: 0.03,
      strength: 1,
      maxAge: Number.POSITIVE_INFINITY,
      blobCount: 14,
      spineCount: 0,
    },
  },
} as const;

export const usesAccentGooeyKind = (_kind: SwimmerContactFoamKind): boolean => {
  'worklet';
  return false;
};
