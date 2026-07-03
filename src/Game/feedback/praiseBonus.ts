import type { SkillFeedbackTuning } from '@/config/skillFeedback';
import { flowStreakBonusMultiplier } from '@/config/flowStreak';
import type { SkillPraiseEvent } from '@/Game/feedback/skillFeedbackTypes';

export const rollBonusInRange = (
  min: number,
  max: number,
  roll01: number
): number => {
  'worklet';
  const lo = Math.floor(Math.min(min, max));
  const hi = Math.floor(Math.max(min, max));
  if (hi <= lo) return lo;
  const t = Math.max(0, Math.min(1, roll01));
  return Math.min(hi, lo + Math.floor(t * (hi - lo + 1)));
};

export const computePraiseBonus = (
  event: SkillPraiseEvent,
  clearance01: number,
  raisingSpeed: number,
  difficulty01: number,
  tuning: SkillFeedbackTuning,
  roll01: number,
  hygiene01: number = 1,
  flowStreakValue: number = 0
): number => {
  'worklet';
  if (event.bonusMax <= 0 && event.bonusMin <= 0) return 0;

  const base = rollBonusInRange(event.bonusMin, event.bonusMax, roll01);
  const speedNorm = Math.min(
    1,
    raisingSpeed / Math.max(1, tuning.speedNormMax)
  );
  const diff = Math.max(0, Math.min(1, difficulty01));
  const hygiene = Math.max(0, Math.min(1, hygiene01));
  const ignoreClearance = event.bonusIgnoreClearance === true;

  const mult =
    1 +
    (ignoreClearance ? 0 : (1 - Math.max(0, Math.min(1, clearance01))) * tuning.bonus.clearanceWeight) +
    speedNorm * tuning.bonus.speedWeight +
    diff * tuning.bonus.difficultyWeight +
    hygiene * tuning.hygiene.bonusHygieneWeight;

  const streakMult = flowStreakBonusMultiplier(flowStreakValue);

  return Math.max(0, Math.round(base * mult * streakMult));
};

/** Clearance must never influence copy — only bonus magnitude. */
export const copyIsIndependentOfClearance = (): boolean => {
  'worklet';
  return true;
};
