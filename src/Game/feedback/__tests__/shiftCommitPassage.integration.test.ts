import { skillFeedbackTuning } from '@/config/skillFeedback';
import { topologyFromGaps } from '../gapTopology';
import {
  createDefaultPassageFlowSampler,
  updatePassageFlowSampler,
} from '../passageFlowScoring';
import { evaluateShiftCommit } from '../steerPraiseDetection';
import {
  defaultRowCrossContact,
  type RowCrossSnapshot,
} from '../skillFeedbackTypes';
import { createDefaultStitchSampler } from '../skillFeedbackTypes';
import { resolveSkillGates } from '../skillSurvivalGates';

const COLS = 8;

const snap = (
  gaps: number[],
  swimmerCol: number
): RowCrossSnapshot => ({
  rawGaps: gaps,
  topology: topologyFromGaps(gaps, COLS),
  branchKey: 'directed|climax|pinball',
  crossedAtMs: 0,
  swimmerCol,
  swimmerColFrac: swimmerCol,
  cleanCross: true,
  crossQualified: true,
  contact: defaultRowCrossContact(),
});

describe('shift_commit pinball passage integration', () => {
  const gates = resolveSkillGates(0.02, 1, skillFeedbackTuning);
  const ctxBase = {
    speedNorm: 1,
    difficulty01: 0.02,
    anchorX: 0,
    anchorY: 0,
    tuning: skillFeedbackTuning,
    stitchSampler: createDefaultStitchSampler(),
    gates,
  };

  it('returns acceptable silence on row 3 after rim scrape on row 2', () => {
    const history = [
      snap([4, 5], 5),
      snap([3, 4], 4),
    ];
    const current = snap([2, 3], 3);
    let passage = createDefaultPassageFlowSampler();
    passage = updatePassageFlowSampler(passage, {
      pinned: false,
      movementBlocked: false,
      sideBlocked: true,
      colliding: true,
      swimmerColFrac: 3.2,
    });
    passage = updatePassageFlowSampler(passage, {
      pinned: false,
      movementBlocked: false,
      sideBlocked: false,
      colliding: false,
      swimmerColFrac: 3,
    });
    const result = evaluateShiftCommit({
      ...ctxBase,
      history,
      current,
      passageSampler: passage,
    });
    expect(result.tier).toBe('acceptable');
    expect(result.event).toBeNull();
    expect(result.rejectReason).toBeNull();
  });
});
