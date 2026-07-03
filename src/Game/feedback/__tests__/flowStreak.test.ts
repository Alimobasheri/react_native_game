import { skillFeedbackTuning } from '@/config/skillFeedback';
import {
  flowStreakBonusMultiplier,
  flowStreakHudLabel,
  incrementFlowStreakValue,
  isFlowStreakHudVisible,
} from '@/config/flowStreak';
import {
  breakFlowStreak,
  breakFlowStreakOnContact,
  flowStreakDeltaFromUpdate,
  incrementFlowStreak,
  isGapShiftSeam,
  updateFlowStreakOnSeamCross,
} from '@/Game/feedback/flowStreak';
import {
  createDefaultFlowStreakState,
  defaultRowCrossContact,
  type RowCrossSnapshot,
} from '@/Game/feedback/skillFeedbackTypes';
import { topologyFromGaps } from '@/Game/feedback/gapTopology';

const COLS = 8;

const makeSnapshot = (
  gaps: number[],
  overrides: Partial<RowCrossSnapshot> = {}
): RowCrossSnapshot => ({
  rawGaps: gaps,
  topology: topologyFromGaps(gaps, COLS),
  branchKey: 'directed|flow',
  crossedAtMs: 0,
  swimmerCol: 3,
  swimmerColFrac: 3,
  cleanCross: true,
  contact: defaultRowCrossContact(),
  crossQualified: true,
  ...overrides,
});

describe('flowStreak config helpers', () => {
  it('incrementFlowStreakValue ignites at 2 then steps by 1', () => {
    expect(incrementFlowStreakValue(0)).toBe(2);
    expect(incrementFlowStreakValue(2)).toBe(3);
    expect(incrementFlowStreakValue(9)).toBe(10);
  });

  it('flowStreakBonusMultiplier mirrors active streak value', () => {
    expect(flowStreakBonusMultiplier(0)).toBe(1);
    expect(flowStreakBonusMultiplier(2)).toBe(2);
    expect(flowStreakBonusMultiplier(7)).toBe(7);
    expect(flowStreakBonusMultiplier(12)).toBe(12);
  });

  it('flowStreakHudLabel shows uncapped ×N from 2 upward', () => {
    expect(flowStreakHudLabel(0)).toBe('');
    expect(flowStreakHudLabel(1)).toBe('');
    expect(flowStreakHudLabel(2)).toBe('×2');
    expect(flowStreakHudLabel(11)).toBe('×11');
    expect(isFlowStreakHudVisible(2)).toBe(true);
    expect(isFlowStreakHudVisible(1)).toBe(false);
  });
});

describe('isGapShiftSeam', () => {
  it('detects center shift between rows', () => {
    const prev = makeSnapshot([4, 5]);
    const current = makeSnapshot([3, 4]);
    const shiftMin =
      skillFeedbackTuning.families.steer_clean.patterns.shift_commit
        ?.minCenterDeltaCols ?? 1;
    const wideOpen = skillFeedbackTuning.pathGates.wideOpenLaneWidth;
    expect(isGapShiftSeam(prev, current, wideOpen, shiftMin)).toBe(true);
  });

  it('returns false when center delta below min', () => {
    const gaps = [3, 4];
    const prev = makeSnapshot(gaps);
    const current = makeSnapshot(gaps);
    const shiftMin =
      skillFeedbackTuning.families.steer_clean.patterns.shift_commit
        ?.minCenterDeltaCols ?? 1;
    const wideOpen = skillFeedbackTuning.pathGates.wideOpenLaneWidth;
    expect(isGapShiftSeam(prev, current, wideOpen, shiftMin)).toBe(false);
  });
});

describe('updateFlowStreakOnSeamCross', () => {
  const now = 1000;
  let state = createDefaultFlowStreakState();

  it('1st perfect sets count to 2', () => {
    state = updateFlowStreakOnSeamCross(state, 'perfect', now);
    expect(state.count).toBe(2);
  });

  it('3 consecutive perfect seams reach 4', () => {
    state = createDefaultFlowStreakState();
    state = updateFlowStreakOnSeamCross(state, 'perfect', now);
    state = updateFlowStreakOnSeamCross(state, 'perfect', now + 1);
    state = updateFlowStreakOnSeamCross(state, 'perfect', now + 2);
    expect(state.count).toBe(4);
  });

  it('acceptable at seam breaks to 0', () => {
    state = incrementFlowStreak(state, now);
    state = updateFlowStreakOnSeamCross(state, 'acceptable', now + 1);
    expect(state.count).toBe(0);
    expect(state.lastBreakReason).toBe('acceptable');
  });

  it('failed at seam breaks to 0', () => {
    state = incrementFlowStreak(state, now);
    state = updateFlowStreakOnSeamCross(state, 'failed', now + 1);
    expect(state.count).toBe(0);
    expect(state.lastBreakReason).toBe('failed');
  });

  it('null tier leaves count unchanged', () => {
    state = incrementFlowStreak(state, now);
    state = updateFlowStreakOnSeamCross(state, null, now + 1);
    expect(state.count).toBe(2);
  });
});

describe('breakFlowStreakOnContact', () => {
  it('pin breaks from any positive streak', () => {
    let state = incrementFlowStreak(createDefaultFlowStreakState(), 100);
    state = breakFlowStreakOnContact(state, true, false, 200);
    expect(state.count).toBe(0);
    expect(state.lastBreakReason).toBe('pinned');
  });

  it('hard block breaks streak', () => {
    let state = incrementFlowStreak(createDefaultFlowStreakState(), 100);
    state = breakFlowStreakOnContact(state, false, true, 200);
    expect(state.count).toBe(0);
    expect(state.lastBreakReason).toBe('hard_block');
  });

  it('no-op when streak already 0', () => {
    const state = breakFlowStreakOnContact(
      createDefaultFlowStreakState(),
      true,
      true,
      200
    );
    expect(state.count).toBe(0);
  });
});

describe('flowStreakDeltaFromUpdate', () => {
  it('reports increment, break, and neutral', () => {
    expect(flowStreakDeltaFromUpdate(0, 2)).toBe(1);
    expect(flowStreakDeltaFromUpdate(3, 0)).toBe(-1);
    expect(flowStreakDeltaFromUpdate(2, 2)).toBe(0);
  });
});

describe('breakFlowStreak', () => {
  it('is no-op when already zero', () => {
    const state = breakFlowStreak(createDefaultFlowStreakState(), 'pinned', 1);
    expect(state.count).toBe(0);
  });
});
