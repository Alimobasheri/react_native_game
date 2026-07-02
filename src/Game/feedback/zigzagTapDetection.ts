import type { SkillFeedbackTuning, SkillTierGate } from '@/config/skillFeedback';
import type { SkillPraiseEvent, ZigzagTapState } from '@/Game/feedback/skillFeedbackTypes';

export type ZigzagTapContext = {
  lastTapTimeMs?: number;
  lastTapDirection?: -1 | 1;
  state: ZigzagTapState;
  nowMs: number;
  speedNorm: number;
  difficulty01: number;
  anchorX: number;
  anchorY: number;
  tuning: SkillFeedbackTuning;
};

const pickZigzagTier = (
  tiers: readonly SkillTierGate[],
  speedNorm: number,
  difficulty01: number,
  streak: number,
  baseMinStreak: number,
  kingMinStreak: number
): { tierIndex: number; tier: SkillTierGate } | null => {
  'worklet';
  if (streak < baseMinStreak) return null;

  let best: { tierIndex: number; tier: SkillTierGate } | null = null;
  for (let i = tiers.length - 1; i >= 0; i--) {
    const tier = tiers[i];
    const speedMin = tier.speedMin ?? 0;
    const diffMin = tier.diffMin ?? 0;
    const tierMinStreak = tier.minStreak ?? baseMinStreak;
    if (speedNorm < speedMin || difficulty01 < diffMin) continue;
    if (streak < tierMinStreak) continue;
    best = { tierIndex: i, tier };
    break;
  }
  if (best) return best;
  if (tiers.length > 0 && streak >= baseMinStreak && streak < kingMinStreak) {
    return { tierIndex: 0, tier: tiers[0] };
  }
  return null;
};

export const updateZigzagTapDetection = (
  ctx: ZigzagTapContext
): { state: ZigzagTapState; event: SkillPraiseEvent | null } => {
  'worklet';
  const cfg = ctx.tuning.families.zigzag_tap;
  if (!cfg.enabled) {
    return { state: ctx.state, event: null };
  }

  let state: ZigzagTapState = { ...ctx.state };
  let event: SkillPraiseEvent | null = null;

  const lastTapMs = ctx.lastTapTimeMs;
  const tapDir = ctx.lastTapDirection;

  if (
    lastTapMs !== undefined &&
    tapDir !== undefined &&
    lastTapMs !== state.lastProcessedTapMs
  ) {
    state.lastProcessedTapMs = lastTapMs;
    const deltaMs =
      state.lastTapMs > 0 ? lastTapMs - state.lastTapMs : cfg.streakWindowMs + 1;
    const alternated =
      state.lastTapDir !== undefined && state.lastTapDir !== tapDir;
    const inWindow = deltaMs >= 0 && deltaMs <= cfg.streakWindowMs;

    if (alternated && inWindow) {
      state.streak = state.streak + 1;
    } else if (alternated) {
      state.streak = 1;
    } else {
      state.streak = 0;
    }

    state.lastTapDir = tapDir;
    state.lastTapMs = lastTapMs;

    if (state.streak >= cfg.minStreak) {
      const cooldownElapsed =
        state.lastFireMs > 0 ? ctx.nowMs - state.lastFireMs : cfg.cooldownMs;
      if (state.lastFireMs === 0 || cooldownElapsed >= cfg.cooldownMs) {
        const kingTier = cfg.tiers[cfg.tiers.length - 1];
        const kingMinStreak = kingTier?.minStreak ?? cfg.minStreak;
        const picked = pickZigzagTier(
          cfg.tiers,
          ctx.speedNorm,
          ctx.difficulty01,
          state.streak,
          cfg.minStreak,
          kingMinStreak
        );
        if (picked) {
          state.lastFireMs = ctx.nowMs;
          event = {
            familyId: 'zigzag_tap',
            momentId: 'zigzag_tap',
            copy: picked.tier.copy,
            tierIndex: picked.tierIndex,
            bonusMin: picked.tier.bonusMin,
            bonusMax: picked.tier.bonusMax,
            priority: cfg.priority,
            anchorX: ctx.anchorX,
            anchorY: ctx.anchorY,
          };
        }
      }
    }
  }

  return { state, event };
};
