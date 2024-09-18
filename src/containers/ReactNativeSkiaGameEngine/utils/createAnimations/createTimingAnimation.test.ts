import { createTimingAnimation } from './createTimingAnimation';
import { advanceTime, createMockSharedValue } from './mocks';

describe('Timing Animation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should interpolate from startValue to targetValue over duration', () => {
    const startValue = 0;
    const targetValue = 100;
    const duration = 2; // 2 seconds
    const sharedValue = createMockSharedValue(startValue);

    const animation = createTimingAnimation(startValue, targetValue, duration);

    // Simulate 1 second (halfway)
    advanceTime(1, () => {
      const isComplete = animation.update(sharedValue, 0.5, false);
      expect(sharedValue.value).toBeCloseTo(50, 1);
      expect(isComplete).toBe(false);
    });

    // Simulate 2 seconds (complete)
    advanceTime(1, () => {
      const isComplete = animation.update(sharedValue, 1, false);
      expect(sharedValue.value).toBeCloseTo(100, 1);
      expect(isComplete).toBe(true);
    });
  });

  it('should apply easing function correctly', () => {
    const easing = (t) => t * t; // Ease in quadratic
    const sharedValue = createMockSharedValue(0);
    const animation = createTimingAnimation(0, 100, 2, easing);

    // Simulate 1 second (halfway, but easing applied)
    advanceTime(1, () => {
      const isComplete = animation.update(sharedValue, 0.5, false);
      expect(sharedValue.value).toBeLessThan(50); // Should be less than 50 due to ease-in
      expect(isComplete).toBe(false);
    });
  });
});
