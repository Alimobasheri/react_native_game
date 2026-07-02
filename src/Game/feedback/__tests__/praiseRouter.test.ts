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
  it('picks higher priority word when only one slot needed', () => {
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
    expect(routed.events.length).toBeLessThanOrEqual(2);
  });

  it('allows TAP alongside word praise', () => {
    const routed = routeSkillPraiseEvents({
      candidates: [
        event('pin_coach', 'tap_coach', 40, 'TAP'),
        event('near_miss', 'near_miss', 80, 'Near Miss!'),
      ],
      state: createDefaultSkillFeedbackState(),
      nowMs: 5000,
      tuning: skillFeedbackTuning,
    });
    expect(routed.events.length).toBe(2);
  });

  it('emits up to two distinct skill words', () => {
    const routed = routeSkillPraiseEvents({
      candidates: [
        event('steer_clean', 'shift_commit', 110, 'NICE!'),
        event('near_miss', 'near_miss', 80, 'Near Miss!'),
      ],
      state: createDefaultSkillFeedbackState(),
      nowMs: 5000,
      tuning: skillFeedbackTuning,
    });
    const words = routed.events.filter((e) => e.momentId !== 'tap_coach');
    expect(words.length).toBe(2);
    expect(words.some((e) => e.copy === 'NICE!')).toBe(true);
    expect(words.some((e) => e.copy === 'Near Miss!')).toBe(true);
  });

  it('SAVED blocks near_miss on same frame', () => {
    const routed = routeSkillPraiseEvents({
      candidates: [
        event('near_miss', 'near_miss', 80, 'Near Miss!'),
        event('pin_coach', 'pin_saved', 90, 'SAVED!'),
      ],
      state: createDefaultSkillFeedbackState(),
      nowMs: 5000,
      tuning: skillFeedbackTuning,
    });
    const words = routed.events.filter((e) => e.momentId !== 'tap_coach');
    expect(words.length).toBe(1);
    expect(words[0]?.copy).toBe('SAVED!');
    expect(
      routed.dropped.some(
        (d) =>
          d.momentId === 'near_miss' && d.reason === 'blocked_by_saved'
      )
    ).toBe(true);
  });

  it('reports family_cooldown in dropped', () => {
    const state = createDefaultSkillFeedbackState();
    state.familyCooldowns.steer_clean = 4900;
    const routed = routeSkillPraiseEvents({
      candidates: [event('steer_clean', 'shift_commit', 60, 'NICE!')],
      state,
      nowMs: 5000,
      tuning: skillFeedbackTuning,
    });
    expect(routed.events.length).toBe(0);
    expect(routed.dropped).toEqual([
      {
        momentId: 'shift_commit',
        familyId: 'steer_clean',
        reason: 'family_cooldown',
      },
    ]);
  });

  it('reports max_word_slots when third word is outranked', () => {
    const routed = routeSkillPraiseEvents({
      candidates: [
        event('steer_clean', 'shift_commit', 110, 'NICE!'),
        event('near_miss', 'near_miss', 100, 'Near Miss!'),
        event('zigzag_tap', 'zigzag_tap', 50, 'ZIG-ZAG!'),
      ],
      state: createDefaultSkillFeedbackState(),
      nowMs: 5000,
      tuning: skillFeedbackTuning,
    });
    const words = routed.events.filter((e) => e.momentId !== 'tap_coach');
    expect(words.length).toBe(2);
    expect(
      routed.dropped.some((d) => d.reason === 'max_word_slots')
    ).toBe(true);
  });
});
