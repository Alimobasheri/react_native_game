import {
  centerDeltaCols,
  type GapTopology,
} from '@/Game/feedback/gapTopology';
import type {
  RowCrossSnapshot,
  StitchSampler,
} from '@/Game/feedback/skillFeedbackTypes';

export type GapCenterDelta = {
  delta: number;
  sign: 1 | -1;
};

/** Horizontal travel seen in per-frame stitch window (fractional columns). */
export const swimmerSteerSpanCols = (sampler: StitchSampler): number => {
  'worklet';
  if (sampler.minSwimmerColFracSeen > sampler.maxSwimmerColFracSeen) {
    return 0;
  }
  return Math.max(
    0,
    sampler.maxSwimmerColFracSeen - sampler.minSwimmerColFracSeen
  );
};

export const snapshotSwimmerColFrac = (snap: RowCrossSnapshot): number => {
  'worklet';
  return snap.swimmerColFrac ?? snap.swimmerCol;
};

/** Absolute change in swimmer grid column between two row crosses. */
export const swimmerColDeltaAbs = (
  current: RowCrossSnapshot,
  previous: RowCrossSnapshot
): number => {
  'worklet';
  return Math.abs(
    snapshotSwimmerColFrac(current) - snapshotSwimmerColFrac(previous)
  );
};

/** Sum of |Δ swimmerCol| across consecutive snapshots in a window. */
export const cumulativeSwimmerColTravel = (
  history: readonly RowCrossSnapshot[]
): number => {
  'worklet';
  let total = 0;
  for (let i = 1; i < history.length; i++) {
    total += Math.abs(
      snapshotSwimmerColFrac(history[i]) - snapshotSwimmerColFrac(history[i - 1])
    );
  }
  return total;
};

/** Best steer proof: discrete row-cross deltas OR per-frame stitch span. */
export const effectiveSwimmerSteerSpan = (
  history: readonly RowCrossSnapshot[],
  sampler: StitchSampler | undefined
): number => {
  'worklet';
  const fromHistory = cumulativeSwimmerColTravel(history);
  const fromStitch = sampler ? swimmerSteerSpanCols(sampler) : 0;
  return Math.max(fromHistory, fromStitch);
};

export const hasSwimmerSteerProof = (
  prev: RowCrossSnapshot | undefined,
  current: RowCrossSnapshot,
  sampler: StitchSampler | undefined,
  minSpanCols: number
): boolean => {
  'worklet';
  if (sampler && swimmerSteerSpanCols(sampler) >= minSpanCols) {
    return true;
  }
  if (prev && swimmerColDeltaAbs(current, prev) >= Math.max(1, Math.ceil(minSpanCols))) {
    return true;
  }
  return false;
};

export const hasCumulativeSwimmerSteerProof = (
  history: readonly RowCrossSnapshot[],
  sampler: StitchSampler | undefined,
  minTotalCols: number
): boolean => {
  'worklet';
  return effectiveSwimmerSteerSpan(history, sampler) >= minTotalCols;
};

/**
 * Gap centers moved but the player never steered horizontally — procedural conveyor drift.
 */
export const isPassiveGapConveyor = (
  history: readonly RowCrossSnapshot[],
  minCenterTravelCols: number,
  sampler?: StitchSampler,
  minSteerSpanCols = 1
): boolean => {
  'worklet';
  if (history.length < 2) return false;
  if (sampler && swimmerSteerSpanCols(sampler) >= minSteerSpanCols) {
    return false;
  }
  const swimmerTravel = cumulativeSwimmerColTravel(history);
  if (swimmerTravel > 0) return false;
  let centerTravel = 0;
  for (let i = 1; i < history.length; i++) {
    centerTravel += Math.abs(
      centerDeltaCols(history[i].topology, history[i - 1].topology)
    );
  }
  return centerTravel >= minCenterTravelCols;
};

export const gapCenterDeltas = (
  history: readonly RowCrossSnapshot[],
  minStepDelta: number
): GapCenterDelta[] => {
  'worklet';
  const out: GapCenterDelta[] = [];
  for (let i = 1; i < history.length; i++) {
    const delta = centerDeltaCols(history[i].topology, history[i - 1].topology);
    if (Math.abs(delta) < minStepDelta) continue;
    out.push({ delta, sign: delta > 0 ? 1 : -1 });
  }
  return out;
};

