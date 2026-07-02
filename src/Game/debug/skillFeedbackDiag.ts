/**
 * Skill praise diagnostics — ring buffer + LOG button dump (dev only).
 * All capture/dump helpers are worklet-safe unless noted.
 */

import type { ECS } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/ecs';
import type { ComponentStore } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/component';
import { firstDataFromStore } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/query';
import {
  GameplayFeedbackManagerComponentName,
  type GameplayFeedbackManagerData,
  type FeedbackFlashSlot,
} from '@/Game/ecs-components/GameplayFeedbackManager';
import {
  ObstaclesManagerComponentName,
  type ObstaclesManagerComponentData,
} from '@/Game/ecs-components/ObstaclesManager';
import {
  SwimmerComponentName,
  type SwimmerComponentData,
} from '@/Game/ecs-components/Swimmer';
import {
  WaterComponentName,
  type WaterComponentData,
} from '@/Game/ecs-components/Water';
import { gapDifficulty01FromTotalRows } from '@/config/gapDifficultyRamp';
import { skillFeedbackTuning } from '@/config/skillFeedback';
import { computeTutorialOpacity } from '@/Game/session/beginGameplay';
import { getGameSession } from '@/Game/session/gameSessionQuery';
import { isGameplayJuiceActive } from '@/Game/feedback/gameplayFeedbackGates';
import { computeHygiene01 } from '@/Game/feedback/hygieneScoring';
import { normalizeSpeed01 } from '@/Game/feedback/rowCrossEval';
import { resolveSkillGates } from '@/Game/feedback/skillSurvivalGates';
import type { ResolvedSkillGates } from '@/Game/feedback/skillSurvivalGates';
import type { RouterDropReason } from '@/Game/feedback/praiseRouter';
import type {
  PassageFlowSampler,
  RowCrossSnapshot,
  ShiftCommitRejectReason,
  SkillMomentId,
  SkillFamilyId,
  SkillPraiseEvent,
  StitchSampler,
} from '@/Game/feedback/skillFeedbackTypes';
import { passageSwimmerSteerSpan } from '@/Game/feedback/passageFlowScoring';
import { LAYOUT_CONSTANTS } from '@/Layout';

export const skillFeedbackDiagTuning = {
  ENABLED: typeof __DEV__ !== 'undefined' && __DEV__,
  RING_SIZE: 24,
  SHOW_BUTTON: true,
} as const;

const DIAG_RING_SIZE = skillFeedbackDiagTuning.RING_SIZE;

export type CompactCandidate = {
  momentId: SkillMomentId;
  familyId: SkillFamilyId;
  copy: string;
  tierIndex: number;
  hygiene01?: number;
};

export type CompactDrop = {
  momentId: SkillMomentId;
  familyId: SkillFamilyId;
  reason: RouterDropReason;
};

export type CompactContact = {
  pinned: boolean;
  sideBlocked: boolean;
  ceilingBrush: boolean;
  colliding: boolean;
  clearance01: number;
};

export type CompactStitch = {
  pinnedSeen: boolean;
  sideBlockedSeen: boolean;
  ceilingBrushSeen: boolean;
  collidingSeen: boolean;
  minClearanceSeen: number;
  minSwimmerColFracSeen: number;
  maxSwimmerColFracSeen: number;
};

export type CompactPassageFlow = {
  pinnedSeen: boolean;
  hardBlockSeen: boolean;
  softScrapeSeen: boolean;
  steerSpanCols: number;
};

export type SkillFeedbackDiagEntry =
  | {
    kind: 'row_cross';
    tMs: number;
    totalRows: number;
    difficulty01: number;
    speedNorm: number;
    raisingSpeed: number;
    branchKey: string;
    gaps: number[];
    swimmerCol: number;
    swimmerColFrac: number;
    crossQualified: boolean;
    cleanCross: boolean;
    contact: CompactContact;
    hygiene01: number;
    stitch: CompactStitch;
    passageFlow: CompactPassageFlow;
    skipSteerIdenticalGaps: boolean;
    shiftCommitReject?: ShiftCommitRejectReason;
    candidates: CompactCandidate[];
    routed: CompactCandidate[];
    dropped: CompactDrop[];
  }
  | {
    kind: 'praise_frame';
    tMs: number;
    pinned: boolean;
    ceilingBrush: boolean;
    candidates: CompactCandidate[];
    routed: CompactCandidate[];
    dropped: CompactDrop[];
  }
  | {
    kind: 'fired';
    tMs: number;
    copies: string[];
    bonuses: number[];
    totalBonus: number;
  };

