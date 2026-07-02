import { centerDeltaCols } from '@/Game/feedback/gapTopology';
import {
  hasSwimmerSteerProof,
  isWideOpenLane,
  swimmerColDeltaAbs,
} from '@/Game/feedback/gapPathAnalysis';
import type { SkillFeedbackTuning } from '@/config/skillFeedback';
import type {
  PassageFlowSampler,
  RowCrossSnapshot,
  ShiftCommitRejectReason,
} from '@/Game/feedback/skillFeedbackTypes';
import type { ResolvedSkillGates } from '@/Game/feedback/skillSurvivalGates';

export type PassageFlowFrameSample = {
  pinned: boolean;
  movementBlocked: boolean;
  sideBlocked: boolean;
  colliding: boolean;
  swimmerColFrac: number;
};

export const createDefaultPassageFlowSampler = (): PassageFlowSampler => {
  'worklet';
  return {
    pinnedSeen: false,
    hardBlockSeen: false,
    softScrapeSeen: false,
    /** min > max means no samples yet — avoids Infinity in worklets. */
    minSwimmerColFracSeen: 1,
    maxSwimmerColFracSeen: 0,
  };
};

export const resetPassageFlowSampler = (): PassageFlowSampler => {
  'worklet';
  return createDefaultPassageFlowSampler();
};

export const updatePassageFlowSampler = (
  sampler: PassageFlowSampler,
  sample: PassageFlowFrameSample
): PassageFlowSampler => {
  'worklet';
  const colFrac = Math.max(0, sample.swimmerColFrac);
  const empty = sampler.minSwimmerColFracSeen > sampler.maxSwimmerColFracSeen;

  let hardBlockSeen = sampler.hardBlockSeen;
  let softScrapeSeen = sampler.softScrapeSeen;
  let pinnedSeen = sampler.pinnedSeen;

  if (sample.pinned) {
    pinnedSeen = true;
  }
  if (sample.movementBlocked) {
    hardBlockSeen = true;
  } else if (sample.sideBlocked || sample.colliding) {
    softScrapeSeen = true;
  }

  return {
    pinnedSeen,
    hardBlockSeen,
    softScrapeSeen,
    minSwimmerColFracSeen: empty
      ? colFrac
      : Math.min(sampler.minSwimmerColFracSeen, colFrac),
    maxSwimmerColFracSeen: empty
      ? colFrac
      : Math.max(sampler.maxSwimmerColFracSeen, colFrac),
  };
};

export const passageSwimmerSteerSpan = (
  sampler: PassageFlowSampler
): number => {
  'worklet';
  if (sampler.minSwimmerColFracSeen > sampler.maxSwimmerColFracSeen) {
    return 0;
  }
  return Math.max(
    0,
    sampler.maxSwimmerColFracSeen - sampler.minSwimmerColFracSeen
  );
};

export const passageFlowIntact = (sampler: PassageFlowSampler): boolean => {
  'worklet';
  return !sampler.pinnedSeen && !sampler.hardBlockSeen;
};

export const passageIsClean = (sampler: PassageFlowSampler): boolean => {
  'worklet';
  return passageFlowIntact(sampler) && !sampler.softScrapeSeen;
};

/** Passage-aware steer proof for shift_commit between two row crosses. */
export const hasPassageSteerProof = (
  prev: RowCrossSnapshot | undefined,
  current: RowCrossSnapshot,
  sampler: PassageFlowSampler,
  minSpanCols: number
): boolean => {
  'worklet';
  const span = passageSwimmerSteerSpan(sampler);
  if (span >= minSpanCols) {
    return true;
  }
  if (prev && swimmerColDeltaAbs(current, prev) >= Math.max(1, Math.ceil(minSpanCols))) {
    return true;
  }
  return false;
};

export type ShiftCommitEvalContext = {
  history: readonly RowCrossSnapshot[];
  current: RowCrossSnapshot;
  passageSampler: PassageFlowSampler;
  gates: ResolvedSkillGates;
  tuning: SkillFeedbackTuning;
  patternEnabled: boolean;
};

export const evaluateShiftCommitReject = (
  ctx: ShiftCommitEvalContext
): ShiftCommitRejectReason | null => {
  'worklet';
  if (!ctx.patternEnabled) {
    return 'pattern_disabled';
  }
  if (ctx.current.contact.pinned) {
    return 'payoff_pinned';
  }
  if (!ctx.current.crossQualified) {
    return 'not_cross_qualified';
  }

  const prev =
    ctx.history.length > 0 ? ctx.history[ctx.history.length - 1] : undefined;
  if (!prev) {
    return 'no_prev_row';
  }

  if (ctx.passageSampler.pinnedSeen) {
    return 'flow_pinned';
  }
  if (ctx.passageSampler.hardBlockSeen) {
    return 'flow_hard_block';
  }

  const wideOpenWidth = ctx.tuning.pathGates.wideOpenLaneWidth;
  const shiftMin =
    ctx.tuning.families.steer_clean.patterns.shift_commit.minCenterDeltaCols ?? 1;
  const centerDelta = Math.abs(
    centerDeltaCols(ctx.current.topology, prev.topology)
  );
  const bothWideOpen =
    isWideOpenLane(prev.topology, wideOpenWidth) &&
    isWideOpenLane(ctx.current.topology, wideOpenWidth);

  if (!bothWideOpen && centerDelta < shiftMin) {
    return 'no_topology_shift';
  }
  if (bothWideOpen) {
    return 'wide_open';
  }

  const minSteerSpan = ctx.gates.swimmerSteerMinSpanCols;
  if (!hasPassageSteerProof(prev, ctx.current, ctx.passageSampler, minSteerSpan)) {
    return 'no_steer_proof';
  }

  return null;
};
