import { skillFeedbackTuning } from '@/config/skillFeedback';
import { createDefaultStitchSampler } from '../skillFeedbackTypes';
import { createDefaultNearMissState } from '../skillFeedbackTypes';
import { updateNearMissDetection } from '../nearMissDetection';

const baseCtx = {
  speedNorm: 0.5,
  difficulty01: 0.4,
  anchorX: 0,
  anchorY: 0,
  tuning: skillFeedbackTuning,
  stitchSampler: createDefaultStitchSampler(),
};

describe('updateNearMissDetection', () => {
  it('fires Near Miss! when tap escapes pin threat without latch', () => {
    const tapMs = 1000;
    let state = createDefaultNearMissState();

    const duringThreat = updateNearMissDetection({
      ...baseCtx,
      ceilingBrush: true,
      isPinned: false,
      lastTapTimeMs: tapMs,
      lastTapDirection: 1,
      state,
      nowMs: tapMs,
    });
    state = duringThreat.state;
    expect(duringThreat.event).toBeNull();

    const escaped = updateNearMissDetection({
      ...baseCtx,
      ceilingBrush: false,
      isPinned: false,
      lastTapTimeMs: tapMs,
      lastTapDirection: 1,
      state,
      nowMs: tapMs + 50,
    });
    expect(escaped.event?.copy).toMatch(/Near Miss!|Close One!|Too Close!|Cheated Death!/);
    expect(escaped.event?.momentId).toBe('near_miss');
    expect(escaped.event?.bonusIgnoreClearance).toBe(true);
  });

  it('does not fire without recent tap during threat', () => {
    let state = createDefaultNearMissState();

    state = updateNearMissDetection({
      ...baseCtx,
      ceilingBrush: true,
      isPinned: false,
      state,
      nowMs: 1000,
    }).state;

    const escaped = updateNearMissDetection({
      ...baseCtx,
      ceilingBrush: false,
      isPinned: false,
      state,
      nowMs: 1100,
    });
    expect(escaped.event).toBeNull();
  });

  it('does not fire on real latch escape', () => {
    const tapMs = 2000;
    let state = createDefaultNearMissState();

    state = updateNearMissDetection({
      ...baseCtx,
      ceilingBrush: true,
      isPinned: true,
      lastTapTimeMs: tapMs,
      lastTapDirection: -1,
      state,
      nowMs: tapMs,
    }).state;

    state = updateNearMissDetection({
      ...baseCtx,
      ceilingBrush: true,
      isPinned: true,
      lastTapTimeMs: tapMs + 100,
      lastTapDirection: -1,
      state,
      nowMs: tapMs + 500,
    }).state;

    const escaped = updateNearMissDetection({
      ...baseCtx,
      ceilingBrush: false,
      isPinned: false,
      lastTapTimeMs: tapMs + 100,
      lastTapDirection: -1,
      state,
      nowMs: tapMs + 600,
    });
    expect(escaped.event).toBeNull();
  });

  it('fires on brief latch below grace threshold', () => {
    const tapMs = 3000;
    let state = createDefaultNearMissState();

    state = updateNearMissDetection({
      ...baseCtx,
      ceilingBrush: true,
      isPinned: false,
      lastTapTimeMs: tapMs,
      lastTapDirection: 1,
      state,
      nowMs: tapMs,
    }).state;

    state = updateNearMissDetection({
      ...baseCtx,
      ceilingBrush: true,
      isPinned: true,
      lastTapTimeMs: tapMs + 10,
      lastTapDirection: 1,
      state,
      nowMs: tapMs + 30,
    }).state;

    const escaped = updateNearMissDetection({
      ...baseCtx,
      ceilingBrush: false,
      isPinned: false,
      lastTapTimeMs: tapMs + 10,
      lastTapDirection: 1,
      state,
      nowMs: tapMs + 50,
    });
    expect(escaped.event?.copy).toMatch(/Near Miss!|Close One!|Too Close!|Cheated Death!/);
  });

  it('respects cooldown', () => {
    const state = {
      ...createDefaultNearMissState(),
      lastFireMs: 1000,
      firesThisRun: 1,
    };
    const duringThreat = updateNearMissDetection({
      ...baseCtx,
      ceilingBrush: true,
      isPinned: false,
      lastTapTimeMs: 1000,
      lastTapDirection: 1,
      state: { ...state, inThreat: true, lastQualifyingTapMs: 1000 },
      nowMs: 1100,
    });
    const escaped = updateNearMissDetection({
      ...baseCtx,
      ceilingBrush: false,
      isPinned: false,
      lastTapTimeMs: 1000,
      lastTapDirection: 1,
      state: { ...duringThreat.state, inThreat: true, lastQualifyingTapMs: 1000 },
      nowMs: 1150,
    });
    expect(escaped.event).toBeNull();
  });
});