export type CompactRowHistoryEntry = {
  branchKey: string;
  gaps: number[];
  swimmerCol: number;
  swimmerColFrac: number;
  crossQualified: boolean;
  cleanCross: boolean;
  contact: CompactContact;
  crossedAtMs: number;
};

export type SkillFeedbackDiagDump = {
  tag: 'SKILL_FEEDBACK_DIAG';
  exportedAtMs: number;
  preset: {
    lockedTemplateName?: string;
    storyLockedProceduralSegment?: string;
  };
  juiceActive: boolean;
  live: {
    totalRowsGenerated: number;
    difficulty01: number;
    raisingSpeed: number;
    speedNorm: number;
    swimmerColFrac: number;
    pinned: boolean;
    ceilingBrush: boolean;
    sideBlocked: boolean;
    movementBlockedThisFrame: boolean;
    sideBlockedDirection: number;
    clearance01: number;
    tutorialBlocked: boolean;
    sessionPhase?: string;
  };
  gates: ResolvedSkillGates;
  familyState: {
    cooldowns: Record<string, number>;
    fireCounts: Record<string, number>;
  };
  detectors: {
    nearMiss: {
      inThreat: boolean;
      firesThisRun: number;
      latchedInThreat: boolean;
    };
    zigzagTap: { streak: number; lastTapDir?: -1 | 1 };
    tapCoach: { wasPinned: boolean; pinEnterMs: number };
  };
  recentEvents: SkillFeedbackDiagEntry[];
  rowHistory: CompactRowHistoryEntry[];
  activeFlashes: string[];
};

export const compactCandidate = (e: SkillPraiseEvent): CompactCandidate => {
  'worklet';
  return {
    momentId: e.momentId,
    familyId: e.familyId,
    copy: e.copy,
    tierIndex: e.tierIndex,
    hygiene01: e.hygiene01,
  };
};

export const compactContact = (
  contact: RowCrossSnapshot['contact']
): CompactContact => {
  'worklet';
  return {
    pinned: contact.pinned,
    sideBlocked: contact.sideBlocked,
    ceilingBrush: contact.ceilingBrush,
    colliding: contact.colliding,
    clearance01: contact.clearance01,
  };
};

export const compactPassageFlow = (
  sampler: PassageFlowSampler
): CompactPassageFlow => {
  'worklet';
  return {
    pinnedSeen: sampler.pinnedSeen,
    hardBlockSeen: sampler.hardBlockSeen,
    softScrapeSeen: sampler.softScrapeSeen,
    steerSpanCols: passageSwimmerSteerSpan(sampler),
  };
};

export const compactStitch = (sampler: StitchSampler): CompactStitch => {
  'worklet';
  return {
    pinnedSeen: sampler.pinnedSeen,
    sideBlockedSeen: sampler.sideBlockedSeen,
    ceilingBrushSeen: sampler.ceilingBrushSeen,
    collidingSeen: sampler.collidingSeen,
    minClearanceSeen: sampler.minClearanceSeen,
    maxSwimmerColFracSeen: sampler.maxSwimmerColFracSeen,
    minSwimmerColFracSeen: sampler.minSwimmerColFracSeen,
  };
};

export const compactRowSnapshot = (
  snap: RowCrossSnapshot
): CompactRowHistoryEntry => {
  'worklet';
  return {
    branchKey: snap.branchKey,
    gaps: snap.rawGaps.slice(),
    swimmerCol: snap.swimmerCol,
    swimmerColFrac: snap.swimmerColFrac,
    crossQualified: snap.crossQualified,
    cleanCross: snap.cleanCross,
    contact: compactContact(snap.contact),
    crossedAtMs: snap.crossedAtMs,
  };
};

