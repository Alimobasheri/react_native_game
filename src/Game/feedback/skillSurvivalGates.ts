import type { SkillFeedbackTuning } from '@/config/skillFeedback';
import { isSwimmerColInGap } from '@/Game/feedback/gapTopology';
import type { RowCrossSnapshot } from '@/Game/feedback/skillFeedbackTypes';

export type ResolvedSkillGates = {
  difficulty01: number;
  adjacentForgiveness: number;
  forgiveWithoutSideBlockAboveDiff: number;
  minStepDelta: number;
  zigzagBreakMinDelta: number;
  surfMinNetDelta: number;
  surfMinRowSpan: number;
  steerCooldownMs: number;
  maxDirtyRowsInWindow: number;
  swimmerSteerMinSpanCols: number;
};

export const lerpSkillGate = (easy: number, hard: number, t: number): number => {
  'worklet';
  const clamped = Math.max(0, Math.min(1, t));
  return easy + (hard - easy) * clamped;
};

export const resolveSkillGates = (
  difficulty01: number,
  speedNorm: number,
  tuning: SkillFeedbackTuning
): ResolvedSkillGates => {
  'worklet';
  const ramp = tuning.survivalRamp;
  const diffT = Math.max(0, Math.min(1, difficulty01));
  const speedT = Math.max(0, Math.min(1, speedNorm));
  const intensity = Math.max(diffT, speedT);
  return {
    difficulty01: diffT,
    adjacentForgiveness: lerpSkillGate(
      ramp.adjacentForgivenessEasy,
      ramp.adjacentForgivenessHard,
      diffT
    ),
    forgiveWithoutSideBlockAboveDiff: ramp.forgiveWithoutSideBlockAboveDiff,
    minStepDelta: lerpSkillGate(ramp.minStepDeltaEasy, ramp.minStepDeltaHard, diffT),
    zigzagBreakMinDelta: lerpSkillGate(
      ramp.zigzagBreakMinDeltaEasy,
      ramp.zigzagBreakMinDeltaHard,
      diffT
    ),
    surfMinNetDelta: lerpSkillGate(
      ramp.surfMinNetDeltaEasy,
      ramp.surfMinNetDeltaHard,
      diffT
    ),
    surfMinRowSpan: lerpSkillGate(ramp.surfMinRowSpanEasy, ramp.surfMinRowSpanHard, diffT),
    steerCooldownMs: lerpSkillGate(
      ramp.steerCooldownMsEasy,
      ramp.steerCooldownMsHard,
      diffT
    ),
    maxDirtyRowsInWindow: Math.round(
      lerpSkillGate(ramp.maxDirtyRowsInWindowEasy, ramp.maxDirtyRowsInWindowHard, diffT)
    ),
    swimmerSteerMinSpanCols: lerpSkillGate(
      ramp.swimmerSteerMinSpanEasy,
      ramp.swimmerSteerMinSpanHard,
      intensity
    ),
  };
};

export const evaluateCleanCrossStrict = (
  gaps: readonly number[],
  swimmerCol: number,
  isPinned: boolean,
  isSideBlocked: boolean,
  tuning: SkillFeedbackTuning,
  adjacentForgiveness: number
): boolean => {
  'worklet';
  if (isPinned) return false;
  if (isSwimmerColInGap(gaps, swimmerCol, 0)) {
    return true;
  }
  if (
    tuning.cleanCross.allowForgivingSideScrape &&
    isSideBlocked &&
    isSwimmerColInGap(gaps, swimmerCol, adjacentForgiveness)
  ) {
    return true;
  }
  return false;
};

export const countDirtyRowsInHistory = (
  history: readonly RowCrossSnapshot[],
  lookback: number
): number => {
  'worklet';
  const slice = history.slice(-lookback);
  let count = 0;
  for (let i = 0; i < slice.length; i++) {
    if (!slice[i].cleanCross) count += 1;
  }
  return count;
};

export const evaluateCrossQualified = (
  gaps: readonly number[],
  swimmerCol: number,
  isPinned: boolean,
  isSideBlocked: boolean,
  gates: ResolvedSkillGates,
  history: readonly RowCrossSnapshot[],
  tuning: SkillFeedbackTuning
): boolean => {
  'worklet';
  if (isPinned) return false;

  const strictClean = evaluateCleanCrossStrict(
    gaps,
    swimmerCol,
    isPinned,
    isSideBlocked,
    tuning,
    gates.adjacentForgiveness
  );
  if (strictClean) return true;

  const forgiveCols = Math.max(0, Math.floor(gates.adjacentForgiveness));
  const nearGap = isSwimmerColInGap(gaps, swimmerCol, forgiveCols);
  if (!nearGap) return false;

  if (gates.difficulty01 >= gates.forgiveWithoutSideBlockAboveDiff) {
    return true;
  }

  const dirtyInWindow = countDirtyRowsInHistory(
    history,
    Math.max(1, gates.maxDirtyRowsInWindow + 1)
  );
  if (dirtyInWindow <= gates.maxDirtyRowsInWindow) {
    return true;
  }

  return false;
};
