import type { SkillFeedbackTuning, SkillTierGate } from '@/config/skillFeedback';
import { centerDeltaCols } from '@/Game/feedback/gapTopology';
import {
  cumulativeSwimmerColTravel,
  detectChicaneBlockBreak,
  detectMonotonicTravel,
  detectRunThenBreak,
  detectSwimmerMonotonicTravel,
  detectSwimmerRunThenBreak,
  hasSwimmerSteerProof,
  isWideOpenLane,
  swimmerColDeltaAbs,
  swimmerSteerSpanCols,
} from '@/Game/feedback/gapPathAnalysis';
import { computeHygiene01 } from '@/Game/feedback/hygieneScoring';
import {
  resolveSkillGates,
  type ResolvedSkillGates,
} from '@/Game/feedback/skillSurvivalGates';
import type {
  RowCrossSnapshot,
  SkillPraiseEvent,
  StitchSampler,
} from '@/Game/feedback/skillFeedbackTypes';

export type SteerPraiseContext = {
  history: readonly RowCrossSnapshot[];
  current: RowCrossSnapshot;
  speedNorm: number;
  difficulty01: number;
  anchorX: number;
  anchorY: number;
  tuning: SkillFeedbackTuning;
  stitchSampler: StitchSampler;
  gates?: ResolvedSkillGates;
};

const pickSteerTierWithHygiene = (
  tiers: SkillTierGate[],
  speedNorm: number,
  difficulty01: number,
  hygiene01: number,
  tierUpgradeMin: number
): { tierIndex: number; tier: SkillTierGate } | null => {
  'worklet';
  if (tiers.length === 0) return null;

  let best: { tierIndex: number; tier: SkillTierGate } = {
    tierIndex: 0,
    tier: tiers[0],
  };

  for (let i = 1; i < tiers.length; i++) {
    const tier = tiers[i];
    const speedMin = tier.speedMin ?? 0;
    const diffMin = tier.diffMin ?? 0;
    if (speedNorm < speedMin || difficulty01 < diffMin) continue;
    if (hygiene01 < tierUpgradeMin) continue;
    best = { tierIndex: i, tier };
  }

  return best;
};

const makeSteerEvent = (
  momentId: SkillPraiseEvent['momentId'],
  patternPriority: number,
  familyPriority: number,
  picked: { tierIndex: number; tier: SkillTierGate },
  ctx: SteerPraiseContext,
  hygiene01: number
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
    hygiene01,
  };
};

