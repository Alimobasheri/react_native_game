import { skillFeedbackTuning } from '@/config/skillFeedback';
import { createDefaultZigzagTapState } from '../skillFeedbackTypes';
import { updateZigzagTapDetection } from '../zigzagTapDetection';

const enabledZigzagTuning = {
  ...skillFeedbackTuning,
  families: {
    ...skillFeedbackTuning.families,
    zigzag_tap: {
      ...skillFeedbackTuning.families.zigzag_tap,
      enabled: true,
    },
  },
};

const baseCtx = {
  speedNorm: 0.5,
  difficulty01: 0.4,
  anchorX: 0,
  anchorY: 0,
  tuning: enabledZigzagTuning,
};

describe('updateZigzagTapDetection', () => {
  it('fires ZIG-ZAG! after alternating tap streak', () => {
    let state = createDefaultZigzagTapState();

    state = updateZigzagTapDetection({
      ...baseCtx,
      lastTapTimeMs: 100,
      lastTapDirection: 1,
      state,
      nowMs: 100,
    }).state;

    state = updateZigzagTapDetection({
      ...baseCtx,
      lastTapTimeMs: 200,
      lastTapDirection: -1,
      state,
      nowMs: 200,
    }).state;

    state = updateZigzagTapDetection({
      ...baseCtx,
      lastTapTimeMs: 300,
      lastTapDirection: 1,
      state,
      nowMs: 300,
    }).state;

    const result = updateZigzagTapDetection({
      ...baseCtx,
      lastTapTimeMs: 400,
      lastTapDirection: -1,
      state,
      nowMs: 400,
    });
    expect(result.event?.copy).toBe('ZIG-ZAG!');
    expect(result.event?.momentId).toBe('zigzag_tap');
  });

  it('resets streak on same-direction tap', () => {
    let state = createDefaultZigzagTapState();

    state = updateZigzagTapDetection({
      ...baseCtx,
      lastTapTimeMs: 100,
      lastTapDirection: 1,
      state,
      nowMs: 100,
    }).state;

    state = updateZigzagTapDetection({
      ...baseCtx,
      lastTapTimeMs: 200,
      lastTapDirection: -1,
      state,
      nowMs: 200,
    }).state;

    const sameDir = updateZigzagTapDetection({
      ...baseCtx,
      lastTapTimeMs: 300,
      lastTapDirection: -1,
      state,
      nowMs: 300,
    });
    expect(sameDir.event).toBeNull();
    expect(sameDir.state.streak).toBe(0);
  });

  it('upgrades to ZIG-ZAG KING! at long streak with speed/diff', () => {
    const state = {
      ...createDefaultZigzagTapState(),
      streak: 4,
      lastTapDir: 1 as const,
      lastTapMs: 1000,
      lastProcessedTapMs: 1000,
    };
    const result = updateZigzagTapDetection({
      ...baseCtx,
      speedNorm: 0.6,
      difficulty01: 0.5,
      lastTapTimeMs: 1300,
      lastTapDirection: -1,
      state,
      nowMs: 1300,
    });
    expect(result.event?.copy).toBe('ZIG-ZAG KING!');
    expect(result.state.streak).toBe(5);
  });

  it('returns null when zigzag_tap family is disabled in config', () => {
    const state = {
      ...createDefaultZigzagTapState(),
      streak: 4,
      lastTapDir: 1 as const,
      lastTapMs: 1000,
      lastProcessedTapMs: 1000,
    };
    const result = updateZigzagTapDetection({
      ...baseCtx,
      tuning: skillFeedbackTuning,
      speedNorm: 0.6,
      difficulty01: 0.5,
      lastTapTimeMs: 1300,
      lastTapDirection: -1,
      state,
      nowMs: 1300,
    });
    expect(result.event).toBeNull();
  });
});
