import type { SkillFeedbackTuning } from '@/config/skillFeedback';
import {
  resetPassageFlowSampler,
  updatePassageFlowSampler,
  type PassageFlowFrameSample,
} from '@/Game/feedback/passageFlowScoring';
import {
  createDefaultContactWindowState,
  type ContactWindowState,
  type RowCrossSnapshot,
  type StitchSampler,
} from '@/Game/feedback/skillFeedbackTypes';

export type ContactFrameSample = {
  sideBlocked: boolean;
  ceilingBrush: boolean;
  colliding: boolean;
  pinned: boolean;
  clearance01: number;
  swimmerColFrac: number;
  movementBlocked?: boolean;
};

export const resetContactWindow = (): ContactWindowState => {
  'worklet';
  return createDefaultContactWindowState();
};

export const updateStitchSampler = (
  sampler: StitchSampler,
  sample: ContactFrameSample
): StitchSampler => {
  'worklet';
  const clearance = Math.max(0, Math.min(1, sample.clearance01));
  const colFrac = Math.max(0, sample.swimmerColFrac);
  const empty = sampler.minSwimmerColFracSeen > sampler.maxSwimmerColFracSeen;
  return {
    ceilingBrushSeen: sampler.ceilingBrushSeen || sample.ceilingBrush,
    sideBlockedSeen: sampler.sideBlockedSeen || sample.sideBlocked,
    pinnedSeen: sampler.pinnedSeen || sample.pinned,
    collidingSeen: sampler.collidingSeen || sample.colliding,
    minClearanceSeen: Math.min(sampler.minClearanceSeen, clearance),
    minSwimmerColFracSeen: empty
      ? colFrac
      : Math.min(sampler.minSwimmerColFracSeen, colFrac),
    maxSwimmerColFracSeen: empty
      ? colFrac
      : Math.max(sampler.maxSwimmerColFracSeen, colFrac),
  };
};

export const updateContactWindow = (
  window: ContactWindowState,
  sample: ContactFrameSample
): ContactWindowState => {
  'worklet';
  const passageSample: PassageFlowFrameSample = {
    pinned: sample.pinned,
    movementBlocked: sample.movementBlocked === true,
    sideBlocked: sample.sideBlocked,
    colliding: sample.colliding,
    swimmerColFrac: sample.swimmerColFrac,
  };
  return {
    ...window,
    stitchSampler: updateStitchSampler(window.stitchSampler, sample),
    passageFlow: updatePassageFlowSampler(window.passageFlow, passageSample),
  };
};

export const computeHygiene01 = (
  history: readonly RowCrossSnapshot[],
  lookbackRows: number,
  stitchSampler: StitchSampler,
  tuning: SkillFeedbackTuning
): number => {
  'worklet';
  const cfg = tuning.hygiene;
  if (cfg.pinnedInWindowDisqualify && stitchSampler.pinnedSeen) {
    return 0;
  }

  let hygiene = 1;

  if (stitchSampler.sideBlockedSeen) {
    hygiene -= cfg.sideBlockedPenalty;
  }
  if (stitchSampler.ceilingBrushSeen) {
    hygiene -= cfg.ceilingBrushPenalty;
  }
  if (stitchSampler.collidingSeen) {
    hygiene -= cfg.collidingPenalty;
  }

  const slice = history.slice(-Math.max(1, lookbackRows));
  if (slice.length > 0) {
    let clearanceSum = 0;
    for (let i = 0; i < slice.length; i++) {
      clearanceSum += slice[i].contact.clearance01;
    }
    const avgClearance = clearanceSum / slice.length;
    hygiene = hygiene * (0.5 + avgClearance * 0.5);
    hygiene = Math.min(hygiene, stitchSampler.minClearanceSeen + 0.15);
  }

  return Math.max(0, Math.min(1, hygiene));
};

export const canUpgradeTier = (
  hygiene01: number,
  tierIndex: number,
  tuning: SkillFeedbackTuning
): boolean => {
  'worklet';
  if (tierIndex <= 0) return true;
  return hygiene01 >= tuning.hygiene.tierUpgradeMin;
};
