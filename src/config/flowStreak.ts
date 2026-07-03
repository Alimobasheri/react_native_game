/**
 * Flow streak — consecutive perfect gap-shift passages (Track 3).
 * Worklet-safe: plain constants and pure helpers only.
 */

/** First perfect seam ignites HUD/bonus at ×2. */
export const FLOW_STREAK_INITIAL = 2;

export const incrementFlowStreakValue = (count: number): number => {
  'worklet';
  if (count === 0) {
    return FLOW_STREAK_INITIAL;
  }
  return count + 1;
};

/** Bonus mult when streak inactive (0) is 1×. */
export const flowStreakBonusMultiplier = (count: number): number => {
  'worklet';
  if (count >= FLOW_STREAK_INITIAL) {
    return count;
  }
  return 1;
};

export const flowStreakHudLabel = (count: number): string => {
  'worklet';
  if (count >= FLOW_STREAK_INITIAL) {
    return `×${count}`;
  }
  return '';
};

export const isFlowStreakHudVisible = (count: number): boolean => {
  'worklet';
  return count >= FLOW_STREAK_INITIAL;
};
