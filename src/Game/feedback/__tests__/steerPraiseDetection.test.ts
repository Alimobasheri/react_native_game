import { skillFeedbackTuning } from '@/config/skillFeedback';
import { topologyFromGaps } from '../gapTopology';
import { detectSteerPraise } from '../steerPraiseDetection';
import {
  createDefaultStitchSampler,
  defaultRowCrossContact,
  type RowCrossSnapshot,
} from '../skillFeedbackTypes';

const COLS = 8;
const defaultSampler = createDefaultStitchSampler();

const snap = (
  gaps: number[],
  branchKey = '',
  cleanCross = true,
  swimmerCol?: number,
  crossQualified?: boolean,
  contact = defaultRowCrossContact()
): RowCrossSnapshot => ({
  rawGaps: gaps,
  topology: topologyFromGaps(gaps, COLS),
  branchKey,
  crossedAtMs: 0,
  swimmerCol: swimmerCol ?? gaps[Math.floor(gaps.length / 2)] ?? 0,
  swimmerColFrac: swimmerCol ?? gaps[Math.floor(gaps.length / 2)] ?? 0,
  cleanCross,
  crossQualified: crossQualified ?? cleanCross,
  contact,
});

const ctxBase = {
  speedNorm: 0.3,
  difficulty01: 0.2,
  anchorX: 0,
  anchorY: 0,
  tuning: skillFeedbackTuning,
  stitchSampler: defaultSampler,
};

