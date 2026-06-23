/** Gap-edge block foam — gooey merged droplets along water/block contacts. */

export const blockFoamGooeyMerge = {
  blurSigma: 6,
  alphaMultiplier: 55,
  alphaThreshold: 15,
} as const;

export const blockFoamTuning = {
  rowFadeInSeconds: 0.1,
  /** Target droplets per edge before row variance / skips. */
  blobsPerEdge: 14,
  minRadiusPx: 2,
  maxRadiusPx: 5,
  /** Center-to-center spacing as a fraction of diameter (<1 = overlap; ~0.7–0.85 bridges via spine + gooey). */
  dropletSpacingRatio: 0.76,
  /** Thin straight backbone along each wet face; gooey merge welds blobs to this line. */
  spineWidthPx: 2.5,
  spineOpacity: 0.6,
  blobSpawnStaggerSeconds: 0.5,
  minDrawOpacity: 0.02,
  blobGrowSeconds: 0.08,
  blobLifeMinSeconds: 0.48,
  blobLifeMaxSeconds: 0.85,
  blobPopGrowEndFraction: 0.18,
  blobPopHoldEndFraction: 0.52,
  blobScaleStart: 0.4,
  blobScaleOvershoot: 1.12,
  blobScaleSettle: 0.9,
  blobScalePop: 1.28,
  settledOpacity: 0.96,
  settledBreatheAmplitude: 0.01,
  speedReference: 200,
  edgeDriftPxPerSec: 12,
  maxEdgeDriftPx: 8,
  edgeBobPx: 1.6,
  edgeAnchorInsetFraction: 0.06,
  spillBulgeFraction: 0.1,
  settledSpillStrength: 0.62,
  minOnBlockRadiusFraction: 0.22,
  shimmerPx: 0.35,
  maxBlobOpacity: 0.94,
  fillColor: '#F7FFFF',
  belowSurfaceOffsetPx: 0,
  foamClimbBandPx: 50,
  rowClimbBandVariance: [0.85, 1.22] as const,
  rowBlobCountVariance: [0.7, 1.15] as const,
  rowFadeVariance: [0.75, 1.35] as const,
  /** Jitter along the contact edge (more = farther apart blobs along the spine). */
  rowAnchorJitterAlongPx: 2.2,
  /** Jitter perpendicular to edge — keep low for a straight surf line. */
  rowAnchorJitterAcrossPx: 0.75,
  rowBlobSkipChance: 0.12,
} as const;
