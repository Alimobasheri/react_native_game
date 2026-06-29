/**
 * Late-game skill praise integration — replicates high speed + difficulty conditions.
 */
import { skillFeedbackTuning } from '@/config/skillFeedback';
import { gapDifficulty01FromTotalRows } from '@/config/gapDifficultyRamp';
import { topologyFromGaps } from '../gapTopology';
import {
  detectMonotonicTravel,
  detectSwimmerMonotonicTravel,
  swimmerSteerSpanCols,
} from '../gapPathAnalysis';
import { buildRowCrossSnapshot } from '../rowCrossEval';
import { resolveSkillGates } from '../skillSurvivalGates';
import { detectSteerPraise } from '../steerPraiseDetection';
import {
  createDefaultStitchSampler,
  defaultRowCrossContact,
  type RowCrossSnapshot,
} from '../skillFeedbackTypes';
import { updateStitchSampler } from '../hygieneScoring';

const COLS = 8;

const snap = (
  gaps: number[],
  swimmerCol: number,
  opts: {
    sideBlocked?: boolean;
    crossQualified?: boolean;
    cleanCross?: boolean;
    swimmerColFrac?: number;
  } = {}
): RowCrossSnapshot => ({
  rawGaps: gaps,
  topology: topologyFromGaps(gaps, COLS),
  branchKey: 'directed|tension',
  crossedAtMs: 0,
  swimmerCol,
  swimmerColFrac: opts.swimmerColFrac ?? swimmerCol,
  cleanCross: opts.cleanCross ?? false,
  crossQualified: opts.crossQualified ?? true,
  contact: defaultRowCrossContact({
    sideBlocked: opts.sideBlocked ?? true,
    clearance01: 0.25,
  }),
});

/** Erratic nearest-cluster topology while swimmer steers 7→1 (wall scrape). */
const lateGameScrapeCrossHistory = (): {
  history: RowCrossSnapshot[];
  current: RowCrossSnapshot;
} => {
  const history = [
    snap([6, 7, 8], 7, { sideBlocked: true }),
    snap([0, 1], 6, { sideBlocked: true }),
    snap([6, 7], 5, { sideBlocked: true }),
    snap([0, 1, 2], 4, { sideBlocked: true }),
    snap([5, 6, 7], 3, { sideBlocked: true }),
  ];
  const current = snap([0, 1], 2, { sideBlocked: true });
  return { history, current };
};

const stitchAfterSteer = (fromCol: number, toCol: number) => {
  let sampler = createDefaultStitchSampler();
  sampler = updateStitchSampler(sampler, {
    sideBlocked: true,
    ceilingBrush: false,
    colliding: false,
    pinned: false,
    clearance01: 0.3,
    swimmerColFrac: fromCol,
  });
  sampler = updateStitchSampler(sampler, {
    sideBlocked: true,
    ceilingBrush: false,
    colliding: false,
    pinned: false,
    clearance01: 0.2,
    swimmerColFrac: toCol,
  });
  return sampler;
};

describe('late-game skill praise simulation', () => {
  const diff = gapDifficulty01FromTotalRows(400);
  const speedNorm = 0.85;
  const gates = resolveSkillGates(diff, speedNorm, skillFeedbackTuning);

  it('ramps difficulty and speed at row 400', () => {
    expect(diff).toBeGreaterThan(0.7);
    expect(gates.surfMinRowSpan).toBeLessThanOrEqual(3);
    expect(gates.swimmerSteerMinSpanCols).toBeLessThan(1);
  });

  it('gap-only monotonic travel FAILS on scrape cross (root cause A)', () => {
    const { history, current } = lateGameScrapeCrossHistory();
    const full = history.concat([current]);
    expect(
      detectMonotonicTravel(
        full,
        gates.surfMinRowSpan,
        gates.surfMinNetDelta,
        gates.minStepDelta,
        8,
        undefined,
        gates.swimmerSteerMinSpanCols
      )
    ).toBe(false);
  });

  it('swimmer-column monotonic travel PASSES on same scrape cross', () => {
    const { history, current } = lateGameScrapeCrossHistory();
    const full = history.concat([current]);
    const sampler = stitchAfterSteer(7, 2);
    expect(
      detectSwimmerMonotonicTravel(
        full,
        gates.surfMinRowSpan,
        gates.surfMinNetDelta,
        8,
        sampler,
        gates.swimmerSteerMinSpanCols
      )
    ).toBe(true);
  });

  it('fractional col travel passes when integer col frozen between rapid crosses (root cause C)', () => {
    const history = [
      snap([6, 7], 5, { sideBlocked: true, swimmerColFrac: 5.9 }),
      snap([0, 1], 5, { sideBlocked: true, swimmerColFrac: 5.2 }),
      snap([6, 7], 5, { sideBlocked: true, swimmerColFrac: 4.5 }),
      snap([0, 1, 2], 5, { sideBlocked: true, swimmerColFrac: 3.8 }),
      snap([5, 6, 7], 5, { sideBlocked: true, swimmerColFrac: 3.1 }),
    ];
    const current = snap([0, 1], 5, { sideBlocked: true, swimmerColFrac: 2.4 });
    const full = history.concat([current]);
    const sampler = stitchAfterSteer(5.9, 2.4);
    expect(
      detectSwimmerMonotonicTravel(
        full,
        gates.surfMinRowSpan,
        gates.surfMinNetDelta,
        8,
        sampler,
        gates.swimmerSteerMinSpanCols
      )
    ).toBe(true);
  });

  it('Infinity stitch init breaks span detection in worklets (root cause B)', () => {
    const fresh = createDefaultStitchSampler();
    expect(fresh.minSwimmerColFracSeen).toBeGreaterThan(fresh.maxSwimmerColFracSeen);
    expect(swimmerSteerSpanCols(fresh)).toBe(0);
    const updated = stitchAfterSteer(3, 5.5);
    expect(swimmerSteerSpanCols(updated)).toBeCloseTo(2.5, 5);
  });

  it('detectSteerPraise fires SURFING on late-game scrape cross', () => {
    const { history, current } = lateGameScrapeCrossHistory();
    let sampler = stitchAfterSteer(7, 2);
    sampler = {
      ...sampler,
      sideBlockedSeen: true,
      minClearanceSeen: 0.2,
    };

    const event = detectSteerPraise({
      history,
      current,
      speedNorm,
      difficulty01: diff,
      anchorX: 0,
      anchorY: 0,
      tuning: skillFeedbackTuning,
      stitchSampler: sampler,
      gates,
    });
    expect(event?.momentId).toBe('cross_sweep');
    expect(event?.copy).toMatch(/SURFING|MAJESTIC/);
  });

  it('buildRowCrossSnapshot crossQualified on scrape near gap at high diff', () => {
    const hardGates = resolveSkillGates(0.85, 0.9, skillFeedbackTuning);
    const snapshot = buildRowCrossSnapshot(
      [0, 1, 2],
      COLS,
      2,
      2,
      'directed|tension',
      0,
      false,
      true,
      skillFeedbackTuning,
      hardGates,
      [],
      { ceilingBrush: false, colliding: false, clearance01: 0.3 }
    );
    expect(snapshot.crossQualified).toBe(true);
  });
});
