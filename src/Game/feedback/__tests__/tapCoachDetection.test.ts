import { skillFeedbackTuning } from '@/config/skillFeedback';
import { createDefaultTapCoachState } from '../skillFeedbackTypes';
import { updateTapCoachDetection } from '../tapCoachDetection';

describe('updateTapCoachDetection', () => {
  it('emits TAP while pinned on repeat cadence', () => {
    const pinned = {
      ...createDefaultTapCoachState(),
      wasPinned: true,
      lastTapFlashMs: 0,
    };
    const result = updateTapCoachDetection({
      isPinned: true,
      swimmerX: 100,
      columnWidth: 50,
      state: pinned,
      nowMs: 400,
      anchorX: 100,
      anchorY: 200,
      tuning: skillFeedbackTuning,
      minEscapeTravelPx: 22,
    });
    expect(result.events[0]?.copy).toBe('TAP');
    expect(result.events[0]?.refreshExistingTap).toBe(true);
  });

  it('emits SAVED! on pin exit with enough travel', () => {
    const state = {
      ...createDefaultTapCoachState(),
      wasPinned: true,
      pinSessionStartX: 50,
      lastSavedMs: 0,
    };
    const result = updateTapCoachDetection({
      isPinned: false,
      swimmerX: 100,
      columnWidth: 50,
      state,
      nowMs: 2000,
      anchorX: 100,
      anchorY: 200,
      tuning: skillFeedbackTuning,
      minEscapeTravelPx: 22,
    });
    expect(result.events.some((e) => e.copy === 'SAVED!')).toBe(true);
  });
});