const runThenBreakHasSwimmerSteer = (
  history: readonly RowCrossSnapshot[],
  breakMinDelta: number,
  sampler: StitchSampler | undefined,
  minSteerSpanCols: number
): boolean => {
  'worklet';
  if (history.length < 2) return false;
  const last = history[history.length - 1];
  const prev = history[history.length - 2];
  const minBreak = Math.max(
    minSteerSpanCols,
    Math.min(breakMinDelta * minSteerSpanCols, 2)
  );
  const minTotal = Math.max(
    minSteerSpanCols * 1.5,
    breakMinDelta * minSteerSpanCols
  );
  const breakSteer = Math.max(
    swimmerColDeltaAbs(last, prev),
    sampler ? swimmerSteerSpanCols(sampler) : 0
  );
  const totalSteer = effectiveSwimmerSteerSpan(history, sampler);
  return breakSteer >= minBreak && totalSteer >= minTotal;
};

/**
 * ≥ minRunLength same-sign geometry steps, then opposite-sign break ≥ breakMinDelta.
 * Evaluates on full history including current row; break is the latest step.
 */
export const detectRunThenBreak = (
  history: readonly RowCrossSnapshot[],
  minRunLength: number,
  breakMinDelta: number,
  minStepDelta: number,
  sampler?: StitchSampler,
  minSteerSpanCols = 1
): boolean => {
  'worklet';
  if (history.length < minRunLength + 1) return false;

  const steps: number[] = [];
  for (let i = 1; i < history.length; i++) {
    const delta = centerDeltaCols(history[i].topology, history[i - 1].topology);
    if (Math.abs(delta) >= minStepDelta) {
      steps.push(delta);
    }
  }
  if (steps.length < minRunLength + 1) return false;

  const breakDelta = steps[steps.length - 1];
  if (Math.abs(breakDelta) < breakMinDelta) return false;
  const breakSign: 1 | -1 = breakDelta > 0 ? 1 : -1;

  const runSteps = steps.slice(0, -1);
  const tail = runSteps.slice(-minRunLength);
  if (tail.length < minRunLength) return false;

  const runSign: 1 | -1 = tail[0] > 0 ? 1 : -1;
  for (let i = 0; i < tail.length; i++) {
    const stepSign: 1 | -1 = tail[i] > 0 ? 1 : -1;
    if (stepSign !== runSign) return false;
    if (Math.abs(tail[i]) < minStepDelta) return false;
  }

  return (
    breakSign !== runSign &&
    runThenBreakHasSwimmerSteer(history, breakMinDelta, sampler, minSteerSpanCols)
  );
};

/**
 * Monotonic same-sign gap-center travel over ≥ minRowSpan snapshots.
 * Cumulative |delta| must reach minNetCenterDelta with no sign reversal.
 * Requires matching horizontal swimmer steering — not passive gap drift.
 */
export const detectMonotonicTravel = (
  history: readonly RowCrossSnapshot[],
  minRowSpan: number,
  minNetCenterDelta: number,
  minStepDelta: number,
  maxLookbackRows?: number,
  sampler?: StitchSampler,
  minSteerSpanCols = 1
): boolean => {
  'worklet';
  if (history.length < minRowSpan) return false;

  const lookback = maxLookbackRows ?? history.length;
  const slice = history.slice(-lookback);
  if (slice.length < minRowSpan) return false;

  if (isPassiveGapConveyor(slice, minNetCenterDelta * 0.5, sampler, minSteerSpanCols)) {
    return false;
  }

  const steps: number[] = [];
  for (let i = 1; i < slice.length; i++) {
    const delta = centerDeltaCols(slice[i].topology, slice[i - 1].topology);
    if (Math.abs(delta) >= minStepDelta) {
      steps.push(delta);
    }
  }
  if (steps.length < minRowSpan - 1) return false;

  const travelSign: 1 | -1 = steps[0] > 0 ? 1 : -1;
  let net = 0;
  for (let i = 0; i < steps.length; i++) {
    const stepSign: 1 | -1 = steps[i] > 0 ? 1 : -1;
    if (stepSign !== travelSign) return false;
    net += Math.abs(steps[i]);
  }
  if (net < minNetCenterDelta) return false;

  const minSwimmer = Math.max(
    minSteerSpanCols * 2,
    minNetCenterDelta * minSteerSpanCols * 0.5
  );
  return hasCumulativeSwimmerSteerProof(slice, sampler, minSwimmer);
};

