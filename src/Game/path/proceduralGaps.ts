/**
 * Stateless procedural gap (passable column) generation for Swimmer.
 * Deterministic from (pathRunId, rowIndex, salts, proceduralStreamSalt) + optional macro phase.
 */

import { groupGapsToRanges, GapRangeCol } from '@/Game/water/gapRanges';
import { mixU32, mixPathRowStreamSalt, unitFloatFromU32, intMod } from './deterministicMix';
import { effectiveGapTension01, runDepthTensionBonus01, type MacroPhase } from './macroPacing';
import { unionMinimalSeam } from './swimmerGrid';

function clampInt(v: number, min: number, max: number): number {
  'worklet';
  return Math.max(min, Math.min(max, Math.round(v)));
}

const rangeWidthCols = (r: GapRangeCol) => {
  'worklet';
  return Math.max(1, r.endCol - r.startCol + 1);
};

const rangeCenterCols = (r: GapRangeCol) => {
  'worklet';
  return (r.startCol + r.endCol) * 0.5;
};

const enforceRangeConstraints = (ranges: GapRangeCol[], rowLength: number) => {
  'worklet';
  if (rowLength <= 0) return [];
  const normalized = ranges
    .map((r) => {
      const a = clampInt(r.startCol, 0, rowLength - 1);
      const b = clampInt(r.endCol, 0, rowLength - 1);
      return a <= b ? { startCol: a, endCol: b } : { startCol: b, endCol: a };
    })
    .sort((x, y) => x.startCol - y.startCol);

  const merged: GapRangeCol[] = [];
  for (let i = 0; i < normalized.length; i++) {
    const r = normalized[i];
    const last = merged[merged.length - 1];
    if (!last) {
      merged.push(r);
      continue;
    }
    if (r.startCol <= last.endCol + 1) {
      last.endCol = Math.max(last.endCol, r.endCol);
    } else {
      merged.push(r);
    }
  }

  for (let j = 0; j < merged.length; j++) {
    merged[j].startCol = clampInt(merged[j].startCol, 0, rowLength - 1);
    merged[j].endCol = clampInt(
      Math.max(merged[j].endCol, merged[j].startCol),
      0,
      rowLength - 1
    );
  }

  return merged;
};

const splitRange = (r: GapRangeCol, rowLength: number, minWidth: number): GapRangeCol[] => {
  'worklet';
  const w = rangeWidthCols(r);
  if (w < minWidth * 2 + 1) return [r];
  const center = Math.round(rangeCenterCols(r));
  const leftEnd = clampInt(
    center - 1,
    r.startCol + minWidth - 1,
    r.endCol - (minWidth + 1)
  );
  const rightStart = clampInt(
    leftEnd + 2,
    r.startCol + minWidth + 1,
    r.endCol - (minWidth - 1)
  );
  const left = { startCol: r.startCol, endCol: leftEnd };
  const right = { startCol: rightStart, endCol: r.endCol };
  if (rangeWidthCols(left) < minWidth || rangeWidthCols(right) < minWidth) return [r];
  if (right.startCol <= left.endCol + 1) return [r];
  return enforceRangeConstraints([left, right], rowLength);
};

const overlapCols = (a: GapRangeCol, b: GapRangeCol) => {
  'worklet';
  return Math.max(0, Math.min(a.endCol, b.endCol) - Math.max(a.startCol, b.startCol) + 1);
};

const ensureMinWidth = (ranges: GapRangeCol[], rowLength: number, minWidth: number) => {
  'worklet';
  if (!ranges.length) return ranges;
  const expanded = ranges.map((r) => {
    const w = rangeWidthCols(r);
    if (w >= minWidth) return r;
    const start = clampInt(r.startCol, 0, rowLength - 1);
    const end = clampInt(
      Math.min(rowLength - 1, start + minWidth - 1),
      0,
      rowLength - 1
    );
    return { startCol: start, endCol: end };
  });
  return enforceRangeConstraints(expanded, rowLength);
};

const ensureEachCurrOverlapsSomePrev = (
  curr: GapRangeCol[],
  prev: GapRangeCol[],
  rowLength: number,
  minOverlapCols: number
) => {
  'worklet';
  if (!curr.length || !prev.length) return curr;
  const fixed = curr.map((r) => ({ ...r }));

  for (let i = 0; i < fixed.length; i++) {
    const r = fixed[i];
    let bestPrev = prev[0];
    let bestDist = Number.POSITIVE_INFINITY;
    const c = rangeCenterCols(r);
    for (let j = 0; j < prev.length; j++) {
      const d = Math.abs(c - rangeCenterCols(prev[j]));
      if (d < bestDist) {
        bestDist = d;
        bestPrev = prev[j];
      }
    }
    const ov = overlapCols(r, bestPrev);
    if (ov >= minOverlapCols) continue;

    let shift = 0;
    if (r.endCol < bestPrev.startCol) {
      shift = bestPrev.startCol + (minOverlapCols - 1) - r.endCol;
    } else if (r.startCol > bestPrev.endCol) {
      shift = bestPrev.endCol - (minOverlapCols - 1) - r.startCol;
    } else {
      shift = clampInt(Math.round(rangeCenterCols(bestPrev) - rangeCenterCols(r)), -1, 1);
    }
    if (shift !== 0) {
      r.startCol = clampInt(r.startCol + shift, 0, rowLength - 1);
      r.endCol = clampInt(r.endCol + shift, 0, rowLength - 1);
      if (r.endCol < r.startCol) r.endCol = r.startCol;
    }
  }

  return enforceRangeConstraints(fixed, rowLength);
};

