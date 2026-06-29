import { skillFeedbackTuning } from '@/config/skillFeedback';
import {
  createDefaultCeilingDodgeState,
} from '../skillFeedbackTypes';
import { updateCeilingDodgeDetection } from '../ceilingDodgeDetection';

describe('updateCeilingDodgeDetection', () => {
  it('fires on edge-enter brush when not pinned', () => {
    const result = updateCeilingDodgeDetection({
      brushing: true,
      isPinned: false,
      state: createDefaultCeilingDodgeState(),
      nowMs: 1000,
      speedNorm: 0.3,
      difficulty01: 0.2,
      rowHistory: [],
      anchorX: 0,
      anchorY: 0,
      tuning: skillFeedbackTuning,
    });
    expect(result.event?.copy).toBe('CLOSE!');
    expect(result.state.firesThisRun).toBe(1);
  });

  it('does not fire while pinned', () => {
    const result = updateCeilingDodgeDetection({
      brushing: true,
      isPinned: true,
      state: createDefaultCeilingDodgeState(),
      nowMs: 1000,
      speedNorm: 0.3,
      difficulty01: 0.2,
      rowHistory: [],
      anchorX: 0,
      anchorY: 0,
      tuning: skillFeedbackTuning,
    });
    expect(result.event).toBeNull();
  });

  it('respects cooldown', () => {
    const state = {
      ...createDefaultCeilingDodgeState(),
      lastFireMs: 1000,
      firesThisRun: 1,
      wasBrushing: false,
    };
    const result = updateCeilingDodgeDetection({
      brushing: true,
      isPinned: false,
      state,
      nowMs: 1200,
      speedNorm: 0.3,
      difficulty01: 0.2,
      rowHistory: [],
      anchorX: 0,
      anchorY: 0,
      tuning: skillFeedbackTuning,
    });
    expect(result.event).toBeNull();
  });
});
