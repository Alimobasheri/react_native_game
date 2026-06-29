import { topologyFromGaps } from '../gapTopology';
import {
  detectChicaneBlockBreak,
  detectMonotonicTravel,
  detectRunThenBreak,
  isPassiveGapConveyor,
  swimmerSteerSpanCols,
} from '../gapPathAnalysis';
import {
  createDefaultStitchSampler,
  defaultRowCrossContact,
  type RowCrossSnapshot,
} from '../skillFeedbackTypes';
import { updateStitchSampler } from '../hygieneScoring';

const COLS = 8;

const snap = (
  gaps: number[],
  swimmerCol = gaps[Math.floor(gaps.length / 2)] ?? 0
): RowCrossSnapshot => ({
  rawGaps: gaps,
  topology: topologyFromGaps(gaps, COLS),
  branchKey: '',
  crossedAtMs: 0,
  swimmerCol,
  swimmerColFrac: swimmerCol,
  cleanCross: true,
  crossQualified: true,
  contact: defaultRowCrossContact(),
});

const stitchWithSpan = (minFrac: number, maxFrac: number) => {
  let sampler = createDefaultStitchSampler();
  sampler = updateStitchSampler(sampler, {
    sideBlocked: false,
    ceilingBrush: false,
    colliding: false,
    pinned: false,
    clearance01: 1,
    swimmerColFrac: minFrac,
  });
  sampler = updateStitchSampler(sampler, {
    sideBlocked: false,
    ceilingBrush: false,
    colliding: false,
    pinned: false,
    clearance01: 1,
    swimmerColFrac: maxFrac,
  });
  return sampler;
};

describe('isPassiveGapConveyor', () => {
  it('detects gap drift with fixed swimmer column', () => {
    const history = [snap([2], 3), snap([3], 3), snap([4], 3)];
    expect(isPassiveGapConveyor(history, 2)).toBe(true);
  });

  it('returns false when swimmer steers in stitch window', () => {
    const history = [snap([2], 3), snap([3], 3), snap([4], 3)];
    const sampler = stitchWithSpan(3, 4.2);
    expect(isPassiveGapConveyor(history, 2, sampler, 0.72)).toBe(false);
  });

  it('returns false when swimmer steers between row crosses', () => {
    const history = [snap([2], 2), snap([3], 3), snap([4], 4)];
    expect(isPassiveGapConveyor(history, 2)).toBe(false);
  });
});

describe('detectRunThenBreak', () => {
  it('detects 3 same-sign steps then opposite break', () => {
    const history = [
      snap([2], 2),
      snap([3], 3),
      snap([4], 4),
      snap([5], 5),
      snap([2], 2),
    ];
    expect(detectRunThenBreak(history, 3, 2, 0.5)).toBe(true);
  });

  it('qualifies via stitch window when integer cols lag at high speed', () => {
    const history = [
      snap([2], 3),
      snap([3], 3),
      snap([4], 3),
      snap([5], 3),
      snap([2], 3),
    ];
    const sampler = stitchWithSpan(3, 4.5);
    expect(detectRunThenBreak(history, 3, 2, 0.5, sampler, 0.72)).toBe(true);
  });

  it('rejects geometry break without swimmer steer', () => {
    const history = [
      snap([2], 3),
      snap([3], 3),
      snap([4], 3),
      snap([5], 3),
      snap([2], 3),
    ];
    expect(detectRunThenBreak(history, 3, 2, 0.5)).toBe(false);
  });

  it('rejects alternating tap-like pattern without run', () => {
    const history = [snap([2]), snap([5]), snap([2]), snap([5])];
    expect(detectRunThenBreak(history, 3, 2, 0.5)).toBe(false);
  });
});

describe('detectMonotonicTravel', () => {
  it('detects cumulative same-direction travel with swimmer steer', () => {
    const history = [
      snap([2], 2),
      snap([3], 3),
      snap([4], 4),
      snap([5], 5),
      snap([6], 6),
    ];
    expect(detectMonotonicTravel(history, 3, 4, 0.5)).toBe(true);
  });

  it('qualifies via stitch span when row-cross cols are frozen', () => {
    const history = [
      snap([2], 3),
      snap([3], 3),
      snap([4], 3),
      snap([5], 3),
      snap([6], 3),
    ];
    const sampler = stitchWithSpan(3, 5.2);
    expect(detectMonotonicTravel(history, 3, 4, 0.5, undefined, sampler, 0.72)).toBe(
      true
    );
  });

  it('rejects passive gap conveyor drift', () => {
    const history = [
      snap([2], 3),
      snap([3], 3),
      snap([4], 3),
      snap([5], 3),
      snap([6], 3),
    ];
    expect(detectMonotonicTravel(history, 3, 4, 0.5)).toBe(false);
  });

  it('rejects path with sign reversal', () => {
    const history = [snap([2]), snap([3]), snap([4]), snap([2])];
    expect(detectMonotonicTravel(history, 3, 4, 0.5)).toBe(false);
  });
});

describe('swimmerSteerSpanCols', () => {
  it('measures fractional column travel in stitch window', () => {
    const sampler = stitchWithSpan(2.1, 4.3);
    expect(swimmerSteerSpanCols(sampler)).toBeCloseTo(2.2, 5);
  });
});

describe('detectChicaneBlockBreak', () => {
  it('detects large center jump between blocks with swimmer steer', () => {
    const prev = snap([2, 3, 4], 3);
    const current = snap([4, 5, 6], 5);
    expect(detectChicaneBlockBreak(prev, current, 2)).toBe(true);
  });

  it('qualifies via stitch when row snapshot cols match', () => {
    const prev = snap([2, 3, 4], 3);
    const current = snap([4, 5, 6], 3);
    const sampler = stitchWithSpan(3, 4.5);
    expect(detectChicaneBlockBreak(prev, current, 2, sampler, 0.72)).toBe(true);
  });

  it('rejects geometry jump without swimmer steer', () => {
    const prev = snap([2, 3, 4], 3);
    const current = snap([4, 5, 6], 3);
    expect(detectChicaneBlockBreak(prev, current, 2)).toBe(false);
  });

  it('rejects small drift', () => {
    const prev = snap([2, 3, 4]);
    const current = snap([3, 4, 5]);
    expect(detectChicaneBlockBreak(prev, current, 2)).toBe(false);
  });
});
