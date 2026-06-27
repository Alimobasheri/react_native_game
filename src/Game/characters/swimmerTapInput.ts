import { getCharacterProfile } from './characterProfileRegistry';
import type { SpeedTier, SwimmerLocomotionData } from '@/Game/ecs-components/Swimmer';
import { tapInputTuning } from '@/config/swimmerTuning';

export type TapInputUpdateResult = {
  streakMultiplier: number;
  visualStrokeTier: SpeedTier;
};

/** Uncapped sqrt (+ optional log) streak multiplier from rapidTapStreak count. */
export const computeStreakMultiplier = (streak: number): number => {
  'worklet';
  if (streak <= 0) {
    return 1;
  }
  const sqrtBoost = tapInputTuning.STREAK_SQRT_COEFF * Math.sqrt(streak);
  const logBoost =
    tapInputTuning.STREAK_LOG_COEFF > 0
      ? tapInputTuning.STREAK_LOG_COEFF * Math.log1p(streak)
      : 0;
  return 1 + sqrtBoost + logBoost;
};

/** Updates rapid-tap streak and visual tier window; call before queuing pendingTapDirection. */
export const applyTapInputToLocomotion = (
  locomotion: SwimmerLocomotionData,
  tapDirection: 1 | -1,
  nowMs: number
): TapInputUpdateResult => {
  'worklet';
  const profile = getCharacterProfile(locomotion.profileId);
  const previousTapTimeMs = locomotion.lastTapTimeMs;
  const previousTapDirection = locomotion.lastTapDirection;
  const deltaMs =
    previousTapTimeMs === undefined
      ? Number.POSITIVE_INFINITY
      : nowMs - previousTapTimeMs;

  const isRapidSameDirectionTap =
    previousTapDirection === tapDirection &&
    deltaMs >= 0 &&
    deltaMs <= tapInputTuning.RAPID_TAP_WINDOW_MS;

  const streak = isRapidSameDirectionTap
    ? (locomotion.rapidTapStreak ?? 0) + 1
    : 0;

  const streakMultiplier = computeStreakMultiplier(streak);

  const comboWindowMs = profile.comboWindowMs;
  const isTierComboTap =
    previousTapDirection === tapDirection &&
    deltaMs >= 0 &&
    deltaMs <= comboWindowMs;

  let visualStrokeTier: SpeedTier = 1;
  if (isTierComboTap) {
    const nextTier = (locomotion.visualStrokeTier ?? 1) + 1;
    visualStrokeTier = nextTier > 3 ? 3 : (nextTier as SpeedTier);
  }

  locomotion.lastTapTimeMs = nowMs;
  locomotion.lastTapDirection = tapDirection;
  locomotion.rapidTapStreak = streak;
  locomotion.pendingTapMultiplier = streakMultiplier;
  locomotion.visualStrokeTier = visualStrokeTier;
  locomotion.currentTier = visualStrokeTier;

  return { streakMultiplier, visualStrokeTier };
};
