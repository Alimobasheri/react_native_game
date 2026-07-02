import type { SkillFeedbackTuning, SkillTierGate } from '@/config/skillFeedback';
import { resolveLatchGraceMs } from '@/Game/feedback/skillSurvivalGates';
import type {
  NearMissState,
  SkillPraiseEvent,
  StitchSampler,
} from '@/Game/feedback/skillFeedbackTypes';

export type NearMissContext = {
  ceilingBrush: boolean;
  isPinned: boolean;
  stitchSampler: StitchSampler;
  lastTapTimeMs?: number;
  lastTapDirection?: -1 | 1;
  state: NearMissState;
  nowMs: number;
  speedNorm: number;
  difficulty01: number;
  anchorX: number;
  anchorY: number;
  tuning: SkillFeedbackTuning;
};

const pickNearMissTier = (
  tiers: readonly SkillTierGate[],
  speedNorm: number,
  difficulty01: number
): { tierIndex: number; tier: SkillTierGate } | null => {
  'worklet';
  let best: { tierIndex: number; tier: SkillTierGate } | null = null;
  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    const speedMin = tier.speedMin ?? 0;
    const diffMin = tier.diffMin ?? 0;
    if (speedNorm < speedMin || difficulty01 < diffMin) continue;
    best = { tierIndex: i, tier };
  }
  if (best) return best;
  if (tiers.length > 0) {
    return { tierIndex: 0, tier: tiers[0] };
  }
  return null;
};

const pinThreatActive = (
  ceilingBrush: boolean,
  isPinned: boolean,
  sampler: StitchSampler
): boolean => {
  'worklet';
  return ceilingBrush || isPinned || sampler.ceilingBrushSeen || sampler.pinnedSeen;
};

const isBriefLatch = (
  latchedInThreat: boolean,
  pinEnterMs: number,
  nowMs: number,
  latchGraceMs: number
): boolean => {
  'worklet';
  if (!latchedInThreat || pinEnterMs <= 0) return false;
  return nowMs - pinEnterMs < latchGraceMs;
};

const tryEmitNearMiss = (
  ctx: NearMissContext,
  state: NearMissState,
  cfg: SkillFeedbackTuning['families']['near_miss']
): { state: NearMissState; event: SkillPraiseEvent | null } => {
  'worklet';
  const tapWindowMs = cfg.tapWindowMs;
  const latchGraceMs = resolveLatchGraceMs(
    ctx.difficulty01,
    ctx.speedNorm,
    ctx.tuning
  );

  const tapRecent =
    state.lastQualifyingTapMs > 0 &&
    ctx.nowMs - state.lastQualifyingTapMs <= tapWindowMs;

  if (!tapRecent) {
    return { state, event: null };
  }

  const briefLatch = isBriefLatch(
    state.latchedInThreat,
    state.pinEnterMs,
    ctx.nowMs,
    latchGraceMs
  );
  const realLatchEscape = state.latchedInThreat && !briefLatch;
  if (realLatchEscape) {
    return { state, event: null };
  }

  if (state.firesThisRun >= cfg.maxPerRun) {
    return { state, event: null };
  }

  const elapsed =
    state.lastFireMs > 0 ? ctx.nowMs - state.lastFireMs : cfg.cooldownMs;
  if (state.lastFireMs > 0 && elapsed < cfg.cooldownMs) {
    return { state, event: null };
  }

  const picked = pickNearMissTier(cfg.tiers, ctx.speedNorm, ctx.difficulty01);
  if (!picked) {
    return { state, event: null };
  }

  return {
    state: {
      ...state,
      lastFireMs: ctx.nowMs,
      firesThisRun: state.firesThisRun + 1,
      inThreat: false,
      latchedInThreat: false,
      pinEnterMs: 0,
      lastQualifyingTapMs: 0,
      lastQualifyingTapDir: undefined,
      threatStartMs: 0,
    },
    event: {
      familyId: 'near_miss',
      momentId: 'near_miss',
      copy: picked.tier.copy,
      tierIndex: picked.tierIndex,
      bonusMin: picked.tier.bonusMin,
      bonusMax: picked.tier.bonusMax,
      priority: cfg.priority,
      anchorX: ctx.anchorX,
      anchorY: ctx.anchorY,
      bonusIgnoreClearance: cfg.bonusIgnoreClearance,
    },
  };
};

export const updateNearMissDetection = (
  ctx: NearMissContext
): { state: NearMissState; event: SkillPraiseEvent | null } => {
  'worklet';
  const cfg = ctx.tuning.families.near_miss;
  if (!cfg.enabled) {
    return { state: ctx.state, event: null };
  }

  const threat = pinThreatActive(
    ctx.ceilingBrush,
    ctx.isPinned,
    ctx.stitchSampler
  );
  let state: NearMissState = { ...ctx.state };
  let event: SkillPraiseEvent | null = null;

  const tapWindowMs = cfg.tapWindowMs;
  const lastTapMs = ctx.lastTapTimeMs;
  const tapDir = ctx.lastTapDirection;
  if (
    threat &&
    lastTapMs !== undefined &&
    tapDir !== undefined &&
    ctx.nowMs - lastTapMs <= tapWindowMs
  ) {
    state.lastQualifyingTapMs = lastTapMs;
    state.lastQualifyingTapDir = tapDir;
  }

  if (threat && !state.inThreat) {
    state = {
      ...state,
      inThreat: true,
      threatStartMs: ctx.nowMs,
      latchedInThreat: false,
      pinEnterMs: 0,
    };
  }

  if (threat && ctx.isPinned && !state.latchedInThreat) {
    state = {
      ...state,
      latchedInThreat: true,
      pinEnterMs: ctx.nowMs,
    };
  }

  if (state.inThreat && !threat) {
    const emitted = tryEmitNearMiss(ctx, state, cfg);
    state = emitted.state;
    event = emitted.event;
  } else if (!threat) {
    state.inThreat = false;
  }

  return { state, event };
};
