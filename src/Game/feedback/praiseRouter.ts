import type { SkillFamilyId, SkillPraiseEvent, SkillFeedbackState } from '@/Game/feedback/skillFeedbackTypes';
import type { SkillFeedbackTuning } from '@/config/skillFeedback';

export type RouterContext = {
  candidates: SkillPraiseEvent[];
  state: SkillFeedbackState;
  nowMs: number;
  tuning: SkillFeedbackTuning;
};

const familyCooldownMs = (
  familyId: SkillFamilyId,
  tuning: SkillFeedbackTuning
): number => {
  'worklet';
  switch (familyId) {
    case 'snap_transfer':
      return tuning.families.snap_transfer.cooldownMs;
    case 'ceiling_dodge':
      return tuning.families.ceiling_dodge.cooldownMs;
    case 'steer_clean':
      return tuning.families.steer_clean.cooldownMs;
    case 'pin_coach':
      return tuning.families.pin_coach.savedCooldownMs;
    default:
      return 500;
  }
};

const familyMaxPerRun = (
  familyId: SkillFamilyId,
  tuning: SkillFeedbackTuning
): number => {
  'worklet';
  switch (familyId) {
    case 'snap_transfer':
      return tuning.families.snap_transfer.maxPerRun;
    case 'ceiling_dodge':
      return tuning.families.ceiling_dodge.maxPerRun;
    case 'steer_clean':
      return tuning.families.steer_clean.maxPerRun;
    case 'pin_coach':
      return tuning.families.pin_coach.maxPerRun;
    default:
      return 99;
  }
};

const isFamilyOnCooldown = (
  familyId: SkillFamilyId,
  state: SkillFeedbackState,
  nowMs: number,
  tuning: SkillFeedbackTuning
): boolean => {
  'worklet';
  const last = state.familyCooldowns[familyId] ?? 0;
  if (last <= 0) return false;
  return nowMs - last < familyCooldownMs(familyId, tuning);
};

const isFamilyCapped = (
  familyId: SkillFamilyId,
  state: SkillFeedbackState,
  tuning: SkillFeedbackTuning
): boolean => {
  'worklet';
  const count = state.familyFireCounts[familyId] ?? 0;
  return count >= familyMaxPerRun(familyId, tuning);
};

export const routeSkillPraiseEvents = (
  ctx: RouterContext
): { events: SkillPraiseEvent[]; state: SkillFeedbackState } => {
  'worklet';
  if (ctx.candidates.length === 0) {
    return { events: [], state: ctx.state };
  }

  const tapEvents: SkillPraiseEvent[] = [];
  const wordEvents: SkillPraiseEvent[] = [];

  for (let i = 0; i < ctx.candidates.length; i++) {
    const c = ctx.candidates[i];
    if (c.momentId === 'tap_coach') {
      tapEvents.push(c);
    } else {
      wordEvents.push(c);
    }
  }

  let bestWord: SkillPraiseEvent | null = null;
  for (let i = 0; i < wordEvents.length; i++) {
    const c = wordEvents[i];
    if (isFamilyCapped(c.familyId, ctx.state, ctx.tuning)) continue;
    if (
      c.momentId !== 'pin_saved' &&
      isFamilyOnCooldown(c.familyId, ctx.state, ctx.nowMs, ctx.tuning)
    ) {
      continue;
    }
    if (!bestWord || c.priority > bestWord.priority) {
      bestWord = c;
    }
  }

  const out: SkillPraiseEvent[] = [];
  if (tapEvents.length > 0) {
    out.push(tapEvents[tapEvents.length - 1]);
  }
  if (bestWord) {
    out.push(bestWord);
  }

  let state = ctx.state;
  if (bestWord) {
    const familyId = bestWord.familyId;
    state = {
      ...state,
      familyCooldowns: {
        ...state.familyCooldowns,
        [familyId]: ctx.nowMs,
      },
      familyFireCounts: {
        ...state.familyFireCounts,
        [familyId]: (state.familyFireCounts[familyId] ?? 0) + 1,
      },
    };
  }

  return { events: out, state };
};
