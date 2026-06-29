import { skillFeedbackTuning } from '@/config/skillFeedback';
import {
  computePraiseBonus,
  rollBonusInRange,
} from '../praiseBonus';
import type { SkillPraiseEvent } from '../skillFeedbackTypes';

const baseEvent: SkillPraiseEvent = {
  familyId: 'ceiling_dodge',
  momentId: 'ceiling_brush',
  copy: 'CLOSE!',
  tierIndex: 0,
  bonusMin: 10,
  bonusMax: 20,
  priority: 80,
  anchorX: 0,
  anchorY: 0,
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

  it('does not change copy — bonus only', () => {
    expect(baseEvent.copy).toBe('CLOSE!');
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
});
