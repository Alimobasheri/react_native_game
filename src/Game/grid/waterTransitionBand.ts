/**
 * Shared water-transition band geometry — SSOT for center-row lock, hazard phase, gap blend.
 * Matches ObstacleSystem center-row selection (lockAhead 0.42 + target offset 0.42).
 */

export type WaterTransitionBand = {
  lockAheadY: number;
  transitionTargetY: number;
  transitionStartY: number;
  transitionEndY: number;
  /** Extra row overlap below target for center-row overlap test. */
  overlapExtendY: number;
};

const LOCK_AHEAD_FRAC = 0.42;
const TARGET_ABOVE_LOCK_FRAC = 0.42;
const BAND_START_ABOVE_TARGET_FRAC = 0.48;
const BAND_END_BELOW_TARGET_FRAC = 0.36;
const OVERLAP_EXTEND_FRAC = 0.42;

export const waterTransitionBandFromSurface = (
  waterSurfaceY: number,
  blockHeight: number
): WaterTransitionBand => {
  'worklet';
  const h = Math.max(0.001, blockHeight);
  const lockAheadY = waterSurfaceY - h * LOCK_AHEAD_FRAC;
  const transitionTargetY = lockAheadY - h * TARGET_ABOVE_LOCK_FRAC;
  const transitionStartY = transitionTargetY - h * BAND_START_ABOVE_TARGET_FRAC;
  const transitionEndY = transitionTargetY + h * BAND_END_BELOW_TARGET_FRAC;
  const overlapExtendY = h * OVERLAP_EXTEND_FRAC;
  return {
    lockAheadY,
    transitionTargetY,
    transitionStartY,
    transitionEndY,
    overlapExtendY,
  };
};

export const rowOverlapsTransitionBand = (
  rowY: number,
  blockHeight: number,
  band: WaterTransitionBand
): boolean => {
  'worklet';
  const rowTop = rowY - blockHeight / 2;
  const rowBottom = rowY + blockHeight / 2;
  return (
    band.transitionTargetY >= rowTop &&
    band.transitionTargetY <= rowBottom + band.overlapExtendY
  );
};
