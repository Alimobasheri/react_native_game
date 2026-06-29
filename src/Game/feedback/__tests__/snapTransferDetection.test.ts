import { skillFeedbackTuning } from '@/config/skillFeedback';
import { topologyFromGaps } from '../gapTopology';
import { detectSnapTransfer } from '../snapTransferDetection';
import type { RowCrossSnapshot } from '../skillFeedbackTypes';

const COLS = 8;

const snap = (gaps: number[], cleanCross = true): RowCrossSnapshot => ({
  topology: topologyFromGaps(gaps, COLS),
  branchKey: '',
  crossedAtMs: 0,
  swimmerCol: gaps[Math.floor(gaps.length / 2)],
  cleanCross,
});

describe('detectSnapTransfer — founder pinhole_flare_snap', () => {
  it('fires CRAZY! or SWEEP! on [2] -> [2,3,4] -> [4,5]', () => {
    const history = [snap([2]), snap([2, 3, 4])];
    const current = snap([4, 5]);
    const event = detectSnapTransfer({
      history,
      current,
      speedNorm: 0.6,
      difficulty01: 0.5,
      anchorX: 100,
      anchorY: 200,
      tuning: skillFeedbackTuning,
    });
    expect(event).not.toBeNull();
    expect(event?.momentId).toBe('pinhole_flare_snap');
    expect(['SWEEP!', 'CRAZY!', 'INSANE!']).toContain(event?.copy);
  });

  it('does not fire on dirty cross', () => {
    const history = [snap([2]), snap([2, 3, 4])];
    const current = snap([4, 5], false);
    const event = detectSnapTransfer({
      history,
      current,
      speedNorm: 0.6,
      difficulty01: 0.5,
      anchorX: 100,
      anchorY: 200,
      tuning: skillFeedbackTuning,
    });
    expect(event).toBeNull();
  });

  it('does not fire on direct pinhole to snap without flare', () => {
    const history = [snap([2])];
    const current = snap([5, 6]);
    const event = detectSnapTransfer({
      history,
      current,
      speedNorm: 0.6,
      difficulty01: 0.5,
      anchorX: 100,
      anchorY: 200,
      tuning: skillFeedbackTuning,
    });
    expect(event).toBeNull();
  });
});
