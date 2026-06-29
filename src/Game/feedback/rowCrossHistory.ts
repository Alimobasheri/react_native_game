import { gapsEqual } from '@/Game/feedback/gapTopology';
import type { RowCrossSnapshot } from '@/Game/feedback/skillFeedbackTypes';

export const appendRowCrossSnapshot = (
  history: RowCrossSnapshot[],
  snapshot: RowCrossSnapshot,
  maxSize: number
): RowCrossSnapshot[] => {
  'worklet';
  const last = history.length > 0 ? history[history.length - 1] : undefined;
  if (last && gapsEqual(last.rawGaps, snapshot.rawGaps)) {
    return history;
  }
  const next = history.concat([snapshot]);
  if (next.length <= maxSize) {
    return next;
  }
  return next.slice(next.length - maxSize);
};

export const lastHistorySnapshot = (
  history: readonly RowCrossSnapshot[]
): RowCrossSnapshot | undefined => {
  'worklet';
  return history.length > 0 ? history[history.length - 1] : undefined;
};

/** @deprecated Use lastHistorySnapshot */
export const lastHistoryTopology = lastHistorySnapshot;

export const shouldSkipSteerOnIdenticalGaps = (
  history: readonly RowCrossSnapshot[],
  currentRawGaps: readonly number[],
  skipEnabled: boolean
): boolean => {
  'worklet';
  if (!skipEnabled) return false;
  const last = lastHistorySnapshot(history);
  if (!last) return false;
  return gapsEqual(last.rawGaps, currentRawGaps);
};

export const recentPinholeInHistory = (
  history: readonly RowCrossSnapshot[],
  pinholeMaxWidth: number,
  lookback: number
): boolean => {
  'worklet';
  const start = Math.max(0, history.length - lookback);
  for (let i = history.length - 1; i >= start; i--) {
    if (history[i].topology.width <= pinholeMaxWidth) {
      return true;
    }
  }
  return false;
};
