import type { SkillFeedbackTuning, SkillTierGate } from '@/config/skillFeedback';
import { centerDeltaCols } from '@/Game/feedback/gapTopology';
import type { RowCrossSnapshot, SkillPraiseEvent } from '@/Game/feedback/skillFeedbackTypes';

export type SteerPraiseContext = {
  history: readonly RowCrossSnapshot[];
  current: RowCrossSnapshot;
  speedNorm: number;
  difficulty01: number;
  anchorX: number;
  anchorY: number;
  tuning: SkillFeedbackTuning;
};

const pickSteerTier = (
  tiers: SkillTierGate[],
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

const shiftSignsFromHistory = (
  history: readonly RowCrossSnapshot[]
): number[] => {
  'worklet';
  const signs: number[] = [];
  for (let i = 1; i < history.length; i++) {
    const delta = centerDeltaCols(history[i].topology, history[i - 1].topology);
    if (Math.abs(delta) < 0.5) continue;
    signs.push(delta > 0 ? 1 : -1);
  }
  return signs;
};

const isAlternatingChain = (signs: readonly number[], minLen: number): boolean => {
  'worklet';
  if (signs.length < minLen) return false;
  const tail = signs.slice(signs.length - minLen);
  for (let i = 1; i < tail.length; i++) {
    if (tail[i] === tail[i - 1]) return false;
  }
  return true;
};

const makeSteerEvent = (
  momentId: SkillPraiseEvent['momentId'],
  patternPriority: number,
  familyPriority: number,
  picked: { tierIndex: number; tier: SkillTierGate },
  ctx: SteerPraiseContext
): SkillPraiseEvent => {
  'worklet';
  return {
    familyId: 'steer_clean',
    momentId,
    copy: picked.tier.copy,
    tierIndex: picked.tierIndex,
    bonusMin: picked.tier.bonusMin,
    bonusMax: picked.tier.bonusMax,
    priority: familyPriority + patternPriority,
    anchorX: ctx.anchorX,
    anchorY: ctx.anchorY,
  };
};

export const detectSteerPraise = (
  ctx: SteerPraiseContext
): SkillPraiseEvent | null => {
  'worklet';
  const family = ctx.tuning.families.steer_clean;
  if (!family.enabled || !ctx.current.cleanCross) return null;

  const historyWithCurrent =
    ctx.history.length > 0
      ? ctx.history
      : ([] as RowCrossSnapshot[]);
  const prev = historyWithCurrent.length > 0
    ? historyWithCurrent[historyWithCurrent.length - 1]
    : undefined;

  const candidates: SkillPraiseEvent[] = [];
  const patterns = family.patterns;

  if (prev) {
    const shiftPattern = patterns.shift_commit;
    if (shiftPattern?.enabled) {
      const delta = Math.abs(centerDeltaCols(ctx.current.topology, prev.topology));
      if (delta >= (shiftPattern.minCenterDeltaCols ?? 1)) {
        const picked = pickSteerTier(shiftPattern.tiers, ctx.speedNorm, ctx.difficulty01);
        if (picked) {
          candidates.push(
            makeSteerEvent(
              'shift_commit',
              shiftPattern.priority,
              family.priority,
              picked,
              ctx
            )
          );
        }
      }
    }
  }

  const fullHistory = historyWithCurrent.concat([ctx.current]);
  const signs = shiftSignsFromHistory(fullHistory);

  const zigzag = patterns.zigzag_chain;
  if (zigzag?.enabled && isAlternatingChain(signs, zigzag.minChainLength ?? 3)) {
    const allClean = fullHistory
      .slice(-(zigzag.minChainLength ?? 3))
      .every((s) => s.cleanCross);
    if (allClean) {
      const picked = pickSteerTier(zigzag.tiers, ctx.speedNorm, ctx.difficulty01);
      if (picked) {
        candidates.push(
          makeSteerEvent('zigzag_chain', zigzag.priority, family.priority, picked, ctx)
        );
      }
    }
  }

  const slalom = patterns.slalom_block;
  if (
    slalom?.enabled &&
    ctx.current.branchKey.includes(slalom.branchKeyContains ?? 'chicane') &&
    signs.length >= (slalom.minChainLength ?? 3)
  ) {
    const picked = pickSteerTier(slalom.tiers, ctx.speedNorm, ctx.difficulty01);
    if (picked) {
      candidates.push(
        makeSteerEvent('slalom_block', slalom.priority, family.priority, picked, ctx)
      );
    }
  }

  const sweep = patterns.cross_sweep;
  if (sweep?.enabled && fullHistory.length >= 2) {
    const lookback = sweep.maxLookbackRows ?? 6;
    const slice = fullHistory.slice(-lookback);
    let net = 0;
    for (let i = 1; i < slice.length; i++) {
      net += Math.abs(centerDeltaCols(slice[i].topology, slice[i - 1].topology));
    }
    if (net >= (sweep.minNetCenterDelta ?? 4)) {
      const picked = pickSteerTier(sweep.tiers, ctx.speedNorm, ctx.difficulty01);
      if (picked) {
        candidates.push(
          makeSteerEvent('cross_sweep', sweep.priority, family.priority, picked, ctx)
        );
      }
    }
  }

  const funnel = patterns.funnel_thread;
  if (
    funnel?.enabled &&
    ctx.current.branchKey.includes(funnel.branchKeyContains ?? 'funnel') &&
    ctx.current.topology.width <= (funnel.maxGapWidth ?? 2)
  ) {
    const picked = pickSteerTier(funnel.tiers, ctx.speedNorm, ctx.difficulty01);
    if (picked) {
      candidates.push(
        makeSteerEvent('funnel_thread', funnel.priority, family.priority, picked, ctx)
      );
    }
  }

  const fork = patterns.fork_clean;
  if (
    fork?.enabled &&
    ctx.current.branchKey.includes(fork.branchKeyContains ?? 'paradoxSplit')
  ) {
    const picked = pickSteerTier(fork.tiers, ctx.speedNorm, ctx.difficulty01);
    if (picked) {
      candidates.push(
        makeSteerEvent('fork_clean', fork.priority, family.priority, picked, ctx)
      );
    }
  }

  if (candidates.length === 0) return null;
  let best = candidates[0];
  for (let i = 1; i < candidates.length; i++) {
    if (candidates[i].priority > best.priority) {
      best = candidates[i];
    }
  }
  return best;
};
