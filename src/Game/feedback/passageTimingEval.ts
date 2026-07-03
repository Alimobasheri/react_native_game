import {
  passageFlowIntact,
  passageIsClean,
} from '@/Game/feedback/passageFlowScoring';
import type {
  PassageFlowSampler,
  PassageTimingTier,
  ShiftCommitRejectReason,
} from '@/Game/feedback/skillFeedbackTypes';
import type { GameSessionComponentData } from '@/Game/ecs-components/GameSession';
import { isSessionSpeedRampActive } from '@/Game/session/beginGameplay';

export type PassageTimingEvalInput = {
  passageSampler: PassageFlowSampler;
  crossQualified: boolean;
  rejectReason: ShiftCommitRejectReason | null;
  timingFrozen?: boolean;
};

const isFailedShiftRejectReason = (
  reason: ShiftCommitRejectReason
): boolean => {
  'worklet';
  return (
    reason === 'flow_pinned' ||
    reason === 'flow_hard_block' ||
    reason === 'payoff_pinned'
  );
};

export { isFailedShiftRejectReason };

export const isPassageTimingEvalFrozen = (
  session: GameSessionComponentData | undefined,
  nowMs: number
): boolean => {
  'worklet';
  if (!session) {
    return false;
  }
  return isSessionSpeedRampActive(session, nowMs);
};

export const evaluatePassageTimingTier = (
  input: PassageTimingEvalInput
): PassageTimingTier | null => {
  'worklet';
  const { passageSampler, crossQualified, rejectReason, timingFrozen } = input;

  if (rejectReason !== null) {
    if (isFailedShiftRejectReason(rejectReason)) {
      return 'failed';
    }
    return null;
  }

  if (passageSampler.pinnedSeen || passageSampler.hardBlockSeen) {
    return 'failed';
  }

  if (!crossQualified || !passageFlowIntact(passageSampler)) {
    return null;
  }

  if (!passageIsClean(passageSampler)) {
    return 'acceptable';
  }

  if (timingFrozen) {
    return 'acceptable';
  }

  return 'perfect';
};