/**
 * Monotonic swimmer-column travel — the route the player actually steered.
 * Used when gap topology is unreliable (scrape / nearest-cluster fallback).
 */
export const detectSwimmerMonotonicTravel = (
  history: readonly RowCrossSnapshot[],
  minRowSpan: number,
  minNetColDelta: number,
  maxLookbackRows?: number,
  sampler?: StitchSampler,
  minSteerSpanCols = 1
): boolean => {
  'worklet';
  if (history.length < minRowSpan) return false;

  const lookback = maxLookbackRows ?? history.length;
  const slice = history.slice(-lookback);
  if (slice.length < minRowSpan) return false;

  const minSwimmer = Math.max(
    minSteerSpanCols * 2,
    minNetColDelta * minSteerSpanCols * 0.5
  );
  if (!hasCumulativeSwimmerSteerProof(slice, sampler, minSwimmer)) {
    return false;
  }

  const net = Math.abs(
    snapshotSwimmerColFrac(slice[slice.length - 1]) - snapshotSwimmerColFrac(slice[0])
  );
  const stitchSpan = sampler ? swimmerSteerSpanCols(sampler) : 0;
  if (Math.max(net, stitchSpan) < minNetColDelta) return false;

  const steps: number[] = [];
  for (let i = 1; i < slice.length; i++) {
    const d =
      snapshotSwimmerColFrac(slice[i]) - snapshotSwimmerColFrac(slice[i - 1]);
    if (Math.abs(d) >= 1e-6) steps.push(d);
  }
  if (steps.length === 0) {
    return stitchSpan >= minNetColDelta;
  }

  const travelSign: 1 | -1 = steps[0] > 0 ? 1 : -1;
  for (let i = 0; i < steps.length; i++) {
    const stepSign: 1 | -1 = steps[i] > 0 ? 1 : -1;
    if (stepSign !== travelSign) return false;
  }
  return true;
};

/**
 * Zig-zag on swimmer columns: run of same-sign col steps, then opposite break.
 */
export const detectSwimmerRunThenBreak = (
  history: readonly RowCrossSnapshot[],
  minRunLength: number,
  breakMinDelta: number,
  sampler?: StitchSampler,
  minSteerSpanCols = 1
): boolean => {
  'worklet';
  if (history.length < minRunLength + 1) return false;

  const steps: number[] = [];
  for (let i = 1; i < history.length; i++) {
    const d =
      snapshotSwimmerColFrac(history[i]) - snapshotSwimmerColFrac(history[i - 1]);
    if (Math.abs(d) >= 1e-6) steps.push(d);
  }
  if (steps.length < minRunLength + 1) return false;

  const breakDelta = steps[steps.length - 1];
  if (Math.abs(breakDelta) < breakMinDelta) return false;
  const breakSign: 1 | -1 = breakDelta > 0 ? 1 : -1;

  const runSteps = steps.slice(0, -1);
  const tail = runSteps.slice(-minRunLength);
  if (tail.length < minRunLength) return false;

  const runSign: 1 | -1 = tail[0] > 0 ? 1 : -1;
  for (let i = 0; i < tail.length; i++) {
    const stepSign: 1 | -1 = tail[i] > 0 ? 1 : -1;
    if (stepSign !== runSign) return false;
  }

  return (
    breakSign !== runSign &&
    runThenBreakHasSwimmerSteer(history, breakMinDelta, sampler, minSteerSpanCols)
  );
};

/** Chicane block break: large center jump after stable block (|delta| ≥ chicaneShiftMin). */
export const detectChicaneBlockBreak = (
  prev: RowCrossSnapshot | undefined,
  current: RowCrossSnapshot,
  chicaneShiftMin: number,
  sampler?: StitchSampler,
  minSteerSpanCols = 1
): boolean => {
  'worklet';
  if (!prev) return false;
  const delta = Math.abs(centerDeltaCols(current.topology, prev.topology));
  if (delta < chicaneShiftMin) return false;
  return hasSwimmerSteerProof(prev, current, sampler, minSteerSpanCols);
};

export const isWideOpenLane = (
  topology: GapTopology,
  minWidth: number
): boolean => {
  'worklet';
  return topology.width >= minWidth;
};
