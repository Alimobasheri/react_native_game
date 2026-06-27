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

  it('increments streak and tier on rapid same-direction taps', () => {
    const locomotion = createDefaultSwimmerLocomotion();
    applyTapInputToLocomotion(locomotion, 1, 1000);
    const result = applyTapInputToLocomotion(
      locomotion,
      1,
      1000 + tapInputTuning.RAPID_TAP_WINDOW_MS - 10
    );
    expect(locomotion.rapidTapStreak).toBe(1);
    expect(result.streakMultiplier).toBeGreaterThan(1);
    expect(result.visualStrokeTier).toBe(2);
  });

  it('resets streak on direction change', () => {
    const locomotion = createDefaultSwimmerLocomotion();
    applyTapInputToLocomotion(locomotion, 1, 1000);
    applyTapInputToLocomotion(locomotion, 1, 1100);
    const result = applyTapInputToLocomotion(locomotion, -1, 1150);
    expect(locomotion.rapidTapStreak).toBe(0);
    expect(result.visualStrokeTier).toBe(1);
  });

  it('sqrt streak multiplier grows without cap for high streaks', () => {
    const mult5 = computeStreakMultiplier(5);
    const mult20 = computeStreakMultiplier(20);
    expect(mult20).toBeGreaterThan(mult5);
    expect(mult20).toBeGreaterThan(1 + tapInputTuning.STREAK_SQRT_COEFF * Math.sqrt(5));
  });

  it('rapid taps accumulate uncapped streak multiplier', () => {
    const locomotion = createDefaultSwimmerLocomotion();
    let now = 1000;
    for (let i = 0; i < 20; i++) {
      applyTapInputToLocomotion(locomotion, 1, now);
      now += 50;
    }
    expect(locomotion.pendingTapMultiplier).toBeGreaterThan(
      computeStreakMultiplier(5)
    );
  });
});
