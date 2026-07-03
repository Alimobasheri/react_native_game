import { incrementFlowStreakValue } from '@/config/flowStreak';
import { centerDeltaCols } from '@/Game/feedback/gapTopology';
import { isWideOpenLane } from '@/Game/feedback/gapPathAnalysis';
import { evaluatePassageTimingTier } from '@/Game/feedback/passageTimingEval';
import type {
  FlowStreakBreakReason,
  FlowStreakState,
  PassageFlowSampler,
  PassageTimingTier,
  RowCrossSnapshot,
} from '@/Game/feedback/skillFeedbackTypes';

export const isGapShiftSeam = (
  prev: RowCrossSnapshot | undefined,
  current: RowCrossSnapshot,
  wideOpenWidth: number,
  shiftMin: number
): boolean => {
  'worklet';
  if (!prev) {
    return false;
  }
  const centerDelta = Math.abs(
    centerDeltaCols(current.topology, prev.topology)
  );
  const bothWideOpen =
    isWideOpenLane(prev.topology, wideOpenWidth) &&
    isWideOpenLane(current.topology, wideOpenWidth);
  if (bothWideOpen) {
    return false;
  }
  return centerDelta >= shiftMin;
};

export const evaluateSeamPassageTier = (
  passageSampler: PassageFlowSampler,
  crossQualified: boolean,
  timingFrozen: boolean
): PassageTimingTier | null => {
  'worklet';
  return evaluatePassageTimingTier({
    passageSampler,
    crossQualified,
    rejectReason: null,
    timingFrozen,
  });
};

export const breakFlowStreak = (
  state: FlowStreakState,
  reason: FlowStreakBreakReason,
  nowMs: number
): FlowStreakState => {
  'worklet';
  if (state.count === 0) {
    return state;
  }
  return {
    ...state,
    count: 0,
    lastBreakMs: nowMs,
    lastBreakReason: reason,
  };
};

export const incrementFlowStreak = (
  state: FlowStreakState,
  nowMs: number
): FlowStreakState => {
  'worklet';
  return {
    ...state,
    count: incrementFlowStreakValue(state.count),
    lastPerfectMs: nowMs,
  };
};

export const updateFlowStreakOnSeamCross = (
  state: FlowStreakState,
  tier: PassageTimingTier | null,
  nowMs: number
): FlowStreakState => {
  'worklet';
  if (tier === 'perfect') {
    return incrementFlowStreak(state, nowMs);
  }
  if (tier === 'acceptable') {
    return breakFlowStreak(state, 'acceptable', nowMs);
  }
  if (tier === 'failed') {
    return breakFlowStreak(state, 'failed', nowMs);
  }
  return state;
};

export const breakFlowStreakOnContact = (
  state: FlowStreakState,
  isPinned: boolean,
  movementBlocked: boolean,
  nowMs: number
): FlowStreakState => {
  'worklet';
  if (state.count === 0) {
    return state;
  }
  if (isPinned) {
    return breakFlowStreak(state, 'pinned', nowMs);
  }
  if (movementBlocked) {
    return breakFlowStreak(state, 'hard_block', nowMs);
  }
  return state;
};

/** Diag: -1 break, 0 neutral, 1 increment. */
export const flowStreakDeltaFromUpdate = (
  before: number,
  after: number
): -1 | 0 | 1 => {
  'worklet';
  if (after > before) {
    return 1;
  }
  if (after < before) {
    return -1;
  }
  return 0;
};
