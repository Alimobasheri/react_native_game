import { skillFeedbackTuning } from '@/config/skillFeedback';
import {
  evaluateCrossQualified,
  lerpSkillGate,
  resolveSkillGates,
} from '../skillSurvivalGates';
import { defaultRowCrossContact } from '../skillFeedbackTypes';

describe('lerpSkillGate', () => {
  it('returns easy endpoint at t=0', () => {
    expect(lerpSkillGate(0, 2, 0)).toBe(0);
  });

  it('returns hard endpoint at t=1', () => {
    expect(lerpSkillGate(0, 2, 1)).toBe(2);
  });

  it('interpolates midpoint', () => {
    expect(lerpSkillGate(0, 2, 0.5)).toBe(1);
  });
});

describe('resolveSkillGates', () => {
  it('uses easy thresholds at difficulty 0', () => {
    const gates = resolveSkillGates(0, 0.5, skillFeedbackTuning);
    expect(gates.adjacentForgiveness).toBe(0);
    expect(gates.surfMinNetDelta).toBe(4);
    expect(gates.steerCooldownMs).toBe(500);
    expect(gates.maxDirtyRowsInWindow).toBe(0);
  });

  it('uses hard thresholds at difficulty 1 and high speed', () => {
    const gates = resolveSkillGates(1, 1, skillFeedbackTuning);
    expect(gates.adjacentForgiveness).toBe(2);
    expect(gates.surfMinNetDelta).toBe(3);
    expect(gates.steerCooldownMs).toBe(250);
    expect(gates.maxDirtyRowsInWindow).toBe(2);
    expect(gates.swimmerSteerMinSpanCols).toBe(0);
  });
});

describe('evaluateCrossQualified', () => {
  const gatesEasy = resolveSkillGates(0, 0, skillFeedbackTuning);
  const gatesHard = resolveSkillGates(1, 0.8, skillFeedbackTuning);

  it('returns false when pinned', () => {
    expect(
      evaluateCrossQualified([3, 4, 5], 4, true, false, gatesHard, [], skillFeedbackTuning)
    ).toBe(false);
  });

  it('returns true on strict clean in-gap cross', () => {
    expect(
      evaluateCrossQualified([3, 4, 5], 4, false, false, gatesEasy, [], skillFeedbackTuning)
    ).toBe(true);
  });

  it('returns true at high diff near-gap without side block', () => {
    expect(
      evaluateCrossQualified([3, 4, 5], 3, false, false, gatesHard, [], skillFeedbackTuning)
    ).toBe(true);
  });

  it('returns false in solid column at low diff', () => {
    expect(
      evaluateCrossQualified([4, 5, 6], 0, false, false, gatesEasy, [], skillFeedbackTuning)
    ).toBe(false);
  });
});

describe('defaultRowCrossContact', () => {
  it('merges overrides', () => {
    const contact = defaultRowCrossContact({ sideBlocked: true, clearance01: 0.4 });
    expect(contact.sideBlocked).toBe(true);
    expect(contact.clearance01).toBe(0.4);
  });
});
