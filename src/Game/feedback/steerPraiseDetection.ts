import type { SkillFeedbackTuning, SkillTierGate } from '@/config/skillFeedback';
import {
  detectChicaneBlockBreak,
  detectMonotonicTravel,
  detectSwimmerMonotonicTravel,
  hasSwimmerSteerProof,
  isWideOpenLane,
} from '@/Game/feedback/gapPathAnalysis';
import { computeHygiene01 } from '@/Game/feedback/hygieneScoring';
import {
  evaluatePassageTimingTier,
} from '@/Game/feedback/passageTimingEval';
import {
  createDefaultPassageFlowSampler,
  evaluateShiftCommitReject,
  passageIsClean,
} from '@/Game/feedback/passageFlowScoring';
import {
  resolveSkillGates,
  type ResolvedSkillGates,
} from '@/Game/feedback/skillSurvivalGates';
import type {
  PassageFlowSampler,
  RowCrossSnapshot,
  ShiftCommitEvalResult,
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
  passageSampler?: PassageFlowSampler;
  gates?: ResolvedSkillGates;
  timingEvalFrozen?: boolean;
};

export type { ShiftCommitEvalResult };

const pickShiftCommitTier = (
  tiers: SkillTierGate[],
  speedNorm: number,
  difficulty01: number,
  passageSampler: PassageFlowSampler,
  smoothRequiresCleanPassage: boolean
): { tierIndex: number; tier: SkillTierGate } | null => {
  'worklet';
  if (tiers.length === 0) return null;

  const tier0 = { tierIndex: 0, tier: tiers[0] };
  if (tiers.length === 1) {
    return tier0;
  }

  let best = tier0;
  for (let i = 1; i < tiers.length; i++) {
    const tier = tiers[i];
    const speedMin = tier.speedMin ?? 0;
    const diffMin = tier.diffMin ?? 0;
    if (speedNorm < speedMin || difficulty01 < diffMin) {
      continue;
    }
    if (smoothRequiresCleanPassage && !passageIsClean(passageSampler)) {
      continue;
    }
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

const resolvePassageSampler = (
  ctx: SteerPraiseContext
): PassageFlowSampler => {
  'worklet';
  return ctx.passageSampler ?? createDefaultPassageFlowSampler();
};

export const evaluateShiftCommit = (
  ctx: SteerPraiseContext
): ShiftCommitEvalResult => {
  'worklet';
  const family = ctx.tuning.families.steer_clean;
  const shiftPattern = family.patterns.shift_commit;
  const passageSampler = resolvePassageSampler(ctx);
  const gates =
    ctx.gates ??
    resolveSkillGates(ctx.difficulty01, ctx.speedNorm, ctx.tuning);

  const rejectReason = evaluateShiftCommitReject({
    history: ctx.history,
    current: ctx.current,
    passageSampler,
    gates,
    tuning: ctx.tuning,
    patternEnabled: shiftPattern?.enabled === true && family.enabled,
  });

  if (rejectReason !== null) {
    const tier = evaluatePassageTimingTier({
      passageSampler,
      crossQualified: ctx.current.crossQualified,
      rejectReason,
      timingFrozen: ctx.timingEvalFrozen,
    });
    return { tier, event: null, rejectReason };
  }

  const passageTier = evaluatePassageTimingTier({
    passageSampler,
    crossQualified: ctx.current.crossQualified,
    rejectReason: null,
    timingFrozen: ctx.timingEvalFrozen,
  });

  if (passageTier !== 'perfect') {
    return { tier: passageTier, event: null, rejectReason: null };
  }

  const lookback = shiftPattern?.maxLookbackRows ?? 2;
  const fullHistory = ctx.history.concat([ctx.current]);
  const hygiene01 = computeHygiene01(
    fullHistory,
    lookback,
    ctx.stitchSampler,
    ctx.tuning
  );
  const smoothRequiresCleanPassage =
    shiftPattern?.smoothRequiresCleanPassage !== false;
  const picked = pickShiftCommitTier(
    shiftPattern!.tiers,
    ctx.speedNorm,
    ctx.difficulty01,
    passageSampler,
    smoothRequiresCleanPassage
  );

  if (!picked) {
    return { tier: 'perfect', event: null, rejectReason: null };
  }

  return {
    tier: 'perfect',
    event: makeSteerEvent(
      'shift_commit',
      shiftPattern!.priority,
      family.priority,
      picked,
      ctx,
      hygiene01
    ),
    rejectReason: null,
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

  const shiftResult = evaluateShiftCommit(ctx);
  if (shiftResult.event) {
    candidates.push(shiftResult.event);
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
