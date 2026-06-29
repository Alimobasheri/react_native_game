import { skillFeedbackTuning } from '@/config/skillFeedback';
import { topologyFromGaps } from '../gapTopology';
import { detectSnapTransfer } from '../snapTransferDetection';
import {
  createDefaultStitchSampler,
  defaultRowCrossContact,
  type RowCrossSnapshot,
} from '../skillFeedbackTypes';

const COLS = 8;
const defaultSampler = createDefaultStitchSampler();

const snap = (
  gaps: number[],
  cleanCross = true,
  swimmerCol?: number,
  crossQualified?: boolean
): RowCrossSnapshot => ({
  rawGaps: gaps,
  topology: topologyFromGaps(gaps, COLS),
  branchKey: '',
  crossedAtMs: 0,
  swimmerCol: swimmerCol ?? gaps[Math.floor(gaps.length / 2)] ?? 0,
  swimmerColFrac: swimmerCol ?? gaps[Math.floor(gaps.length / 2)] ?? 0,
  cleanCross,
  crossQualified: crossQualified ?? cleanCross,
  contact: defaultRowCrossContact(),
});

describe('detectSnapTransfer — founder pinhole_flare_snap', () => {
  it('fires CRAZY! or SWEEP! on pinhole -> flare -> swimmer snap', () => {
    const history = [snap([2], true, 2), snap([2, 3, 4], true, 2)];
    const current = snap([4, 5], true, 5);
    const event = detectSnapTransfer({
      history,
      current,
      speedNorm: 0.6,
      difficulty01: 0.5,
      anchorX: 100,
      anchorY: 200,
      tuning: skillFeedbackTuning,
      stitchSampler: defaultSampler,
    });
    expect(event).not.toBeNull();
    expect(event?.momentId).toBe('pinhole_flare_snap');
    expect(['SWEEP!', 'CRAZY!', 'INSANE!']).toContain(event?.copy);
  });

  it('does not fire when gap widens but swimmer never snaps lanes', () => {
    const history = [snap([2], true, 3), snap([2, 3, 4], true, 3)];
    const current = snap([4, 5], true, 3);
    const event = detectSnapTransfer({
      history,
      current,
      speedNorm: 0.6,
      difficulty01: 0.5,
      anchorX: 100,
      anchorY: 200,
      tuning: skillFeedbackTuning,
      stitchSampler: defaultSampler,
    });
    expect(event).toBeNull();
  });

  it('does not fire when swimmer is in solid column on payoff row', () => {
    const history = [snap([2], true, 2), snap([2, 3, 4], true, 2)];
    const current = snap([4, 5], false, 0, false);
    const event = detectSnapTransfer({
      history,
      current,
      speedNorm: 0.6,
      difficulty01: 0.5,
      anchorX: 100,
      anchorY: 200,
      tuning: skillFeedbackTuning,
      stitchSampler: defaultSampler,
    });
    expect(event).toBeNull();
  });

  it('does not fire on direct pinhole to snap without flare', () => {
    const history = [snap([2], true, 2)];
    const current = snap([5, 6], true, 5);
    const event = detectSnapTransfer({
      history,
      current,
      speedNorm: 0.6,
      difficulty01: 0.5,
      anchorX: 100,
      anchorY: 200,
      tuning: skillFeedbackTuning,
      stitchSampler: defaultSampler,
    });
    expect(event).toBeNull();
  });
});
