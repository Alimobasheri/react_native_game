import type { SkillFeedbackTuning } from '@/config/skillFeedback';
import { resolveLatchGraceMs } from '@/Game/feedback/skillSurvivalGates';
import type { SkillPraiseEvent, TapCoachState } from '@/Game/feedback/skillFeedbackTypes';

export type TapCoachContext = {
  isPinned: boolean;
  swimmerX: number;
  columnWidth: number;
  state: TapCoachState;
  nowMs: number;
  anchorX: number;
  anchorY: number;
  tuning: SkillFeedbackTuning;
  minEscapeTravelPx: number;
  speedNorm: number;
  difficulty01: number;
};

export const updateTapCoachDetection = (
  ctx: TapCoachContext
): { state: TapCoachState; events: SkillPraiseEvent[] } => {
  'worklet';
  const cfg = ctx.tuning.families.pin_coach;
  const events: SkillPraiseEvent[] = [];
  let state = { ...ctx.state };
  const latchGraceMs = resolveLatchGraceMs(
    ctx.difficulty01,
    ctx.speedNorm,
    ctx.tuning
  );

  if (ctx.isPinned) {
    if (!state.wasPinned) {
      state.pinSessionStartX = ctx.swimmerX;
      state.pinAnchorX = ctx.anchorX;
      state.pinEnterMs = ctx.nowMs;
    }
    state.wasPinned = true;

    const elapsed =
      state.lastTapFlashMs > 0 ? ctx.nowMs - state.lastTapFlashMs : cfg.tapRepeatMs;
    if (state.lastTapFlashMs === 0 || elapsed >= cfg.tapRepeatMs) {
      state.lastTapFlashMs = ctx.nowMs;
      events.push({
        familyId: 'pin_coach',
        momentId: 'tap_coach',
        copy: cfg.tiers.tap,
        tierIndex: 0,
        bonusMin: 0,
        bonusMax: 0,
        priority: cfg.priority,
        anchorX: ctx.anchorX,
        anchorY: ctx.anchorY,
        refreshExistingTap: true,
      });
    }
    return { state, events };
  }

  if (state.wasPinned) {
    const startX = state.pinSessionStartX ?? ctx.swimmerX;
    const travel = Math.abs(ctx.swimmerX - startX);
    const savedElapsed =
      state.lastSavedMs > 0 ? ctx.nowMs - state.lastSavedMs : cfg.savedCooldownMs;
    const pinDuration =
      state.pinEnterMs > 0 ? ctx.nowMs - state.pinEnterMs : latchGraceMs;
    const latchedLongEnough = pinDuration >= latchGraceMs;

    if (
      latchedLongEnough &&
      travel >= ctx.minEscapeTravelPx &&
      savedElapsed >= cfg.savedCooldownMs
    ) {
      state.lastSavedMs = ctx.nowMs;
      events.push({
        familyId: 'pin_coach',
        momentId: 'pin_saved',
        copy: cfg.tiers.saved,
        tierIndex: 0,
        bonusMin: cfg.tiers.savedBonusMin,
        bonusMax: cfg.tiers.savedBonusMax,
        priority: cfg.priority + 50,
        anchorX: ctx.anchorX,
        anchorY: ctx.anchorY,
      });
    }
    state.wasPinned = false;
    state.pinSessionStartX = undefined;
    state.pinAnchorX = undefined;
    state.pinEnterMs = 0;
  }

  return { state, events };
};
