import { LAYOUT_CONSTANTS } from '@/Layout';
import {
  isSwimmerColInGap,
  topologyForSwimmerColumn,
} from '@/Game/feedback/gapTopology';
import type { SkillFeedbackTuning } from '@/config/skillFeedback';
import type { RowCrossSnapshot } from '@/Game/feedback/skillFeedbackTypes';

export const swimmerWorldXToColumn = (
  swimmerX: number,
  containerCenterX: number,
  containerWidth: number,
  columnCount: number = LAYOUT_CONSTANTS.COLUMNS
): number => {
  'worklet';
  const left = containerCenterX - containerWidth / 2;
  const columnWidth = containerWidth / columnCount;
  const col = Math.floor((swimmerX - left) / columnWidth);
  return Math.max(0, Math.min(columnCount - 1, col));
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
  if (isPinned) return false;
  const forgiveness = tuning.cleanCross.adjacentColumnForgiveness;
  if (isSwimmerColInGap(gaps, swimmerCol, 0)) {
    return true;
  }
  if (
    tuning.cleanCross.allowForgivingSideScrape &&
    isSideBlocked &&
    isSwimmerColInGap(gaps, swimmerCol, forgiveness)
  ) {
    return true;
  }
  return false;
};

export const buildRowCrossSnapshot = (
  gaps: readonly number[],
  columnCount: number,
  swimmerCol: number,
  branchKey: string,
  crossedAtMs: number,
  isPinned: boolean,
  isSideBlocked: boolean,
  tuning: SkillFeedbackTuning
): RowCrossSnapshot => {
  'worklet';
  const topology = topologyForSwimmerColumn(gaps, columnCount, swimmerCol);
  return {
    topology,
    branchKey,
    crossedAtMs,
    swimmerCol,
    cleanCross: evaluateCleanCross(
      gaps,
      columnCount,
      swimmerCol,
      isPinned,
      isSideBlocked,
      tuning
    ),
  };
};

export const normalizeSpeed01 = (
  raisingSpeed: number,
  speedNormMax: number
): number => {
  'worklet';
  return Math.max(0, Math.min(1, raisingSpeed / Math.max(1, speedNormMax)));
};
