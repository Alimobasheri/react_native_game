import { skillFeedbackTuning } from '@/config/skillFeedback';
import {
  computePraiseBonus,
  rollBonusInRange,
} from '../praiseBonus';
import type { SkillPraiseEvent } from '../skillFeedbackTypes';

const baseEvent: SkillPraiseEvent = {
  familyId: 'steer_clean',
  momentId: 'shift_commit',
  copy: 'NICE!',
  tierIndex: 0,
  bonusMin: 10,
  bonusMax: 20,
  priority: 110,
  anchorX: 0,
  anchorY: 0,
};

const nearMissEvent: SkillPraiseEvent = {
  familyId: 'near_miss',
  momentId: 'near_miss',
  copy: 'Near Miss!',
  tierIndex: 0,
  bonusMin: 10,
  bonusMax: 20,
  priority: 80,
  anchorX: 0,
  anchorY: 0,
  bonusIgnoreClearance: true,
};

describe('rollBonusInRange', () => {
  it('returns min at roll 0', () => {
    expect(rollBonusInRange(10, 25, 0)).toBe(10);
  });

  it('returns max at roll 1', () => {
    expect(rollBonusInRange(10, 25, 1)).toBe(25);
  });
});

describe('computePraiseBonus', () => {
  it('increases bonus with lower clearance (tighter squeeze)', () => {
    const tight = computePraiseBonus(
      baseEvent,
      0.1,
      200,
      0.5,
      skillFeedbackTuning,
      0.5
    );
    const open = computePraiseBonus(
      baseEvent,
      0.95,
      200,
      0.5,
      skillFeedbackTuning,
      0.5
    );
    expect(tight).toBeGreaterThan(open);
  });

  it('ignores clearance for near miss events', () => {
    const tight = computePraiseBonus(
      nearMissEvent,
      0.05,
      200,
      0.5,
      skillFeedbackTuning,
      0.5
    );
    const open = computePraiseBonus(
      nearMissEvent,
      0.95,
      200,
      0.5,
      skillFeedbackTuning,
      0.5
    );
    expect(tight).toBe(open);
  });

  it('returns 0 for zero bonus events', () => {
    const tapEvent: SkillPraiseEvent = {
      ...baseEvent,
      bonusMin: 0,
      bonusMax: 0,
      momentId: 'tap_coach',
      copy: 'TAP',
    };
    expect(
      computePraiseBonus(tapEvent, 0.2, 300, 0.5, skillFeedbackTuning, 0.5)
    ).toBe(0);
  });

  it('increases bonus with higher hygiene01', () => {
    const lowHygiene = computePraiseBonus(
      baseEvent,
      0.5,
      200,
      0.5,
      skillFeedbackTuning,
      0.5,
      0.2
    );
    const highHygiene = computePraiseBonus(
      baseEvent,
      0.5,
      200,
      0.5,
      skillFeedbackTuning,
      0.5,
      0.95
    );
    expect(highHygiene).toBeGreaterThan(lowHygiene);
  });

  it('multiplies bonus by flow streak value', () => {
    const fixedEvent = { ...baseEvent, bonusMin: 10, bonusMax: 10 };
    const args = [fixedEvent, 0.5, 200, 0.5, skillFeedbackTuning, 0, 1] as const;
    const inactive = computePraiseBonus(...args, 0);
    const atTwo = computePraiseBonus(...args, 2);
    const atFive = computePraiseBonus(...args, 5);
    const atTwelve = computePraiseBonus(...args, 12);
    expect(atTwo).toBeGreaterThan(inactive);
    expect(atFive).toBeGreaterThan(atTwo);
    expect(atTwelve).toBeGreaterThan(atFive);
    expect(atTwo / inactive).toBeCloseTo(2, 0);
    expect(atFive / inactive).toBeCloseTo(5, 0);
    expect(atTwelve / inactive).toBeCloseTo(12, 0);
  });
});
