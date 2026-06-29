import { skillFeedbackTuning } from '@/config/skillFeedback';
import { topologyFromGaps } from '../gapTopology';
import { detectSteerPraise } from '../steerPraiseDetection';
import type { RowCrossSnapshot } from '../skillFeedbackTypes';

const COLS = 8;

const snap = (
  gaps: number[],
  branchKey = '',
  cleanCross = true
): RowCrossSnapshot => ({
  topology: topologyFromGaps(gaps, COLS),
  branchKey,
  crossedAtMs: 0,
  swimmerCol: gaps[0],
  cleanCross,
});

describe('detectSteerPraise', () => {
  it('fires NICE! on gap shift commit', () => {
    const history = [snap([2, 3, 4])];
    const current = snap([5, 6, 7]);
    const event = detectSteerPraise({
      history,
      current,
      speedNorm: 0.3,
      difficulty01: 0.2,
      anchorX: 0,
      anchorY: 0,
      tuning: skillFeedbackTuning,
    });
    expect(event?.momentId).toBe('shift_commit');
    expect(event?.copy).toBe('NICE!');
  });

  it('fires ZIG-ZAG! on alternating shifts', () => {
    const history = [snap([2]), snap([5]), snap([2])];
    const current = snap([5]);
    const event = detectSteerPraise({
      history,
      current,
      speedNorm: 0.5,
      difficulty01: 0.3,
      anchorX: 0,
      anchorY: 0,
      tuning: skillFeedbackTuning,
    });
    expect(event?.momentId).toBe('zigzag_chain');
  });

  it('fires FORKED! on paradox branch', () => {
    const event = detectSteerPraise({
      history: [],
      current: snap([5, 6, 7], 'baseMulti|tension|paradoxSplit'),
      speedNorm: 0.3,
      difficulty01: 0.2,
      anchorX: 0,
      anchorY: 0,
      tuning: skillFeedbackTuning,
    });
    expect(event?.momentId).toBe('fork_clean');
  });
});
