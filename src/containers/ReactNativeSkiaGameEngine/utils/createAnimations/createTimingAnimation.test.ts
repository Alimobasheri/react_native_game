import { createTimingAnimation } from './createTimingAnimation';
import { createMockSharedValue } from './mocks';
import {
  advanceTime,
  mockRequestAnimationFrame,
  resetTestTimers,
} from '../testUtils';

describe('Timing Animation', () => {
  let onAnimateDoneMock: jest.Mock;
  beforeEach(() => {
    mockRequestAnimationFrame();
    onAnimateDoneMock = jest.fn((done: boolean) => null);
  });

  afterEach(() => {
    jest.clearAllMocks();
    resetTestTimers();
  });

  it('should interpolate from startValue to targetValue over duration', () => {
    const startValue = 0;
    const targetValue = 100;
    const duration = 2; // 2 seconds
    const sharedValue = createMockSharedValue(startValue);

    const animation = createTimingAnimation(startValue, targetValue, duration);

    // Simulate 1 second (halfway)
    advanceTime(1 * 1000, () => {
      const isComplete = animation.update(
        //@ts-ignore
        global.nativePerformanceNow(),
        sharedValue,
        0.5,
        false,
        onAnimateDoneMock
      );
      expect(sharedValue.value).toBeCloseTo(50, 1);
      expect(onAnimateDoneMock).toHaveBeenCalledWith(false);
    });

    // Simulate 2 seconds (complete)
    advanceTime(1 * 1000, () => {
      const isComplete = animation.update(
        //@ts-ignore
        global.nativePerformanceNow(),
        sharedValue,
        1,
        false,
        onAnimateDoneMock
      );
      expect(sharedValue.value).toBeCloseTo(100, 1);
      expect(onAnimateDoneMock).toHaveBeenCalledWith(true);
    });
  });

  it('should apply easing function correctly', () => {
    const easing = (t: number) => {
      'worklet';
      return t * t; // Ease in quadratic
    };
    const sharedValue = createMockSharedValue(0);
    const animation = createTimingAnimation(0, 100, 2, easing);

    // Simulate 1 second (halfway, but easing applied)
    advanceTime(1 * 1000, () => {
      const isComplete = animation.update(
        //@ts-ignore
        global.nativePerformanceNow(),
        sharedValue,
        0.5,
        false,
        onAnimateDoneMock
      );
      expect(sharedValue.value).toBeLessThan(50);
      expect(onAnimateDoneMock).toHaveBeenCalledWith(false);
    });
  });
});
