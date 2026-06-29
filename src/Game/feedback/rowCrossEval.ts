import { LAYOUT_CONSTANTS } from '@/Layout';
import { normalizeGapColumns } from '@/Game/path/swimmerGrid';
import {
  isSwimmerColInGap,
  laneClusterTopology,
} from '@/Game/feedback/gapTopology';
import {
  evaluateCleanCrossStrict,
  evaluateCrossQualified,
  type ResolvedSkillGates,
} from '@/Game/feedback/skillSurvivalGates';
import type { SkillFeedbackTuning } from '@/config/skillFeedback';
import type {
  RowCrossContact,
  RowCrossSnapshot,
} from '@/Game/feedback/skillFeedbackTypes';

/** Fractional column index — sub-column resolution for high-speed steer stitching. */
export const swimmerWorldXToColumnFrac = (
  swimmerX: number,
  containerCenterX: number,
  containerWidth: number,
  columnCount: number = LAYOUT_CONSTANTS.COLUMNS
): number => {
  'worklet';
  const left = containerCenterX - containerWidth / 2;
  const columnWidth = containerWidth / columnCount;
  const col = (swimmerX - left) / Math.max(1e-6, columnWidth);
  return Math.max(0, Math.min(columnCount - 1, col));
};

export const swimmerWorldXToColumn = (
  swimmerX: number,
  containerCenterX: number,
  containerWidth: number,
  columnCount: number = LAYOUT_CONSTANTS.COLUMNS
): number => {
  'worklet';
  return Math.floor(
    swimmerWorldXToColumnFrac(swimmerX, containerCenterX, containerWidth, columnCount)
  );
};

export const evaluateCleanCross = (
  gaps: readonly number[],
  columnCount: number,
  swimmerCol: number,
  isPinned: boolean,
  isSideBlocked: boolean,
  tuning: SkillFeedbackTuning
): boolean => {
  'worklet';
  const forgiveness = tuning.cleanCross.adjacentColumnForgiveness;
  return evaluateCleanCrossStrict(
    gaps,
    swimmerCol,
    isPinned,
    isSideBlocked,
    tuning,
    forgiveness
  );
};

export type BuildRowCrossExtras = {
  ceilingBrush: boolean;
  colliding: boolean;
  clearance01: number;
};

export const buildRowCrossSnapshot = (
  gaps: readonly number[],
  columnCount: number,
  swimmerCol: number,
  swimmerColFrac: number,
  branchKey: string,
  crossedAtMs: number,
  isPinned: boolean,
  isSideBlocked: boolean,
  tuning: SkillFeedbackTuning,
  gates: ResolvedSkillGates,
  history: readonly RowCrossSnapshot[],
  extras: BuildRowCrossExtras
): RowCrossSnapshot => {
  'worklet';
  const rawGaps = normalizeGapColumns(gaps, columnCount);
  const topology = laneClusterTopology(gaps, columnCount, swimmerCol);
  const contact: RowCrossContact = {
    sideBlocked: isSideBlocked,
    ceilingBrush: extras.ceilingBrush,
    colliding: extras.colliding,
    pinned: isPinned,
    clearance01: Math.max(0, Math.min(1, extras.clearance01)),
  };
  const cleanCross = evaluateCleanCrossStrict(
    gaps,
    swimmerCol,
    isPinned,
    isSideBlocked,
    tuning,
    tuning.cleanCross.adjacentColumnForgiveness
  );
  const crossQualified = evaluateCrossQualified(
    gaps,
    swimmerCol,
    isPinned,
    isSideBlocked,
    gates,
    history,
    tuning
  );
  return {
    rawGaps,
    topology,
    branchKey,
    crossedAtMs,
    swimmerCol,
    swimmerColFrac,
    cleanCross,
    contact,
    crossQualified,
  };
};

export const normalizeSpeed01 = (
  raisingSpeed: number,
  speedNormMax: number
): number => {
  'worklet';
  return Math.max(0, Math.min(1, raisingSpeed / Math.max(1, speedNormMax)));
};
