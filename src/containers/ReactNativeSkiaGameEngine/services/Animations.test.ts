// Animations.test.ts
import Animated, {
  runOnJS,
  SharedValue,
  useSharedValue,
} from 'react-native-reanimated';
import Animations, { Animation, AnimationConfig } from './Animations';
import { renderHook, waitFor } from '@testing-library/react-native';
let mockId = 0;
jest.mock('uuid', () => ({
  v4: jest.fn(() => {
    mockId++;
    return 'unique-id-mock' + mockId;
  }), // Mocking uuid to return a consistent value
}));

describe('Animations class', () => {
  let animations: Animations;
  let sharedValue: { value: number };
  let mockAnimation: Animation;
  let mockTime: number;

  const advanceTimeBy = (ms: number) => {
    mockTime += ms;
    animations.updateAnimations();
  };

  beforeEach(() => {
    animations = new Animations();
    mockTime = 0;

    //@ts-ignore
    global.nativePerformanceNow = jest.fn(() => mockTime);

    sharedValue = { value: 0 };
    mockAnimation = {
      update: jest.fn(
        (now, mockedSharedValue, progress, isBackward, onAnimateDone) => {
          'worklet';
          mockedSharedValue.value = progress * 100;

          const done = isBackward ? progress <= 0 : progress >= 1;
          runOnJS(onAnimateDone)(done);
        }
      ),
    };
  });

  it('should register an animation with label and group', () => {
    const config: AnimationConfig = {
      label: 'test',
      groups: ['group1'],
      duration: 500,
    };
    animations.registerAnimation(sharedValue, mockAnimation, config);
    expect(animations.getAnimationByLabel('test')).toBeDefined();
    expect(animations.getAnimationsByGroup('group1').length).toBe(1);
  });

  it('should update animation progress manually by advancing time', async () => {
    const config: AnimationConfig = { duration: 500 };
    animations.registerAnimation(sharedValue, mockAnimation, config);

    advanceTimeBy(250);
    await waitFor(() => {
      expect(sharedValue.value).toBe(50); // Midway through animation
    });

    advanceTimeBy(240);
    await waitFor(() => {
      expect(sharedValue.value).toBe(98); // Near The End
    });

    advanceTimeBy(10);
    await waitFor(() => {
      expect(sharedValue.value).toBe(100); // Completed
    });
  });

  it('should pause and resume animation correctly', async () => {
    const config: AnimationConfig = { duration: 500, label: 'test' };
    animations.registerAnimation(sharedValue, mockAnimation, config);

    advanceTimeBy(250);
    animations.pauseAnimation({ label: 'test' });
    await waitFor(() => {
      expect(sharedValue.value).toBe(50); // Paused midway
    });

    advanceTimeBy(250);
    await waitFor(() => {
      expect(sharedValue.value).toBe(50); // Should not update while paused
    });

    animations.resumeAnimation({ label: 'test' });
    advanceTimeBy(250);
    await waitFor(() => {
      expect(sharedValue.value).toBe(100); // Resumes and completes
    });
  });

  it('should stop animation and reset to original value', async () => {
    sharedValue.value = 0;
    const config: AnimationConfig = { duration: 500, label: 'test' };
    animations.registerAnimation(sharedValue, mockAnimation, config);

    advanceTimeBy(250);
    await waitFor(() => {
      expect(sharedValue.value).toBe(50); // Midway
    });

    animations.stopAnimation({ label: 'test' });
    await waitFor(() => {
      expect(sharedValue.value).toBe(0); // Reset to original value
    });
  });

  it('should loop animation a specified number of times', async () => {
    const config: AnimationConfig = { duration: 500, loop: 2 };
    animations.registerAnimation(sharedValue, mockAnimation, config);

    advanceTimeBy(500);
    await waitFor(() => {
      expect(sharedValue.value).toBe(100); // 1st loop complete
    });

    advanceTimeBy(500);
    await waitFor(() => {
      expect(sharedValue.value).toBe(100); // 2nd loop complete
      expect(mockAnimation.update).toHaveBeenCalledTimes(2);
    });

    advanceTimeBy(500);
    await waitFor(() => {
      expect(sharedValue.value).toBe(100); // Should not loop anymore
    });
  });

  it('should handle yoyo behavior correctly', async () => {
    const config: AnimationConfig = { duration: 500, yoyo: true, loop: 2 };
    animations.registerAnimation(sharedValue, mockAnimation, config);

    advanceTimeBy(500);
    await waitFor(() => {
      expect(sharedValue.value).toBe(100); // First forward pass
    });

    advanceTimeBy(500);
    await waitFor(() => {
      expect(sharedValue.value).toBe(0); // First backward pass
    });

    advanceTimeBy(500);
    await waitFor(() => {
      expect(sharedValue.value).toBe(100); // Second forward pass
    });

    advanceTimeBy(500);
    await waitFor(() => {
      expect(sharedValue.value).toBe(0); // Second backward pass complete
    });
  });

  it('should remove animation after completion if removeOnComplete is true', async () => {
    const config: AnimationConfig = {
      duration: 500,
      removeOnComplete: true,
      label: 'test',
    };
    animations.registerAnimation(sharedValue, mockAnimation, config);

    advanceTimeBy(250);
    await waitFor(() => {
      expect(animations.getAnimationByLabel('test')).toBeDefined();
    });

    advanceTimeBy(250); // Animation completes
    await waitFor(() => {
      expect(animations.getAnimationByLabel('test')).toBeUndefined(); // Removed after completion
    });
  });

  it('should retain final value if retainFinalValue is true', async () => {
    const config: AnimationConfig = {
      duration: 500,
      retainFinalValue: true,
      label: 'test',
    };
    animations.registerAnimation(sharedValue, mockAnimation, config);

    advanceTimeBy(500);
    await waitFor(() => {
      expect(sharedValue.value).toBe(100); // Animation reaches final value
    });

    advanceTimeBy(500); // Should not reset value after completion
    await waitFor(() => {
      expect(sharedValue.value).toBe(100); // Final value retained
    });
  });

  it('should stop and remove all animations in a group', async () => {
    const config: AnimationConfig = { duration: 500, groups: ['group1'] };
    animations.registerAnimation(sharedValue, mockAnimation, config);
    animations.registerAnimation(
      { value: 0 } as SharedValue<number>,
      mockAnimation,
      config
    );

    advanceTimeBy(250);
    animations.stopAnimation({ group: 'group1' });

    await waitFor(() => {
      expect(
        animations
          .getAnimationsByGroup('group1')
          .filter((animation) => animation.isRunning).length
      ).toBe(0); // Group should be cleared
    });
  });

  it('should resume paused animations in a group', async () => {
    const config: AnimationConfig = { duration: 500, groups: ['group1'] };
    animations.registerAnimation(sharedValue, mockAnimation, config);
    animations.registerAnimation(
      { value: 0 } as SharedValue<number>,
      mockAnimation,
      config
    );

    advanceTimeBy(250);
    animations.pauseAnimation({ group: 'group1' });
    await waitFor(() => {
      expect(sharedValue.value).toBe(50); // Paused midway
    });

    animations.resumeAnimation({ group: 'group1' });
    advanceTimeBy(250);
    await waitFor(() => {
      expect(sharedValue.value).toBe(100); // Resumes and completes
    });
  });

  it('should handle infinite looping animations', async () => {
    const config: AnimationConfig = { duration: 500, loop: -1 };
    animations.registerAnimation(sharedValue, mockAnimation, config);

    for (let i = 0; i < 5; i++) {
      advanceTimeBy(500);
      await waitFor(() => {
        expect(sharedValue.value).toBe(100); // Each loop should complete
      });
    }
  });

  it('should not remove animations if removeOnComplete is false', async () => {
    const config: AnimationConfig = {
      duration: 500,
      removeOnComplete: false,
      label: 'test',
    };
    animations.registerAnimation(sharedValue, mockAnimation, config);

    advanceTimeBy(1000); // Complete animation
    await waitFor(() => {
      expect(animations.getAnimationByLabel('test')).toBeDefined(); // Still present after completion
    });
  });
  it('should handle loop interval correctly between loops', async () => {
    const config: AnimationConfig = {
      duration: 500,
      loop: 2,
      loopInterval: 300,
    };
    animations.registerAnimation(sharedValue, mockAnimation, config);

    advanceTimeBy(500);
    await waitFor(() => {
      expect(sharedValue.value).toBe(100); // 1st loop complete
    });

    advanceTimeBy(299); // Waiting for loop interval
    await waitFor(() => {
      expect(sharedValue.value).toBe(100); // Interval is nearly over, and next loop is about to start, value retained
    });

    advanceTimeBy(1);
    await waitFor(() => {
      expect(sharedValue.value).toBe(0); // 2nd loop sstarting, value reset
      expect(mockAnimation.update).toHaveBeenCalledTimes(2);
    });
    advanceTimeBy(500);
    await waitFor(() => {
      expect(sharedValue.value).toBe(100); // 2nd loop complete
      expect(mockAnimation.update).toHaveBeenCalledTimes(3);
    });
  });
});
