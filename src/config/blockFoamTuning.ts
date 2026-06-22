/** Gap-edge block foam — sticky white blobs that cling at the water/block lip. */

export const blockFoamTuning = {
  /** Row-level ramp when water first touches the row. */
  rowFadeInSeconds: 0.2,
  /** Vertical slots along each gap-facing block edge (on clay only). */
  blobsPerEdge: 9,
  minRadiusPx: 5,
  maxRadiusPx: 11,
  /** Delay between each bubble appearing along an edge (builds up gradually). */
  blobSpawnStaggerSeconds: 0.2,
  /** Skip drawing below this combined opacity (avoids fully-transparent layers). */
  minDrawOpacity: 0.02,
  /** How long each blob swells onto the block (seconds). */
  blobGrowSeconds: 0.45,
  /** Full swell → hold → fade loop duration at base water speed (seconds). */
  blobLifeMinSeconds: 2.4,
  blobLifeMaxSeconds: 4.1,
  /** Fraction of each cycle spent holding before the slow fade. */
  blobFadeStartFraction: 0.64,
  /** Opacity at peak hold (before slow fade). */
  settledOpacity: 0.9,
  /** Very subtle brightness wobble during hold only. */
  settledBreatheAmplitude: 0.02,
  /** Scales grow/creep/cycle with water raise speed. */
  speedReference: 200,
  /** Gentle cling along the face during grow/hold (px / second). */
  creepSpeedPxPerSec: 1.1,
  /** Max drift per cycle from the spawn anchor. */
  maxCreepPx: 4.5,
  /**
   * Anchor bubbles this far inward from the water-facing block face (fraction of block width).
   */
  edgeAnchorInsetFraction: 0.06,
  /** Outward bulge at the lip once foam has landed on the block. */
  spillBulgeFraction: 0.14,
  /** Bulge strength after settle (0–1). */
  settledSpillStrength: 0.72,
  /**
   * Circle center must stay this fraction of the radius inward from the water face
   * (the rest of the circle overlaps water for a spill look).
   */
  minOnBlockRadiusFraction: 0.22,
  /** Starting scale at spawn — avoids tiny smoke puffs. */
  minSettledScale: 0.82,
  /** Tiny idle wobble so foam feels alive without drifting like smoke. */
  shimmerPx: 0.35,
  maxBlobOpacity: 0.88,
  fillColor: '#FFFFFF',
  /** Push spawn band slightly below the flat water surface (screen Y+, into the water). */
  belowSurfaceOffsetPx: 0,
  /** How far bubbles climb upward along the block from the contact line. */
  foamClimbBandPx: 52,
} as const;
