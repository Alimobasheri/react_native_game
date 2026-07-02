import type { GapTopology } from '@/Game/feedback/gapTopology';

export type SkillFamilyId =
  | 'snap_transfer'
  | 'near_miss'
  | 'zigzag_tap'
  | 'steer_clean'
  | 'pin_coach';

export type SkillMomentId =
  | 'pinhole_flare_snap'
  | 'shift_commit'
  | 'slalom_block'
  | 'cross_sweep'
  | 'fork_clean'
  | 'near_miss'
  | 'zigzag_tap'
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
  /** When true, clearance01 does not scale +N bonus. */
  bonusIgnoreClearance?: boolean;
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

/** Per-row passage window for shift_commit (NICE!) — reset each row cross. */
export type PassageFlowSampler = {
  pinnedSeen: boolean;
  hardBlockSeen: boolean;
  softScrapeSeen: boolean;
  minSwimmerColFracSeen: number;
  maxSwimmerColFracSeen: number;
};

export type ShiftCommitRejectReason =
  | 'no_prev_row'
  | 'no_topology_shift'
  | 'wide_open'
  | 'no_steer_proof'
  | 'flow_pinned'
  | 'flow_hard_block'
  | 'pattern_disabled'
  | 'payoff_pinned'
  | 'not_cross_qualified';

export type ContactWindowState = {
  rowsSinceReset: number;
  stitchSampler: StitchSampler;
  passageFlow: PassageFlowSampler;
};

export type TapCoachState = {
  wasPinned: boolean;
  lastTapFlashMs: number;
  pinAnchorX?: number;
  lastSavedMs: number;
  pinSessionStartX?: number;
  pinEnterMs: number;
};

export type NearMissState = {
  inThreat: boolean;
  threatStartMs: number;
  latchedInThreat: boolean;
  pinEnterMs: number;
  lastQualifyingTapMs: number;
  lastQualifyingTapDir?: -1 | 1;
  lastFireMs: number;
  firesThisRun: number;
};

export type ZigzagTapState = {
  streak: number;
  lastTapDir?: -1 | 1;
  lastTapMs: number;
  lastProcessedTapMs: number;
  lastFireMs: number;
};

export type SkillFeedbackState = {
  lastCenterRowEntity?: number;
  rowHistory: RowCrossSnapshot[];
  contactWindow: ContactWindowState;
  tapCoach: TapCoachState;
  nearMiss: NearMissState;
  zigzagTap: ZigzagTapState;
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

export const createDefaultPassageFlowSampler = (): PassageFlowSampler => {
  'worklet';
  return {
    pinnedSeen: false,
    hardBlockSeen: false,
    softScrapeSeen: false,
    minSwimmerColFracSeen: 1,
    maxSwimmerColFracSeen: 0,
  };
};

export const createDefaultContactWindowState = (): ContactWindowState => {
  'worklet';
  return {
    rowsSinceReset: 0,
    stitchSampler: createDefaultStitchSampler(),
    passageFlow: createDefaultPassageFlowSampler(),
  };
};

export const createDefaultTapCoachState = (): TapCoachState => {
  'worklet';
  return {
    wasPinned: false,
    lastTapFlashMs: 0,
    lastSavedMs: 0,
    pinEnterMs: 0,
  };
};

export const createDefaultNearMissState = (): NearMissState => {
  'worklet';
  return {
    inThreat: false,
    threatStartMs: 0,
    latchedInThreat: false,
    pinEnterMs: 0,
    lastQualifyingTapMs: 0,
    lastFireMs: 0,
    firesThisRun: 0,
  };
};

export const createDefaultZigzagTapState = (): ZigzagTapState => {
  'worklet';
  return {
    streak: 0,
    lastTapMs: 0,
    lastProcessedTapMs: 0,
    lastFireMs: 0,
  };
};

export const createDefaultSkillFeedbackState = (): SkillFeedbackState => {
  'worklet';
  return {
    rowHistory: [],
    contactWindow: createDefaultContactWindowState(),
    tapCoach: createDefaultTapCoachState(),
    nearMiss: createDefaultNearMissState(),
    zigzagTap: createDefaultZigzagTapState(),
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
