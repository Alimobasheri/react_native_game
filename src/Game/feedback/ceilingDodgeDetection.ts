import type { SkillFeedbackTuning } from '@/config/skillFeedback';
import type {
  CeilingDodgeState,
  SkillPraiseEvent,
} from '@/Game/feedback/skillFeedbackTypes';
import { recentPinholeInHistory } from '@/Game/feedback/rowCrossHistory';
import type { RowCrossSnapshot } from '@/Game/feedback/skillFeedbackTypes';

export type CeilingDodgeContext = {
  brushing: boolean;
  isPinned: boolean;
  state: CeilingDodgeState;
  nowMs: number;
  speedNorm: number;
  difficulty01: number;
  rowHistory: readonly RowCrossSnapshot[];
  anchorX: number;
  anchorY: number;
  tuning: SkillFeedbackTuning;
};

const pickCeilingTier = (
  tiers: SkillFeedbackTuning['families']['ceiling_dodge']['tiers'],
  speedNorm: number,
  difficulty01: number,
  pinholeContext: boolean
): { tierIndex: number; tier: (typeof tiers)[number] } | null => {
  'worklet';
  let best: { tierIndex: number; tier: (typeof tiers)[number] } | null = null;
  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    const speedMin = tier.speedMin ?? 0;
    const diffMin = tier.diffMin ?? 0;
    if (speedNorm < speedMin || difficulty01 < diffMin) continue;
    if (tier.requirePinholeContext && !pinholeContext) continue;
    best = { tierIndex: i, tier };
  }
  if (best) return best;
  if (tiers.length > 0) {
    return { tierIndex: 0, tier: tiers[0] };
  }
  return null;
};

export const updateCeilingDodgeDetection = (
  ctx: CeilingDodgeContext
): { state: CeilingDodgeState; event: SkillPraiseEvent | null } => {
  'worklet';
  const cfg = ctx.tuning.families.ceiling_dodge;
  const inBrush = ctx.brushing && !ctx.isPinned;
  const enteringBrush = inBrush && !ctx.state.wasBrushing;

  const nextState: CeilingDodgeState = {
    ...ctx.state,
    wasBrushing: inBrush,
  };

  if (!cfg.enabled || !enteringBrush) {
    return { state: nextState, event: null };
  }

  if (ctx.state.firesThisRun >= cfg.maxPerRun) {
    return { state: nextState, event: null };
  }

  const elapsed =
    ctx.state.lastFireMs > 0 ? ctx.nowMs - ctx.state.lastFireMs : cfg.cooldownMs;
  if (ctx.state.lastFireMs > 0 && elapsed < cfg.cooldownMs) {
    return { state: nextState, event: null };
  }

  const pinholeContext = recentPinholeInHistory(
    ctx.rowHistory,
    ctx.tuning.families.snap_transfer.pinholeMaxWidth,
    4
  );

  const picked = pickCeilingTier(
    cfg.tiers,
    ctx.speedNorm,
    ctx.difficulty01,
    pinholeContext
  );
  if (!picked) {
    return { state: nextState, event: null };
  }

  return {
    state: {
      wasBrushing: inBrush,
      lastFireMs: ctx.nowMs,
      firesThisRun: ctx.state.firesThisRun + 1,
    },
    event: {
      familyId: 'ceiling_dodge',
      momentId: 'ceiling_brush',
      copy: picked.tier.copy,
      tierIndex: picked.tierIndex,
      bonusMin: picked.tier.bonusMin,
      bonusMax: picked.tier.bonusMax,
      priority: cfg.priority,
      anchorX: ctx.anchorX,
      anchorY: ctx.anchorY,
    },
  };
};