export const compactCandidatesFromEvents = (
  events: readonly SkillPraiseEvent[]
): CompactCandidate[] => {
  'worklet';
  const out: CompactCandidate[] = [];
  for (let i = 0; i < events.length; i++) {
    out.push(compactCandidate(events[i]));
  }
  return out;
};

export const copyStringsFromEvents = (
  events: readonly SkillPraiseEvent[]
): string[] => {
  'worklet';
  const out: string[] = [];
  for (let i = 0; i < events.length; i++) {
    out.push(events[i].copy);
  }
  return out;
};

export const compactRowHistoryFromSnapshots = (
  history: readonly RowCrossSnapshot[]
): CompactRowHistoryEntry[] => {
  'worklet';
  const out: CompactRowHistoryEntry[] = [];
  for (let i = 0; i < history.length; i++) {
    out.push(compactRowSnapshot(history[i]));
  }
  return out;
};

const copyFamilyCooldowns = (
  src: Partial<Record<SkillFamilyId, number>> | undefined
): Record<string, number> => {
  'worklet';
  const out: Record<string, number> = {};
  if (!src) return out;
  if (typeof src.snap_transfer === 'number') {
    out.snap_transfer = src.snap_transfer;
  }
  if (typeof src.near_miss === 'number') {
    out.near_miss = src.near_miss;
  }
  if (typeof src.zigzag_tap === 'number') {
    out.zigzag_tap = src.zigzag_tap;
  }
  if (typeof src.steer_clean === 'number') {
    out.steer_clean = src.steer_clean;
  }
  if (typeof src.pin_coach === 'number') {
    out.pin_coach = src.pin_coach;
  }
  return out;
};

const copyFamilyFireCounts = (
  src: Partial<Record<SkillFamilyId, number>> | undefined
): Record<string, number> => {
  'worklet';
  return copyFamilyCooldowns(src);
};

const copyDiagRing = (
  ring: SkillFeedbackDiagEntry[] | undefined
): SkillFeedbackDiagEntry[] => {
  'worklet';
  if (!ring || ring.length === 0) return [];
  const out: SkillFeedbackDiagEntry[] = [];
  for (let i = 0; i < ring.length; i++) {
    out.push(ring[i]);
  }
  return out;
};

const activeFlashTexts = (slots: FeedbackFlashSlot[]): string[] => {
  'worklet';
  const out: string[] = [];
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    if (slot.active && slot.text) {
      out.push(slot.text);
    }
  }
  return out;
};

export const appendDiagRing = (
  ring: SkillFeedbackDiagEntry[],
  entry: SkillFeedbackDiagEntry,
  maxSize?: number
): SkillFeedbackDiagEntry[] => {
  'worklet';
  if (maxSize === undefined) {
    maxSize = DIAG_RING_SIZE;
  }
  const next = ring.slice();
  next.push(entry);
  if (next.length > maxSize) {
    return next.slice(next.length - maxSize);
  }
  return next;
};

export const computeRowHygiene01 = (
  history: readonly RowCrossSnapshot[],
  stitchSampler: StitchSampler
): number => {
  'worklet';
  const lookback = Math.min(3, skillFeedbackTuning.HISTORY_BUFFER_SIZE);
  return computeHygiene01(
    history,
    lookback,
    stitchSampler,
    skillFeedbackTuning
  );
};

export const logSkillFeedbackDiagDump = (
  payload: SkillFeedbackDiagDump
): void => {
  'worklet';
  console.log('[SKILL_FEEDBACK_DIAG]\n' + JSON.stringify(payload, null, 2));
};

