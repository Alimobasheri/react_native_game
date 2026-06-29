import { normalizeGapColumns } from '@/Game/path/swimmerGrid';

export type GapTopology = {
  gaps: number[];
  width: number;
  center: number;
  left: number;
  right: number;
};

export const gapsEqual = (
  a: readonly number[] | undefined,
  b: readonly number[] | undefined
): boolean => {
  'worklet';
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

export const gapsOverlap = (
  a: readonly number[],
  b: readonly number[]
): boolean => {
  'worklet';
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      if (a[i] === b[j]) return true;
    }
  }
  return false;
};

/** Signed center delta in column units (current minus previous). */
export const centerDeltaCols = (
  current: GapTopology,
  previous: GapTopology
): number => {
  'worklet';
  return current.center - previous.center;
};

export const topologyFromGaps = (
  gaps: readonly number[],
  columnCount: number
): GapTopology => {
  'worklet';
  const normalized = normalizeGapColumns(gaps, columnCount);
  if (normalized.length === 0) {
    return { gaps: [], width: 0, center: columnCount / 2, left: 0, right: -1 };
  }
  const left = normalized[0];
  const right = normalized[normalized.length - 1];
  const width = normalized.length;
  const center = (left + right) / 2;
  return { gaps: normalized, width, center, left, right };
};

const contiguousGapRuns = (normalized: readonly number[]): number[][] => {
  'worklet';
  if (normalized.length === 0) return [];
  const runs: number[][] = [];
  let run: number[] = [normalized[0]];
  for (let i = 1; i < normalized.length; i++) {
    if (normalized[i] === normalized[i - 1] + 1) {
      run.push(normalized[i]);
    } else {
      runs.push(run);
      run = [normalized[i]];
    }
  }
  runs.push(run);
  return runs;
};

/**
 * Lane cluster topology for path-based skill praise.
 * Returns the full contiguous gap cluster the swimmer is in (or nearest cluster if outside).
 */
export const laneClusterTopology = (
  gaps: readonly number[],
  columnCount: number,
  swimmerCol: number
): GapTopology => {
  'worklet';
  const normalized = normalizeGapColumns(gaps, columnCount);
  if (normalized.length === 0) {
    return topologyFromGaps(gaps, columnCount);
  }

  const runs = contiguousGapRuns(normalized);
  for (let r = 0; r < runs.length; r++) {
    const cluster = runs[r];
    if (cluster.includes(swimmerCol)) {
      return topologyFromGaps(cluster, columnCount);
    }
  }

  let bestCluster: number[] = runs[0];
  let bestDist = Number.POSITIVE_INFINITY;
  for (let r = 0; r < runs.length; r++) {
    const cluster = runs[r];
    const clusterCenter = (cluster[0] + cluster[cluster.length - 1]) / 2;
    const dist = Math.abs(clusterCenter - swimmerCol);
    if (dist < bestDist) {
      bestDist = dist;
      bestCluster = cluster;
    }
  }
  return topologyFromGaps(bestCluster, columnCount);
};

/** @deprecated Use laneClusterTopology — kept for imports during migration. */
export const topologyForSwimmerColumn = laneClusterTopology;

export const isSwimmerColInGap = (
  gaps: readonly number[],
  swimmerCol: number,
  adjacentForgiveness: number
): boolean => {
  'worklet';
  for (let i = 0; i < gaps.length; i++) {
    if (Math.abs(gaps[i] - swimmerCol) <= adjacentForgiveness) {
      return true;
    }
  }
  return false;
};