describe('detectSteerPraise', () => {
  it('fires NICE! when player steers into a new lane cluster', () => {
    const history = [snap([2, 3, 4], '', true, 3)];
    const current = snap([5, 6, 7], '', true, 6);
    const event = detectSteerPraise({
      ...ctxBase,
      history,
      current,
    });
    expect(event?.momentId).toBe('shift_commit');
    expect(event?.copy).toBe('NICE!');
  });

  it('does not fire NICE! on passive gap drift without swimmer steer', () => {
    const history = [snap([2], '', true, 3)];
    const current = snap([3], '', true, 3);
    const event = detectSteerPraise({
      ...ctxBase,
      history,
      current,
    });
    expect(event).toBeNull();
  });

  it('does not fire when swimmer moves in static wide chute', () => {
    const wide = [1, 2, 3, 4, 5, 6];
    const history = [snap(wide, '', true, 2)];
    const current = snap(wide, '', true, 5);
    const event = detectSteerPraise({
      ...ctxBase,
      history,
      current,
    });
    expect(event).toBeNull();
  });

  it('fires ZIG-ZAG! on run-then-break with swimmer steering', () => {
    const history = [
      snap([2], '', true, 2),
      snap([3], '', true, 3),
      snap([4], '', true, 4),
      snap([5], '', true, 5),
    ];
    const current = snap([2], '', true, 2);
    const event = detectSteerPraise({
      ...ctxBase,
      history,
      current,
    });
    expect(event?.momentId).toBe('zigzag_chain');
    expect(event?.copy).toBe('ZIG-ZAG!');
  });

  it('does not fire ZIG-ZAG! when gaps drift but swimmer never steers', () => {
    const history = [
      snap([2], '', true, 3),
      snap([3], '', true, 3),
      snap([4], '', true, 3),
      snap([5], '', true, 3),
    ];
    const current = snap([2], '', true, 3);
    const event = detectSteerPraise({
      ...ctxBase,
      history,
      current,
    });
    expect(event).toBeNull();
  });

  it('fires SURFING! on monotonic cross-lane travel with swimmer steer', () => {
    const history = [
      snap([2], '', true, 2),
      snap([3], '', true, 3),
      snap([4], '', true, 4),
      snap([5], '', true, 5),
    ];
    const current = snap([6], '', true, 6);
    const event = detectSteerPraise({
      ...ctxBase,
      history,
      current,
    });
    expect(event?.momentId).toBe('cross_sweep');
    expect(event?.copy).toBe('SURFING!');
  });

  it('fires SLALOM! on chicane block break with swimmer steer', () => {
    const history = [snap([2, 3, 4], 'flow|chicane', true, 3)];
    const current = snap([4, 5, 6], 'flow|chicane', true, 5);
    const event = detectSteerPraise({
      ...ctxBase,
      history,
      current,
    });
    expect(event?.momentId).toBe('slalom_block');
    expect(event?.copy).toBe('SLALOM!');
  });

  it('fires FORKED! on paradox branch', () => {
    const event = detectSteerPraise({
      ...ctxBase,
      history: [],
      current: snap([5, 6, 7], 'baseMulti|tension|paradoxSplit'),
    });
    expect(event?.momentId).toBe('fork_clean');
  });

  it('does not fire TIGHT! on funnel pass-through without squeeze or steer', () => {
    const event = detectSteerPraise({
      ...ctxBase,
      history: [snap([2, 3], 'flow|funnel', true, 3)],
      current: snap([3], 'flow|funnel', true, 3),
    });
    expect(event).toBeNull();
  });

  it('fires TIGHT! on funnel when wall squeeze is active', () => {
    const event = detectSteerPraise({
      ...ctxBase,
      history: [snap([2, 3], 'flow|funnel', true, 2)],
      current: snap(
        [3],
        'flow|funnel',
        true,
        3,
        true,
        defaultRowCrossContact({ sideBlocked: true })
      ),
      stitchSampler: {
        ...defaultSampler,
        sideBlockedSeen: true,
      },
    });
    expect(event?.momentId).toBe('funnel_thread');
    expect(event?.copy).toBe('TIGHT!');
  });

  it('messy cross-lane surf qualifies at tier 0 with low hygiene', () => {
    const history = [
      snap([2], '', true, 2),
      snap([3], '', true, 3),
      snap([4], '', true, 4),
      snap([5], '', true, 5),
    ];
    const current = snap([6], '', false, 6, true);
    const messySampler = createDefaultStitchSampler();
    const sampler = {
      ...messySampler,
      sideBlockedSeen: true,
      ceilingBrushSeen: true,
      collidingSeen: true,
      minClearanceSeen: 0.15,
    };
    const event = detectSteerPraise({
      ...ctxBase,
      speedNorm: 0.7,
      difficulty01: 0.6,
      history,
      current,
      stitchSampler: sampler,
    });
    expect(event?.momentId).toBe('cross_sweep');
    expect(event?.copy).toBe('SURFING!');
    expect(event?.tierIndex).toBe(0);
    expect(event?.hygiene01).toBeLessThan(0.72);
  });

  it('clean cross-lane surf upgrades to MAJESTIC! at high speed/diff', () => {
    const history = [
      snap([2], '', true, 2),
      snap([3], '', true, 3),
      snap([4], '', true, 4),
      snap([5], '', true, 5),
    ];
    const current = snap([6], '', true, 6);
    const event = detectSteerPraise({
      ...ctxBase,
      speedNorm: 0.7,
      difficulty01: 0.6,
      history,
      current,
      stitchSampler: createDefaultStitchSampler(),
    });
    expect(event?.momentId).toBe('cross_sweep');
    expect(event?.copy).toBe('MAJESTIC!');
    expect(event?.tierIndex).toBe(1);
  });

  it('does not fire when payoff row is pinned', () => {
    const history = [snap([2, 3, 4], '', true, 3)];
    const current = snap([5, 6, 7], '', true, 6, true);
    current.contact.pinned = true;
    current.crossQualified = false;
    const event = detectSteerPraise({
      ...ctxBase,
      history,
      current,
    });
    expect(event).toBeNull();
  });

  it('fires SURFING! at high speed when stitch proves steer despite frozen integer cols', () => {
    const history = [
      snap([2], '', true, 3),
      snap([3], '', true, 3),
      snap([4], '', true, 3),
      snap([5], '', true, 3),
    ];
    const current = snap([6], '', true, 3, true);
    let sampler = createDefaultStitchSampler();
    sampler = {
      ...sampler,
      minSwimmerColFracSeen: 3,
      maxSwimmerColFracSeen: 5.4,
    };
    const event = detectSteerPraise({
      ...ctxBase,
      speedNorm: 0.85,
      difficulty01: 0.7,
      history,
      current,
      stitchSampler: sampler,
    });
    expect(event?.momentId).toBe('cross_sweep');
    expect(['SURFING!', 'MAJESTIC!']).toContain(event?.copy);
  });
});
