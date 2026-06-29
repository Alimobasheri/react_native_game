import { skillFeedbackTuning } from '@/config/skillFeedback';
import { createDefaultSkillFeedbackState } from '../skillFeedbackTypes';
import { routeSkillPraiseEvents } from '../praiseRouter';
import type { SkillPraiseEvent } from '../skillFeedbackTypes';

const event = (
  family: SkillPraiseEvent['familyId'],
  moment: SkillPraiseEvent['momentId'],
  priority: number,
  copy: string
): SkillPraiseEvent => ({
  familyId: family,
  momentId: moment,
  copy,
  tierIndex: 0,
  bonusMin: 10,
  bonusMax: 20,
  priority,
  anchorX: 0,
  anchorY: 0,
});

describe('routeSkillPraiseEvents', () => {
  it('picks higher priority word event', () => {
    const routed = routeSkillPraiseEvents({
      candidates: [
        event('steer_clean', 'shift_commit', 60, 'NICE!'),
        event('snap_transfer', 'pinhole_flare_snap', 100, 'CRAZY!'),
      ],
      state: createDefaultSkillFeedbackState(),
      nowMs: 5000,
      tuning: skillFeedbackTuning,
    });
    expect(routed.events.some((e) => e.copy === 'CRAZY!')).toBe(true);
    expect(routed.events.filter((e) => e.copy === 'NICE!').length).toBe(0);
  });

  it('allows TAP alongside word praise', () => {
    const routed = routeSkillPraiseEvents({
      candidates: [
        event('pin_coach', 'tap_coach', 40, 'TAP'),
        event('ceiling_dodge', 'ceiling_brush', 80, 'CLOSE!'),
      ],
      state: createDefaultSkillFeedbackState(),
      nowMs: 5000,
      tuning: skillFeedbackTuning,
    });
    expect(routed.events.length).toBe(2);
  });

  it('SAVED outranks CLOSE via priority', () => {
    const routed = routeSkillPraiseEvents({
      candidates: [
        event('ceiling_dodge', 'ceiling_brush', 80, 'CLOSE!'),
        event('pin_coach', 'pin_saved', 90, 'SAVED!'),
      ],
      state: createDefaultSkillFeedbackState(),
      nowMs: 5000,
      tuning: skillFeedbackTuning,
    });
    const words = routed.events.filter((e) => e.momentId !== 'tap_coach');
    expect(words[0]?.copy).toBe('SAVED!');
  });
});
