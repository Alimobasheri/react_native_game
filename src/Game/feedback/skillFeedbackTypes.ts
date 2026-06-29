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

export type RowCrossContact = {
  sideBlocked: boolean;
  ceilingBrush: boolean;
  colliding: boolean;
  pinned: boolean;
  clearance01: number;
};

export type RowCrossSnapshot = {
  /** Normalized full row gaps — runway dedupe only. */
  rawGaps: number[];
  /** Lane cluster topology — all path detection. */
  topology: GapTopology;
  branchKey: string;
  crossedAtMs: number;
  swimmerCol: number;
  /** Fractional column at row cross — sub-column resolution when water speed outpaces integer col updates. */
  swimmerColFrac: number;
  cleanCross: boolean;
  contact: RowCrossContact;
  crossQualified: boolean;
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
  /** Wave 2: cross-hygiene score for tier upgrade and +N scaling. */
  hygiene01?: number;
};

export type StitchSampler = {
  ceilingBrushSeen: boolean;
  sideBlockedSeen: boolean;
  pinnedSeen: boolean;
  collidingSeen: boolean;
  minClearanceSeen: number;
  /** Per-frame min/max fractional column — catches steer between row-cross snapshots. */
  minSwimmerColFracSeen: number;
  maxSwimmerColFracSeen: number;
};

export type ContactWindowState = {
  rowsSinceReset: number;
  stitchSampler: StitchSampler;
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
  contactWindow: ContactWindowState;
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
    collidingSeen: false,
    minClearanceSeen: 1,
    /** min > max means no samples yet — avoids Infinity in worklets. */
    minSwimmerColFracSeen: 1,
    maxSwimmerColFracSeen: 0,
  };
};

export const createDefaultContactWindowState = (): ContactWindowState => {
  'worklet';
  return {
    rowsSinceReset: 0,
    stitchSampler: createDefaultStitchSampler(),
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
    contactWindow: createDefaultContactWindowState(),
    tapCoach: createDefaultTapCoachState(),
    ceilingDodge: createDefaultCeilingDodgeState(),
    familyCooldowns: {},
    familyFireCounts: {},
  };
};

export const defaultRowCrossContact = (
  overrides: Partial<RowCrossContact> = {}
): RowCrossContact => {
  'worklet';
  return {
    sideBlocked: false,
    ceilingBrush: false,
    colliding: false,
    pinned: false,
    clearance01: 1,
    ...overrides,
  };
};