export const buildSkillFeedbackDiagDump = (
  ecs: ECS,
  components: Record<string, ComponentStore<unknown>>,
  sceneKey = 'game'
): SkillFeedbackDiagDump => {
  'worklet';

  const nowMs = Date.now();
  const session = getGameSession(components);
  const swimmerData = firstDataFromStore(
    components[SwimmerComponentName]
  ) as SwimmerComponentData | undefined;
  const waterData = firstDataFromStore(
    components[WaterComponentName]
  ) as WaterComponentData | undefined;
  const obstacleMgr = firstDataFromStore(
    components[ObstaclesManagerComponentName]
  ) as ObstaclesManagerComponentData | undefined;
  const feedbackMgr = firstDataFromStore(
    components[GameplayFeedbackManagerComponentName]
  ) as GameplayFeedbackManagerData | undefined;

  const totalRows = obstacleMgr?.totalRowsGenerated ?? 0;
  const difficulty01 = gapDifficulty01FromTotalRows(totalRows);
  const raisingSpeed = waterData?.raisingSpeed ?? 0;
  const speedNorm = normalizeSpeed01(
    raisingSpeed,
    skillFeedbackTuning.speedNormMax
  );
  const tutorialOpacity = session ? computeTutorialOpacity(session, nowMs) : 0;
  const isInInitialPhase = swimmerData?.isInInitialPhase ?? true;
  const juiceActive = isGameplayJuiceActive(
    session,
    isInInitialPhase,
    tutorialOpacity,
    skillFeedbackTuning.ENABLED
  );
  const gates = resolveSkillGates(difficulty01, speedNorm, skillFeedbackTuning);

  const columnCount = LAYOUT_CONSTANTS.COLUMNS;
  const containerWidth = swimmerData?.containerWidth ?? 1;
  const containerCenterX = swimmerData?.containerCenterX ?? 0;
  const swimmerX = swimmerData?.x ?? 0;
  const columnWidth = containerWidth / Math.max(1, columnCount);
  const left = containerCenterX - containerWidth / 2;
  const swimmerColFrac = Math.max(
    0,
    Math.min(columnCount - 1, (swimmerX - left) / Math.max(1e-6, columnWidth))
  );

  const skillFeedback = feedbackMgr?.skillFeedback;
  const rowHistory = skillFeedback?.rowHistory ?? [];

  return {
    tag: 'SKILL_FEEDBACK_DIAG',
    exportedAtMs: nowMs,
    preset: {
      lockedTemplateName: obstacleMgr?.lockedTemplateName,
      storyLockedProceduralSegment: obstacleMgr?.storyLockedProceduralSegment,
    },
    juiceActive,
    live: {
      totalRowsGenerated: totalRows,
      difficulty01,
      raisingSpeed,
      speedNorm,
      swimmerColFrac,
      pinned: swimmerData?.isPinnedFromAbove === true,
      ceilingBrush: swimmerData?.ceilingBrushThisFrame === true,
      sideBlocked: swimmerData?.isSideBlocked === true,
      movementBlockedThisFrame: swimmerData?.movementBlockedThisFrame === true,
      sideBlockedDirection: swimmerData?.sideBlockedDirection ?? 0,
      clearance01: swimmerData?.locomotion.clearance01 ?? 1,
      tutorialBlocked: tutorialOpacity > 0.01,
      sessionPhase: session?.phase,
    },
    gates,
    familyState: {
      cooldowns: copyFamilyCooldowns(skillFeedback?.familyCooldowns),
      fireCounts: copyFamilyFireCounts(skillFeedback?.familyFireCounts),
    },
    detectors: {
      nearMiss: {
        inThreat: skillFeedback?.nearMiss.inThreat ?? false,
        firesThisRun: skillFeedback?.nearMiss.firesThisRun ?? 0,
        latchedInThreat: skillFeedback?.nearMiss.latchedInThreat ?? false,
      },
      zigzagTap: {
        streak: skillFeedback?.zigzagTap.streak ?? 0,
        lastTapDir: skillFeedback?.zigzagTap.lastTapDir,
      },
      tapCoach: {
        wasPinned: skillFeedback?.tapCoach.wasPinned ?? false,
        pinEnterMs: skillFeedback?.tapCoach.pinEnterMs ?? 0,
      },
    },
    recentEvents: copyDiagRing(feedbackMgr?.diagRing),
    rowHistory: compactRowHistoryFromSnapshots(rowHistory),
    activeFlashes: feedbackMgr ? activeFlashTexts(feedbackMgr.slots) : [],
  };
};
