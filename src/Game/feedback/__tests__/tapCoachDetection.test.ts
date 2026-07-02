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
      speedNorm: 0.3,
      difficulty01: 0.2,
    });
    expect(result.events[0]?.copy).toBe('TAP');
    expect(result.events[0]?.refreshExistingTap).toBe(true);
  });

  it('emits SAVED! on pin exit with enough travel and latch duration', () => {
    const state = {
      ...createDefaultTapCoachState(),
      wasPinned: true,
      pinSessionStartX: 50,
      lastSavedMs: 0,
      pinEnterMs: 1000,
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
      speedNorm: 0.5,
      difficulty01: 0.5,
    });
    expect(result.events.some((e) => e.copy === 'SAVED!')).toBe(true);
  });

  it('does not emit SAVED! on brief pin below latch grace', () => {
    const state = {
      ...createDefaultTapCoachState(),
      wasPinned: true,
      pinSessionStartX: 50,
      lastSavedMs: 0,
      pinEnterMs: 5000,
    };
    const result = updateTapCoachDetection({
      isPinned: false,
      swimmerX: 100,
      columnWidth: 50,
      state,
      nowMs: 5050,
      anchorX: 100,
      anchorY: 200,
      tuning: skillFeedbackTuning,
      minEscapeTravelPx: 22,
      speedNorm: 0.5,
      difficulty01: 0.5,
    });
    expect(result.events.some((e) => e.copy === 'SAVED!')).toBe(false);
  });
});