const rangesToGaps = (ranges: GapRangeCol[]) => {
  'worklet';
  const gaps: number[] = [];
  for (let i = 0; i < ranges.length; i++) {
    for (let c = ranges[i].startCol; c <= ranges[i].endCol; c++) {
      gaps.push(c);
    }
  }
  return gaps;
};

const maybeMutateRangesDeterministic = (
  ranges: GapRangeCol[],
  rowLength: number,
  pathRunId: number,
  rowIndex: number,
  phase: MacroPhase,
  proceduralStreamSalt: number
) => {
  'worklet';
  const tension = effectiveGapTension01(phase, proceduralStreamSalt);
  const mutated = ranges.map((r, idx) => {
    const uShift = unitFloatFromU32(mixPathRowStreamSalt(pathRunId, rowIndex, proceduralStreamSalt, 300 + idx));
    const uDir = unitFloatFromU32(mixPathRowStreamSalt(pathRunId, rowIndex, proceduralStreamSalt, 400 + idx));
    const uResize = unitFloatFromU32(mixPathRowStreamSalt(pathRunId, rowIndex, proceduralStreamSalt, 500 + idx));
    const uWiden = unitFloatFromU32(mixPathRowStreamSalt(pathRunId, rowIndex, proceduralStreamSalt, 600 + idx));

    const doShift = uShift < 0.42 + tension * 0.2;
    const doResize = uResize < 0.38 + tension * 0.15;
    const shift = uDir < 0.5 ? -1 : 1;
    const widen = uWiden < 0.5 ? -1 : 1;

    let start = r.startCol;
    let end = r.endCol;
    if (doShift) {
      start += shift;
      end += shift;
    }
    if (doResize) {
      if (widen < 0) {
        start -= 1;
        end += 1;
      } else if (rangeWidthCols(r) > 1) {
        start += 1;
        end -= 1;
      }
    }
    return { startCol: start, endCol: end };
  });
  return enforceRangeConstraints(mutated, rowLength);
};

/** Single-corridor drift: preserves overlap with previous row by construction. */
export function generateGapsDeterministic(
  prevGaps: number[],
  rowLength: number,
  rowIndex: number,
  pathRunId: number,
  macroPhase: MacroPhase,
  proceduralStreamSalt = 0
): number[] {
  'worklet';
  const u = unitFloatFromU32(mixPathRowStreamSalt(pathRunId, rowIndex, proceduralStreamSalt, 11));
  const depth = runDepthTensionBonus01(proceduralStreamSalt);
  const pivot =
    macroPhase === 'climax'
      ? 0.32 - depth * 0.04
      : macroPhase === 'tension'
        ? 0.42
        : macroPhase === 'release'
          ? 0.58
          : 0.5 - depth * 0.05;
  const goLeftFirst =
    u < pivot + (macroPhase === 'tension' ? 0.08 : macroPhase === 'release' ? -0.06 : 0);

  if (prevGaps.length === 0) {
    return [Math.floor(rowLength / 2)];
  }

  const nextGaps: number[] = [];
  if (goLeftFirst) {
    const leftMostGap = Math.min(...prevGaps);
    if (leftMostGap > 0) nextGaps.push(leftMostGap - 1);
    nextGaps.push(leftMostGap);
    if (leftMostGap < rowLength - 1) nextGaps.push(leftMostGap + 1);
  } else {
    const rightMostGap = Math.max(...prevGaps);
    if (rightMostGap < rowLength - 1) nextGaps.push(rightMostGap + 1);
    nextGaps.push(rightMostGap);
    if (rightMostGap > 0) nextGaps.push(rightMostGap - 1);
  }
  return unionMinimalSeam(prevGaps, nextGaps, rowLength);
}

