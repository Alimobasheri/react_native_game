/** Open-water surface foam — persistent gooey droplets along gap spans at the water line. */

import { blockFoamGooeyMerge } from '@/config/blockFoamTuning';

export const waterSurfaceFoamGooeyMerge = blockFoamGooeyMerge;

export const waterSurfaceFoamTuning = {
  /** Screen-space band height for the foam overlay entity (centered on flat surface). */
  bandHeightPx: 44,
  /** Row-wide fade when foam first appears. */
  fadeInSeconds: 0.55,
  blobsPerSpanBase: 20,
  minRadiusPx: 3,
  maxRadiusPx: 6,
  dropletSpacingRatio: 0.78,
  spineWidthPx: 1.5,
  spineOpacity: 0.9,
  /** Stagger only the initial spawn along the span — no recycle. */
  blobSpawnStaggerSeconds: 0.9,
  /** Gentle one-shot appear per blob; then size/opacity hold steady. */
  blobFadeInSeconds: 0.4,
  blobAppearScaleStart: 0.94,
  minDrawOpacity: 0.02,
  settledOpacity: 0.96,
  speedReference: 220,
  spanInsetNorm: 0.012,
  anchorJitterAlongPx: 1.6,
  anchorJitterAcrossPx: 0.55,
  blobSkipChance: 0,
  fillColor: '#FFFFFF',
  maxBlobOpacity: 0.94,
  /** Minimum foam strength at rest; scales up with speed / pressure / surge. */
  minFoamStrength: 0.22,
  maxFoamStrength: 1,
  /** Visible foam on the start-ready water preview (gameplay strength can be higher). */
  startReadyFoamStrength: 0.58,
  /** Treat foam as fully faded-in on the start screen (row fade + blob stagger). */
  startReadyMinFoamAge: 0.65,
  /** Foam span lags behind water gapBlend so blobs slide instead of snapping. */
  gapSpanSmoothPerSecond: 1.85,
  /** Extra blobs piled near span edges while the gap is transitioning. */
  edgeGatherBlobs: 5,
  edgeGatherBandNorm: 0.055,
} as const;
