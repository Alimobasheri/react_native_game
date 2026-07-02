import { skillFeedbackTuning } from '@/config/skillFeedback';
import { topologyFromGaps } from '../gapTopology';
import {
  createDefaultPassageFlowSampler,
  evaluateShiftCommitReject,
  hasPassageSteerProof,
  passageFlowIntact,
  passageIsClean,
  passageSwimmerSteerSpan,
  resetPassageFlowSampler,
  updatePassageFlowSampler,
} from '../passageFlowScoring';
import {
  defaultRowCrossContact,
  type RowCrossSnapshot,
} from '../skillFeedbackTypes';
import { resolveSkillGates } from '../skillSurvivalGates';

const COLS = 8;

const snap = (
  gaps: number[],
  swimmerCol: number,
  crossQualified = true
): RowCrossSnapshot => ({
  rawGaps: gaps,
  topology: topologyFromGaps(gaps, COLS),
  branchKey: '',
  crossedAtMs: 0,
  swimmerCol,
  swimmerColFrac: swimmerCol,
  cleanCross: true,
  crossQualified,
  contact: defaultRowCrossContact(),
});

describe('updatePassageFlowSampler', () => {
  it('tracks soft scrape without hard block', () => {
    let sampler = createDefaultPassageFlowSampler();
    sampler = updatePassageFlowSampler(sampler, {
      pinned: false,
      movementBlocked: false,
      sideBlocked: true,
      colliding: true,
      swimmerColFrac: 3,
    });
    expect(sampler.softScrapeSeen).toBe(true);
    expect(sampler.hardBlockSeen).toBe(false);
  });

  it('tracks hard block without soft scrape on same frame', () => {
    let sampler = createDefaultPassageFlowSampler();
    sampler = updatePassageFlowSampler(sampler, {
      pinned: false,
      movementBlocked: true,
      sideBlocked: true,
      colliding: true,
      swimmerColFrac: 3,
    });
    expect(sampler.hardBlockSeen).toBe(true);
    expect(sampler.softScrapeSeen).toBe(false);
  });

  it('accumulates col frac span', () => {
    let sampler = createDefaultPassageFlowSampler();
    sampler = updatePassageFlowSampler(sampler, {
      pinned: false,
      movementBlocked: false,
      sideBlocked: false,
      colliding: false,
      swimmerColFrac: 5,
    });
    sampler = updatePassageFlowSampler(sampler, {
      pinned: false,
      movementBlocked: false,
      sideBlocked: false,
      colliding: false,
      swimmerColFrac: 3,
    });
    expect(passageSwimmerSteerSpan(sampler)).toBe(2);
  });
});

describe('passageFlowIntact / passageIsClean', () => {
  it('fails on pinned or hard block only', () => {
    expect(
      passageFlowIntact({
        ...createDefaultPassageFlowSampler(),
        softScrapeSeen: true,
      })
    ).toBe(true);
    expect(
      passageFlowIntact({
        ...createDefaultPassageFlowSampler(),
        hardBlockSeen: true,
      })
    ).toBe(false);
    expect(
      passageIsClean({
        ...createDefaultPassageFlowSampler(),
        softScrapeSeen: true,
      })
    ).toBe(false);
  });
});

describe('resetPassageFlowSampler', () => {
  it('returns fresh empty sampler', () => {
    const dirty = updatePassageFlowSampler(createDefaultPassageFlowSampler(), {
      pinned: true,
      movementBlocked: true,
      sideBlocked: true,
      colliding: true,
      swimmerColFrac: 2,
    });
    expect(dirty.pinnedSeen).toBe(true);
    const fresh = resetPassageFlowSampler();
    expect(fresh.pinnedSeen).toBe(false);
    expect(passageSwimmerSteerSpan(fresh)).toBe(0);
  });
});

describe('evaluateShiftCommitReject', () => {
  const gates = resolveSkillGates(0.2, 0.5, skillFeedbackTuning);

  it('returns no_prev_row on first cross', () => {
    const current = snap([3, 4], 3);
    expect(
      evaluateShiftCommitReject({
        history: [],
        current,
        passageSampler: createDefaultPassageFlowSampler(),
        gates,
        tuning: skillFeedbackTuning,
        patternEnabled: true,
      })
    ).toBe('no_prev_row');
  });

  it('returns flow_hard_block when passage had brick hit', () => {
    const history = [snap([4, 5], 5)];
    const current = snap([3, 4], 4);
    expect(
      evaluateShiftCommitReject({
        history,
        current,
        passageSampler: {
          ...createDefaultPassageFlowSampler(),
          hardBlockSeen: true,
        },
        gates,
        tuning: skillFeedbackTuning,
        patternEnabled: true,
      })
    ).toBe('flow_hard_block');
  });

  it('returns null for valid pinball shift with soft scrape only', () => {
    const history = [snap([4, 5], 5)];
    const current = snap([3, 4], 4);
    let passage = createDefaultPassageFlowSampler();
    passage = updatePassageFlowSampler(passage, {
      pinned: false,
      movementBlocked: false,
      sideBlocked: true,
      colliding: true,
      swimmerColFrac: 4.5,
    });
    passage = updatePassageFlowSampler(passage, {
      pinned: false,
      movementBlocked: false,
      sideBlocked: false,
      colliding: false,
      swimmerColFrac: 4,
    });
    expect(
      evaluateShiftCommitReject({
        history,
        current,
        passageSampler: passage,
        gates,
        tuning: skillFeedbackTuning,
        patternEnabled: true,
      })
    ).toBe(null);
  });
});

describe('hasPassageSteerProof', () => {
  it('uses row-cross col delta when passage span is empty', () => {
    const prev = snap([4, 5], 5);
    const current = snap([3, 4], 4);
    expect(
      hasPassageSteerProof(prev, current, createDefaultPassageFlowSampler(), 0.72)
    ).toBe(true);
  });
});
