import { Animation } from '../../services/Animations';
import { linear } from '../easings';

export function createTimingAnimation(
  startValue: number,
  targetValue: number,
  duration: number,
  easing: (progress: number) => number = linear
): Animation {
  //@ts-ignore
  const startTime = global.nativePerformanceNow();

  return {
    update: (sharedValue, progress, isBackward) => {
      //@ts-ignore
      const currentTime = global.nativePerformanceNow();
      const elapsedTime = (currentTime - startTime) / 1000; // seconds
      const progressValue = Math.min(elapsedTime / duration, 1);

      const easedProgress = easing(progressValue);
      const directionMultiplier = isBackward ? -1 : 1;

      // Update the shared value
      sharedValue.value =
        startValue +
        easedProgress * directionMultiplier * (targetValue - startValue);

      // Return true if animation is done
      return progressValue >= 1;
    },
  };
}
