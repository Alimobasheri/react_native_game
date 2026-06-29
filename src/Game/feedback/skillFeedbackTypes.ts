import type { GapTopology } from '@/Game/feedback/gapTopology';

export type SkillFamilyId =
  | 'snap_transfer'
  | 'ceiling_dodge'
  | 'steer_clean'
  | 'pin_coach';

export type SkillMomentId =
  | 'pinhole_flare_snap'
  | 'shift_commit'
  | 'zigzag_chain'
  | 'slalom_block'
  | 'cross_sweep'
  | 'funnel_thread'
  | 'fork_clean'
  | 'ceiling_brush'
  | 'tap_coach'
  | 'pin_saved';

export type RowCrossSnapshot = {
  topology: GapTopology;
  branchKey: string;
  crossedAtMs: number;
  swimmerCol: number;
  cleanCross: boolean;
};

export type SkillPraiseEvent = {
  familyId: SkillFamilyId;
  momentId: SkillMomentId;
  copy: string;
  tierIndex: number;
  bonusMin: number;
  bonusMax: number;
  priority: number;
  anchorX: number;
  anchorY: number;
  /** TAP refresh can reuse an existing slot with the same copy. */
  refreshExistingTap?: boolean;
};

export type StitchSampler = {
  ceilingBrushSeen: boolean;
  sideBlockedSeen: boolean;
  pinnedSeen: boolean;
};

export type TapCoachState = {
  wasPinned: boolean;
  lastTapFlashMs: number;
  pinAnchorX?: number;
  lastSavedMs: number;
  pinSessionStartX?: number;
};

export type CeilingDodgeState = {
  wasBrushing: boolean;
  lastFireMs: number;
  firesThisRun: number;
};

export type SkillFeedbackState = {
  lastCenterRowEntity?: number;
  rowHistory: RowCrossSnapshot[];
  stitchSampler: StitchSampler;
  tapCoach: TapCoachState;
  ceilingDodge: CeilingDodgeState;
  familyCooldowns: Partial<Record<SkillFamilyId, number>>;
  familyFireCounts: Partial<Record<SkillFamilyId, number>>;
};

export const createDefaultStitchSampler = (): StitchSampler => {
  'worklet';
  return {
    ceilingBrushSeen: false,
    sideBlockedSeen: false,
    pinnedSeen: false,
  };
};

export const createDefaultTapCoachState = (): TapCoachState => {
  'worklet';
  return {
    wasPinned: false,
    lastTapFlashMs: 0,
    lastSavedMs: 0,
  };
};

export const createDefaultCeilingDodgeState = (): CeilingDodgeState => {
  'worklet';
  return {
    wasBrushing: false,
    lastFireMs: 0,
    firesThisRun: 0,
  };
};

export const createDefaultSkillFeedbackState = (): SkillFeedbackState => {
  'worklet';
  return {
    rowHistory: [],
    stitchSampler: createDefaultStitchSampler(),
    tapCoach: createDefaultTapCoachState(),
    ceilingDodge: createDefaultCeilingDodgeState(),
    familyCooldowns: {},
    familyFireCounts: {},
  };
};
