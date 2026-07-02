import type { SkillFamilyId, SkillPraiseEvent, SkillFeedbackState } from '@/Game/feedback/skillFeedbackTypes';
import type { SkillFeedbackTuning } from '@/config/skillFeedback';

export type RouterDropReason =
  | 'family_capped'
  | 'family_cooldown'
  | 'blocked_by_saved'
  | 'duplicate_moment'
  | 'max_word_slots';

export type RouterDrop = {
  momentId: SkillPraiseEvent['momentId'];
  familyId: SkillFamilyId;
  reason: RouterDropReason;
};

export type RouterContext = {
  candidates: SkillPraiseEvent[];
  state: SkillFeedbackState;
  nowMs: number;
  tuning: SkillFeedbackTuning;
  /** Wave 2: difficulty-scaled steer cooldown override. */
  steerCooldownMsOverride?: number;
};

const MAX_WORD_EVENTS = 2;

const familyCooldownMs = (
  familyId: SkillFamilyId,
  tuning: SkillFeedbackTuning,
  steerCooldownMsOverride?: number
): number => {
  'worklet';
  switch (familyId) {
    case 'snap_transfer':
      return tuning.families.snap_transfer.cooldownMs;
    case 'near_miss':
      return tuning.families.near_miss.cooldownMs;
    case 'zigzag_tap':
      return tuning.families.zigzag_tap.cooldownMs;
    case 'steer_clean':
      return steerCooldownMsOverride ?? tuning.families.steer_clean.cooldownMs;
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
    case 'near_miss':
      return tuning.families.near_miss.maxPerRun;
    case 'zigzag_tap':
      return tuning.families.zigzag_tap.maxPerRun;
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
  tuning: SkillFeedbackTuning,
  steerCooldownMsOverride?: number
): boolean => {
  'worklet';
  const last = state.familyCooldowns[familyId] ?? 0;
  if (last <= 0) return false;
  return (
    nowMs - last <
    familyCooldownMs(familyId, tuning, steerCooldownMsOverride)
  );
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

const getIneligibilityReason = (
  c: SkillPraiseEvent,
  ctx: RouterContext
): RouterDropReason | null => {
  'worklet';
  if (isFamilyCapped(c.familyId, ctx.state, ctx.tuning)) {
    return 'family_capped';
  }
  if (
    c.momentId !== 'pin_saved' &&
    isFamilyOnCooldown(
      c.familyId,
      ctx.state,
      ctx.nowMs,
      ctx.tuning,
      ctx.steerCooldownMsOverride
    )
  ) {
    return 'family_cooldown';
  }
  return null;
};

export const routeSkillPraiseEvents = (
  ctx: RouterContext
): {
  events: SkillPraiseEvent[];
  state: SkillFeedbackState;
  dropped: RouterDrop[];
} => {
  'worklet';
  const dropped: RouterDrop[] = [];

  if (ctx.candidates.length === 0) {
    return { events: [], state: ctx.state, dropped };
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

  const eligibleWords: SkillPraiseEvent[] = [];
  for (let i = 0; i < wordEvents.length; i++) {
    const c = wordEvents[i];
    const reason = getIneligibilityReason(c, ctx);
    if (reason) {
      dropped.push({ momentId: c.momentId, familyId: c.familyId, reason });
    } else {
      eligibleWords.push(c);
    }
  }

  eligibleWords.sort((a, b) => b.priority - a.priority);

  const hasSaved = eligibleWords.some((e) => e.momentId === 'pin_saved');
  const selectedWords: SkillPraiseEvent[] = [];
  const seenMomentIds: SkillPraiseEvent['momentId'][] = [];

  for (let i = 0; i < eligibleWords.length; i++) {
    const c = eligibleWords[i];
    if (hasSaved && c.momentId === 'near_miss') {
      dropped.push({
        momentId: c.momentId,
        familyId: c.familyId,
        reason: 'blocked_by_saved',
      });
      continue;
    }
    let duplicate = false;
    for (let j = 0; j < seenMomentIds.length; j++) {
      if (seenMomentIds[j] === c.momentId) {
        duplicate = true;
        break;
      }
    }
    if (duplicate) {
      dropped.push({
        momentId: c.momentId,
        familyId: c.familyId,
        reason: 'duplicate_moment',
      });
      continue;
    }
    if (selectedWords.length >= MAX_WORD_EVENTS) {
      dropped.push({
        momentId: c.momentId,
        familyId: c.familyId,
        reason: 'max_word_slots',
      });
      continue;
    }
    selectedWords.push(c);
    seenMomentIds.push(c.momentId);
  }

  const out: SkillPraiseEvent[] = [];
  if (tapEvents.length > 0) {
    out.push(tapEvents[tapEvents.length - 1]);
  }
  for (let i = 0; i < selectedWords.length; i++) {
    out.push(selectedWords[i]);
  }

  let state = ctx.state;
  for (let i = 0; i < selectedWords.length; i++) {
    const bestWord = selectedWords[i];
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

  return { events: out, state, dropped };
};
