import { applyTapInputToLocomotion, computeStreakMultiplier } from '../swimmerTapInput';
import { createDefaultSwimmerLocomotion } from '../swimmerLocomotionDefaults';
import { tapInputTuning } from '@/config/swimmerTuning';
import '../characterProfiles';

describe('swimmerTapInput', () => {
  it('starts streak at zero on first tap', () => {
    const locomotion = createDefaultSwimmerLocomotion();
    const result = applyTapInputToLocomotion(locomotion, 1, 1000);
    expect(locomotion.rapidTapStreak).toBe(0);
    expect(result.streakMultiplier).toBe(1);
    expect(result.visualStrokeTier).toBe(1);
  });

  it('accelerates multiplier on each rapid same-direction tap', () => {
    const locomotion = createDefaultSwimmerLocomotion();
    applyTapInputToLocomotion(locomotion, 1, 1000);
    const tap2 = applyTapInputToLocomotion(
      locomotion,
      1,
      1000 + tapInputTuning.RAPID_TAP_WINDOW_MS - 10
    );
    const tap3 = applyTapInputToLocomotion(
      locomotion,
      1,
      1000 + tapInputTuning.RAPID_TAP_WINDOW_MS * 2 - 20
    );
    expect(locomotion.rapidTapStreak).toBe(2);
    expect(tap2.streakMultiplier).toBeGreaterThan(1);
    expect(tap3.streakMultiplier).toBeGreaterThan(tap2.streakMultiplier);
    expect(tap2.visualStrokeTier).toBe(2);
  });

  it('resets streak on direction change', () => {
    const locomotion = createDefaultSwimmerLocomotion();
    applyTapInputToLocomotion(locomotion, 1, 1000);
    applyTapInputToLocomotion(locomotion, 1, 1100);
    const result = applyTapInputToLocomotion(locomotion, -1, 1150);
    expect(locomotion.rapidTapStreak).toBe(0);
    expect(result.streakMultiplier).toBe(1);
    expect(result.visualStrokeTier).toBe(1);
  });

  it('sixth rapid tap exceeds 2.5x (tap-fueled steering arc)', () => {
    expect(computeStreakMultiplier(5)).toBeGreaterThan(2.5);
  });

  it('caps streak multiplier at RAPID_TAP_MAX_MULT', () => {
    expect(computeStreakMultiplier(20)).toBe(tapInputTuning.RAPID_TAP_MAX_MULT);
  });

  it('rapid taps accumulate streak multiplier through the cap', () => {
    const locomotion = createDefaultSwimmerLocomotion();
    let now = 1000;
    for (let i = 0; i < 20; i++) {
      applyTapInputToLocomotion(locomotion, 1, now);
      now += 50;
    }
    expect(locomotion.pendingTapMultiplier).toBe(tapInputTuning.RAPID_TAP_MAX_MULT);
  });
});