export const detectSteerPraise = (
  ctx: SteerPraiseContext
): SkillPraiseEvent | null => {
  'worklet';
  const family = ctx.tuning.families.steer_clean;
  if (!family.enabled) return null;
  if (ctx.current.contact.pinned) return null;
  if (!ctx.current.crossQualified) return null;

  const gates =
    ctx.gates ??
    resolveSkillGates(ctx.difficulty01, ctx.speedNorm, ctx.tuning);
  const minStepDelta = gates.minStepDelta;
  const wideOpenWidth = ctx.tuning.pathGates.wideOpenLaneWidth;
  const tierUpgradeMin = ctx.tuning.hygiene.tierUpgradeMin;
  const minSteerSpan = gates.swimmerSteerMinSpanCols;
  const sampler = ctx.stitchSampler;

  const historyWithCurrent =
    ctx.history.length > 0 ? ctx.history : ([] as RowCrossSnapshot[]);
  const prev =
    historyWithCurrent.length > 0
      ? historyWithCurrent[historyWithCurrent.length - 1]
      : undefined;
  const fullHistory = historyWithCurrent.concat([ctx.current]);

  const candidates: SkillPraiseEvent[] = [];
  const patterns = family.patterns;

  if (prev) {
    const shiftPattern = patterns.shift_commit;
    if (shiftPattern?.enabled) {
      const centerDelta = Math.abs(
        centerDeltaCols(ctx.current.topology, prev.topology)
      );
      const swimmerDelta = swimmerColDeltaAbs(ctx.current, prev);
      const bothWideOpen =
        isWideOpenLane(prev.topology, wideOpenWidth) &&
        isWideOpenLane(ctx.current.topology, wideOpenWidth);
      const shiftMin = shiftPattern.minCenterDeltaCols ?? 1;
      const topologyShift = centerDelta >= shiftMin;
      const scrapeSteerShift =
        !topologyShift &&
        swimmerDelta > Math.ceil(minSteerSpan) &&
        (prev.contact.sideBlocked || ctx.current.contact.sideBlocked);
      if (
        !bothWideOpen &&
        hasSwimmerSteerProof(prev, ctx.current, sampler, minSteerSpan) &&
        (topologyShift || scrapeSteerShift)
      ) {
        const lookback = shiftPattern.maxLookbackRows ?? 2;
        const hygiene01 = computeHygiene01(
          fullHistory,
          lookback,
          ctx.stitchSampler,
          ctx.tuning
        );
        const picked = pickSteerTierWithHygiene(
          shiftPattern.tiers,
          ctx.speedNorm,
          ctx.difficulty01,
          hygiene01,
          tierUpgradeMin
        );
        if (picked) {
          candidates.push(
            makeSteerEvent(
              'shift_commit',
              shiftPattern.priority,
              family.priority,
              picked,
              ctx,
              hygiene01
            )
          );
        }
      }
    }
  }

  const zigzag = patterns.zigzag_chain;
  if (zigzag?.enabled) {
    const minRun = zigzag.minRunLength ?? zigzag.minChainLength ?? 3;
    const breakMin = gates.zigzagBreakMinDelta;
    if (
      detectRunThenBreak(
        fullHistory,
        minRun,
        breakMin,
        minStepDelta,
        sampler,
        minSteerSpan
      ) ||
      detectSwimmerRunThenBreak(
        fullHistory,
        minRun,
        Math.max(1, Math.ceil(breakMin)),
        sampler,
        minSteerSpan
      )
    ) {
      const lookback = zigzag.maxLookbackRows ?? minRun + 2;
      const hygiene01 = computeHygiene01(
        fullHistory,
        lookback,
        ctx.stitchSampler,
        ctx.tuning
      );
      const picked = pickSteerTierWithHygiene(
        zigzag.tiers,
        ctx.speedNorm,
        ctx.difficulty01,
        hygiene01,
        tierUpgradeMin
      );
      if (picked) {
        candidates.push(
          makeSteerEvent(
            'zigzag_chain',
            zigzag.priority,
            family.priority,
            picked,
            ctx,
            hygiene01
          )
        );
      }
    }
  }

  const slalom = patterns.slalom_block;
  if (
    slalom?.enabled &&
    ctx.current.branchKey.includes(slalom.branchKeyContains ?? 'chicane') &&
    detectChicaneBlockBreak(
      prev,
      ctx.current,
      slalom.chicaneShiftMin ?? 2,
      sampler,
      minSteerSpan
    )
  ) {
    const lookback = slalom.maxLookbackRows ?? 3;
    const hygiene01 = computeHygiene01(
      fullHistory,
      lookback,
      ctx.stitchSampler,
      ctx.tuning
    );
    const picked = pickSteerTierWithHygiene(
      slalom.tiers,
      ctx.speedNorm,
      ctx.difficulty01,
      hygiene01,
      tierUpgradeMin
    );
    if (picked) {
      candidates.push(
        makeSteerEvent(
          'slalom_block',
          slalom.priority,
          family.priority,
          picked,
          ctx,
          hygiene01
        )
      );
    }
  }

  const sweep = patterns.cross_sweep;
  if (sweep?.enabled) {
    const minRowSpan = gates.surfMinRowSpan;
    const bothWideOpen =
      prev &&
      isWideOpenLane(prev.topology, wideOpenWidth) &&
      isWideOpenLane(ctx.current.topology, wideOpenWidth);
    if (
      !bothWideOpen &&
      (detectMonotonicTravel(
        fullHistory,
        minRowSpan,
        gates.surfMinNetDelta,
        minStepDelta,
        sweep.maxLookbackRows,
        sampler,
        minSteerSpan
      ) ||
        detectSwimmerMonotonicTravel(
          fullHistory,
          minRowSpan,
          gates.surfMinNetDelta,
          sweep.maxLookbackRows,
          sampler,
          minSteerSpan
        ))
    ) {
      const lookback = sweep.maxLookbackRows ?? 6;
      const hygiene01 = computeHygiene01(
        fullHistory,
        lookback,
        ctx.stitchSampler,
        ctx.tuning
      );
      const picked = pickSteerTierWithHygiene(
        sweep.tiers,
        ctx.speedNorm,
        ctx.difficulty01,
        hygiene01,
        tierUpgradeMin
      );
      if (picked) {
        candidates.push(
          makeSteerEvent(
            'cross_sweep',
            sweep.priority,
            family.priority,
            picked,
            ctx,
            hygiene01
          )
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
    const recentSteer =
      (prev && hasSwimmerSteerProof(prev, ctx.current, sampler, minSteerSpan)) ||
      cumulativeSwimmerColTravel(fullHistory.slice(-3)) >= 1 ||
      swimmerSteerSpanCols(sampler) >= minSteerSpan;
    const hadSqueeze =
      ctx.current.contact.sideBlocked ||
      ctx.current.contact.ceilingBrush ||
      ctx.stitchSampler.sideBlockedSeen ||
      ctx.stitchSampler.ceilingBrushSeen;
    if (!recentSteer && !hadSqueeze) {
      // Funnel segment alone is not skill — need steer or wall squeeze.
    } else {
      const lookback = funnel.maxLookbackRows ?? 2;
      const hygiene01 = computeHygiene01(
        fullHistory,
        lookback,
        ctx.stitchSampler,
        ctx.tuning
      );
      const picked = pickSteerTierWithHygiene(
        funnel.tiers,
        ctx.speedNorm,
        ctx.difficulty01,
        hygiene01,
        tierUpgradeMin
      );
      if (picked) {
        candidates.push(
          makeSteerEvent(
            'funnel_thread',
            funnel.priority,
            family.priority,
            picked,
            ctx,
            hygiene01
          )
        );
      }
    }
  }

  const fork = patterns.fork_clean;
  if (
    fork?.enabled &&
    ctx.current.branchKey.includes(fork.branchKeyContains ?? 'paradoxSplit')
  ) {
    const lookback = fork.maxLookbackRows ?? 2;
    const hygiene01 = computeHygiene01(
      fullHistory,
      lookback,
      ctx.stitchSampler,
      ctx.tuning
    );
    const picked = pickSteerTierWithHygiene(
      fork.tiers,
      ctx.speedNorm,
      ctx.difficulty01,
      hygiene01,
      tierUpgradeMin
    );
    if (picked) {
      candidates.push(
        makeSteerEvent(
          'fork_clean',
          fork.priority,
          family.priority,
          picked,
          ctx,
          hygiene01
        )
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
