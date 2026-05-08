export type GapRangeCol = { startCol: number; endCol: number }; // inclusive
export type GapRangeNorm = { start: number; end: number }; // end-exclusive in UV (end > start)

const clamp = (v: number, min: number, max: number) => {
  'worklet';
  return Math.max(min, Math.min(max, v));
};

const clamp01 = (v: number) => {
  'worklet';
  return clamp(v, 0, 1);
};

export function groupGapsToRanges(
  gaps: number[] | null | undefined,
  columns: number
): GapRangeCol[] {
  'worklet';
  if (!gaps || gaps.length === 0 || columns <= 0) return [];

  // Sort, unique, and clamp to valid columns.
  const sorted = gaps
    .map((g) => Math.round(g))
    .filter((g) => Number.isFinite(g))
    .map((g) => Math.max(0, Math.min(columns - 1, g)))
    .sort((a, b) => a - b);

  if (sorted.length === 0) return [];

  const ranges: GapRangeCol[] = [];
  let start = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const value = sorted[i];
    if (value === prev) continue; // dedupe
    if (value === prev + 1) {
      prev = value;
      continue;
    }
    ranges.push({ startCol: start, endCol: prev });
    start = value;
    prev = value;
  }
  ranges.push({ startCol: start, endCol: prev });
  return ranges;
}

export function rangesColToNorm(
  ranges: GapRangeCol[],
  columns: number,
  minWidthNorm = 0.01
): GapRangeNorm[] {
  'worklet';
  if (!ranges.length || columns <= 0) return [];
  const c = columns;
  return ranges.map((r) => {
    const start = clamp01(r.startCol / c);
    const endRaw = clamp01((r.endCol + 1) / c);
    const end = Math.max(start + minWidthNorm, endRaw);
    return { start, end };
  });
}

export function rangeCenter(r: GapRangeNorm) {
  'worklet';
  return (r.start + r.end) / 2;
}

export function rangeWidth(r: GapRangeNorm) {
  'worklet';
  return Math.max(0, r.end - r.start);
}

export function rangeOverlap(a: GapRangeNorm, b: GapRangeNorm) {
  'worklet';
  return Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start));
}

export type GapRangeLink = {
  prevA: number; // index into prev ranges
  prevB?: number; // optional second parent (merge)
  blendA?: number; // weight for prevA when prevB exists
  scoreA?: number;
  scoreB?: number;
};

export function matchRanges(
  curr: GapRangeNorm[],
  prev: GapRangeNorm[]
): GapRangeLink[] {
  'worklet';
  if (!curr.length) return [];
  if (!prev.length) {
    // No prev: link each curr to itself (degenerate) so downstream math can proceed.
    return curr.map((_r, i) => ({ prevA: Math.min(i, curr.length - 1) }));
  }

  const maxCenterDist = 0.35;
  const maxWidthDist = 0.6;

  const score = (c: GapRangeNorm, p: GapRangeNorm) => {
    'worklet';
    const wC = Math.max(0.0001, rangeWidth(c));
    const wP = Math.max(0.0001, rangeWidth(p));
    const ov = rangeOverlap(c, p);
    const ovRatio = ov / Math.min(wC, wP);
    const dc = Math.abs(rangeCenter(c) - rangeCenter(p));
    const dw = Math.abs(wC - wP);
    const s =
      2.0 * clamp01(ovRatio) +
      1.0 * (1 - clamp01(dc / maxCenterDist)) +
      0.5 * (1 - clamp01(dw / maxWidthDist));
    return s;
  };

  const links: GapRangeLink[] = [];

  for (let i = 0; i < curr.length; i++) {
    const c = curr[i];
    let bestJ = 0;
    let bestS = -1;
    let secondJ = -1;
    let secondS = -1;

    for (let j = 0; j < prev.length; j++) {
      const s = score(c, prev[j]);
      if (s > bestS) {
        secondS = bestS;
        secondJ = bestJ;
        bestS = s;
        bestJ = j;
      } else if (s > secondS) {
        secondS = s;
        secondJ = j;
      }
    }

    // If all scores are weak (e.g. no overlap), ensure stable fallback by nearest center.
    if (bestS < 0.75) {
      let nearestJ = 0;
      let nearestD = Number.POSITIVE_INFINITY;
      const cCenter = rangeCenter(c);
      for (let j = 0; j < prev.length; j++) {
        const d = Math.abs(cCenter - rangeCenter(prev[j]));
        if (d < nearestD) {
          nearestD = d;
          nearestJ = j;
        }
      }
      bestJ = nearestJ;
    }

    const link: GapRangeLink = { prevA: bestJ, scoreA: bestS };

    // Detect merge-like ambiguity: second choice overlaps or is nearly as good.
    if (secondJ >= 0) {
      const ov2 = rangeOverlap(c, prev[secondJ]);
      const ov1 = rangeOverlap(c, prev[bestJ]);
      const ambiguous = secondS > bestS - 0.25;
      const mergeLike = ov2 > 0 || (ov1 > 0 && ambiguous);
      if (mergeLike) {
        const denom = ov1 + ov2 + 0.0001;
        const blendA = denom > 0 ? ov1 / denom : 0.5;
        link.prevB = secondJ;
        link.blendA = clamp01(blendA);
        link.scoreB = secondS;
      }
    }

    links.push(link);
  }

  return links;
}

export function pickUpToFourByWidth(ranges: GapRangeNorm[]): GapRangeNorm[] {
  'worklet';
  if (ranges.length <= 4) return ranges;
  // Keep widest 4; stable order by center.
  const picked = [...ranges]
    .sort((a, b) => rangeWidth(b) - rangeWidth(a))
    .slice(0, 4)
    .sort((a, b) => rangeCenter(a) - rangeCenter(b));
  return picked;
}

export function packRangesToVec4Pairs(ranges: GapRangeNorm[]): {
  r01: [number, number, number, number];
  r23: [number, number, number, number];
  count: number;
} {
  'worklet';
  const safe = ranges.slice(0, 4);
  const padded: GapRangeNorm[] = [...safe];
  while (padded.length < 4) padded.push({ start: 0, end: 0 });
  return {
    r01: [padded[0].start, padded[0].end, padded[1].start, padded[1].end],
    r23: [padded[2].start, padded[2].end, padded[3].start, padded[3].end],
    count: safe.length,
  };
}

