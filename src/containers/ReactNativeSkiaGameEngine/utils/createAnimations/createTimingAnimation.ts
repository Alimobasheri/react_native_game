import { runOnJS } from 'react-native-reanimated';
import { Animation } from '../../services/Animations';
import { linear } from '../easings';

const log = (value: any) => console.log(value);

export function createTimingAnimation(
  startValue: number,
  targetValue: number,
  duration: number,
  easing: (progress: number) => number = linear
): Animation {
  //@ts-ignore
  const startTime = global.nativePerformanceNow();

  return {
    update: (now, sharedValue, progress, isBackward, onAnimate) => {
      'worklet';
      //@ts-ignore
      const elapsedTime = now - startTime;

      const easedProgress = easing(progress);
      const directionMultiplier = isBackward ? -1 : 1;

      // Update the shared value
      sharedValue.value =
        startValue +
        easedProgress * directionMultiplier * (targetValue - startValue);

      const done = isBackward ? progress <= 0 : progress >= 1;

      // Return true if animation is done
      runOnJS(onAnimate)(done);
    },
  };
}
