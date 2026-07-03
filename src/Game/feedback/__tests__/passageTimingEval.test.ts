import {
  createDefaultPassageFlowSampler,
  updatePassageFlowSampler,
} from '@/Game/feedback/passageFlowScoring';
import {
  evaluatePassageTimingTier,
  isFailedShiftRejectReason,
  isPassageTimingEvalFrozen,
} from '@/Game/feedback/passageTimingEval';
import type { GameSessionComponentData } from '@/Game/ecs-components/GameSession';

describe('evaluatePassageTimingTier', () => {
  const cleanSampler = createDefaultPassageFlowSampler();

  it('returns perfect for clean intact passage', () => {
    expect(
      evaluatePassageTimingTier({
        passageSampler: cleanSampler,
        crossQualified: true,
        rejectReason: null,
      })
    ).toBe('perfect');
  });

  it('returns acceptable for soft scrape', () => {
    let sampler = createDefaultPassageFlowSampler();
    sampler = updatePassageFlowSampler(sampler, {
      pinned: false,
      movementBlocked: false,
      sideBlocked: true,
      colliding: true,
      swimmerColFrac: 3.2,
    });
    expect(
      evaluatePassageTimingTier({
        passageSampler: sampler,
        crossQualified: true,
        rejectReason: null,
      })
    ).toBe('acceptable');
  });

  it('returns failed for hard block in sampler', () => {
    expect(
      evaluatePassageTimingTier({
        passageSampler: {
          ...createDefaultPassageFlowSampler(),
          hardBlockSeen: true,
        },
        crossQualified: true,
        rejectReason: null,
      })
    ).toBe('failed');
  });

  it('returns failed for pin in sampler', () => {
    expect(
      evaluatePassageTimingTier({
        passageSampler: {
          ...createDefaultPassageFlowSampler(),
          pinnedSeen: true,
        },
        crossQualified: true,
        rejectReason: null,
      })
    ).toBe('failed');
  });

  it('returns failed for flow_hard_block reject', () => {
    expect(
      evaluatePassageTimingTier({
        passageSampler: cleanSampler,
        crossQualified: true,
        rejectReason: 'flow_hard_block',
      })
    ).toBe('failed');
  });

  it('returns null for no_topology_shift reject', () => {
    expect(
      evaluatePassageTimingTier({
        passageSampler: cleanSampler,
        crossQualified: true,
        rejectReason: 'no_topology_shift',
      })
    ).toBeNull();
  });

  it('downgrades perfect to acceptable when timing frozen', () => {
    expect(
      evaluatePassageTimingTier({
        passageSampler: cleanSampler,
        crossQualified: true,
        rejectReason: null,
        timingFrozen: true,
      })
    ).toBe('acceptable');
  });
});

describe('isFailedShiftRejectReason', () => {
  it('flags flow disqualifiers', () => {
    expect(isFailedShiftRejectReason('flow_pinned')).toBe(true);
    expect(isFailedShiftRejectReason('flow_hard_block')).toBe(true);
    expect(isFailedShiftRejectReason('payoff_pinned')).toBe(true);
    expect(isFailedShiftRejectReason('wide_open')).toBe(false);
  });
});

describe('isPassageTimingEvalFrozen', () => {
  it('is true during session speed ramp', () => {
    const session = {
      phase: 'playing',
      speedRampStartMs: 1000,
      gameplayRaisingSpeed: 200,
      visualRaisingSpeed: 0,
    } as GameSessionComponentData;
    expect(isPassageTimingEvalFrozen(session, 1100)).toBe(true);
    expect(isPassageTimingEvalFrozen(session, 2000)).toBe(false);
  });
});
