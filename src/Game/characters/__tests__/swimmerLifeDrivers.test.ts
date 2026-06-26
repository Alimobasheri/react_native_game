import {
  advanceInternalLifePhase,
  computeBreathEnvelope,
  computeBreathMotion,
} from '../life/swimmerLifeDrivers';
import { createInternalLifeState } from '../life/swimmerLifeTypes';
import { swimmerLifeTuning } from '@/config/swimmerLifeTuning';

describe('swimmerLifeDrivers', () => {
  it('advances ripple phase and wraps at 1', () => {
    let state = createInternalLifeState();
    for (let i = 0; i < 400; i++) {
      state = advanceInternalLifePhase(state, 'ripple', 1 / 60);
    }
    expect(state.phase).toBeGreaterThan(0);
    expect(state.phase).toBeLessThan(1);
  });

  it('freezes phase for none profile', () => {
    const state = advanceInternalLifePhase({ phase: 0.42 }, 'none', 1);
    expect(state.phase).toBe(0.42);
  });

  it('breath envelope peaks mid-cycle and eases at ends', () => {
    expect(computeBreathEnvelope(0)).toBeCloseTo(0, 5);
    expect(computeBreathEnvelope(1)).toBeCloseTo(0, 5);
    expect(computeBreathEnvelope(0.5)).toBeCloseTo(1, 5);
    expect(computeBreathEnvelope(0.55)).toBeCloseTo(1, 5);
  });

  it('exhale changes fill faster than inhale at equal segment progress', () => {
    const { INTERNAL_BREATH_REST_FRAC, INTERNAL_BREATH_INHALE_FRAC, INTERNAL_BREATH_HOLD_FRAC, INTERNAL_BREATH_EXHALE_FRAC } =
      swimmerLifeTuning;
    const inhaleStart = INTERNAL_BREATH_REST_FRAC;
    const inhaleEnd = inhaleStart + INTERNAL_BREATH_INHALE_FRAC;
    const exhaleStart = inhaleEnd + INTERNAL_BREATH_HOLD_FRAC;
    const exhaleEnd = exhaleStart + INTERNAL_BREATH_EXHALE_FRAC;

    const inhaleAt30 = computeBreathEnvelope(inhaleStart + 0.3 * (inhaleEnd - inhaleStart));
    const exhaleAt30 = computeBreathEnvelope(exhaleStart + 0.3 * (exhaleEnd - exhaleStart));
    expect(exhaleAt30).toBeGreaterThan(inhaleAt30);

    const inhaleRate =
      computeBreathEnvelope(inhaleStart + 0.35 * (inhaleEnd - inhaleStart)) -
      computeBreathEnvelope(inhaleStart + 0.25 * (inhaleEnd - inhaleStart));
    const exhaleRate =
      computeBreathEnvelope(exhaleStart + 0.25 * (exhaleEnd - exhaleStart)) -
      computeBreathEnvelope(exhaleStart + 0.35 * (exhaleEnd - exhaleStart));
    expect(exhaleRate).toBeGreaterThan(inhaleRate);
  });

  it('glow tracks breath envelope', () => {
    const low = computeBreathMotion(0);
    const peak = computeBreathMotion(0.5);
    expect(peak.glow).toBeGreaterThan(low.glow);
    expect(peak.breath).toBeGreaterThan(low.breath);
  });
});
