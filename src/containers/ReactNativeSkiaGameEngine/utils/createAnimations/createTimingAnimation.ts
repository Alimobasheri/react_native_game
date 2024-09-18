import { Animation } from '../../services/Animations';

export function createTimingAnimation(
  startValue: number,
  targetValue: number,
  duration: number, // total animation duration
  easing: (progress: number) => number = (t) => t // optional easing function
): Animation {
  const startTime = Date.now();

  return {
    update: (sharedValue, progress, isBackward) => {
      const currentTime = Date.now();
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