/** Multi-range corridors with seam guarantee vs previous gaps. */
export function generateMultiPathGapsDeterministic(
  prevGaps: number[],
  rowLength: number,
  rowIndex: number,
  pathRunId: number,
  macroPhase: MacroPhase,
  proceduralStreamSalt = 0
): number[] {
  'worklet';
  const MAX_PATHS = 4;
  const MIN_W = 2;
  const MAX_W = Math.max(MIN_W, Math.min(6, Math.floor(rowLength * 0.6)));
  const MIN_OVERLAP = 1;
  const tension = effectiveGapTension01(macroPhase, proceduralStreamSalt);

  let prevRanges = groupGapsToRanges(prevGaps, rowLength);
  if (prevRanges.length === 0) {
    const center = Math.floor(rowLength / 2);
    const uW = unitFloatFromU32(mixPathRowStreamSalt(pathRunId, rowIndex, proceduralStreamSalt, 21));
    const width = uW < 0.55 + tension * 0.2 ? 3 : 2;
    const startA = clampInt(center - Math.floor(width / 2), 0, rowLength - 1);
    const a: GapRangeCol = {
      startCol: startA,
      endCol: Math.min(rowLength - 1, startA + width - 1),
    };
    const u2 = unitFloatFromU32(mixPathRowStreamSalt(pathRunId, rowIndex, proceduralStreamSalt, 22));
    const twoPaths = rowLength >= 8 && u2 < 0.26 + tension * 0.14;
    if (twoPaths) {
      const offset = Math.max(2, Math.floor(rowLength / 4));
      const uSide = unitFloatFromU32(mixPathRowStreamSalt(pathRunId, rowIndex, proceduralStreamSalt, 23));
      const bCenter = clampInt(center + (uSide < 0.5 ? -offset : offset), 0, rowLength - 1);
      const bStart = clampInt(bCenter - 1, 0, rowLength - 1);
      const b: GapRangeCol = {
        startCol: bStart,
        endCol: Math.min(rowLength - 1, bStart + 1),
      };
      prevRanges = enforceRangeConstraints([a, b], rowLength);
    } else {
      prevRanges = enforceRangeConstraints([a], rowLength);
    }
  }

  let ranges = ensureMinWidth(prevRanges, rowLength, MIN_W);
  ranges = maybeMutateRangesDeterministic(
    ranges,
    rowLength,
    pathRunId,
    rowIndex,
    macroPhase,
    proceduralStreamSalt
  );
  ranges = ensureMinWidth(ranges, rowLength, MIN_W);
  ranges = ensureEachCurrOverlapsSomePrev(ranges, prevRanges, rowLength, MIN_OVERLAP);

  const uSplit = unitFloatFromU32(mixPathRowStreamSalt(pathRunId, rowIndex, proceduralStreamSalt, 24));
  const splitThreshold = 0.2 + tension * 0.24;
  if (ranges.length < MAX_PATHS && uSplit < splitThreshold) {
    let widestIdx = 0;
    let widest = 0;
    for (let i = 0; i < ranges.length; i++) {
      const w = rangeWidthCols(ranges[i]);
      if (w > widest) {
        widest = w;
        widestIdx = i;
      }
    }
    if (widest >= MIN_W * 2 + 1) {
      const children = splitRange(ranges[widestIdx], rowLength, MIN_W);
      if (children.length > 1) {
        const next = [
          ...ranges.slice(0, widestIdx),
          ...children,
          ...ranges.slice(widestIdx + 1),
        ];
        ranges = enforceRangeConstraints(next, rowLength);
        ranges = ensureMinWidth(ranges, rowLength, MIN_W);
        ranges = ensureEachCurrOverlapsSomePrev(ranges, prevRanges, rowLength, MIN_OVERLAP);
      }
    }
  }

  if (ranges.length > MAX_PATHS) {
    ranges = [...ranges]
      .sort((a, b) => rangeWidthCols(b) - rangeWidthCols(a))
      .slice(0, MAX_PATHS)
      .sort((a, b) => a.startCol - b.startCol);
  }

  ranges = ensureMinWidth(ranges, rowLength, MIN_W);
  ranges = ranges.map((r) => {
    const w = rangeWidthCols(r);
    if (w <= MAX_W) return r;
    const center = Math.round(rangeCenterCols(r));
    const half = Math.floor(MAX_W / 2);
    const start = clampInt(center - half, 0, rowLength - 1);
    const end = clampInt(start + MAX_W - 1, 0, rowLength - 1);
    return { startCol: start, endCol: end };
  });
  ranges = enforceRangeConstraints(ranges, rowLength);
  ranges = ensureMinWidth(ranges, rowLength, MIN_W);
  ranges = ensureEachCurrOverlapsSomePrev(ranges, prevRanges, rowLength, MIN_OVERLAP);

  const gaps = rangesToGaps(ranges);
  return unionMinimalSeam(prevGaps, gaps, rowLength);
}

export function templateRowCountDeterministic(
  ctx: Record<string, unknown>,
  min: number,
  span: number
): number {
  'worklet';
  const runId = (ctx.pathRunId as number) ?? 0;
  return min + intMod(mixU32(runId, 1, 42), span);
}
