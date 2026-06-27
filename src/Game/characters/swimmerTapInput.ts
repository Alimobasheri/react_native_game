import { getCharacterProfile } from './characterProfileRegistry';
import type { SpeedTier, SwimmerLocomotionData } from '@/Game/ecs-components/Swimmer';
import { tapInputTuning } from '@/config/swimmerTuning';

export type TapInputUpdateResult = {
  streakMultiplier: number;
  visualStrokeTier: SpeedTier;
};

/**
 * Tap-fueled steering multiplier from rapid same-direction streak count.
 * Each tap adds `streak × step(streak)` where step accelerates with streak depth.
 * Restores pre-locomotion TapSwimmer curve (feat/swimmer-game-game-over-scene).
 */
export const computeStreakMultiplier = (streak: number): number => {
  'worklet';
  if (streak <= 0) {
    return 1;
  }
  const streakStepMult =
    tapInputTuning.RAPID_TAP_STEP_MULT *
    (1 + streak * tapInputTuning.RAPID_TAP_STREAK_ACCEL);
  const mult = 1 + streak * streakStepMult;
  return Math.min(tapInputTuning.RAPID_TAP_MAX_MULT, mult);
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
