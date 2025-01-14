import { runOnJS } from 'react-native-reanimated';
import { Animation } from '../../services/Animations';
import { linear } from '../easings';

export function createTimingAnimation(
  startValue: number,
  targetValue: number,
  duration: number,
  easing: (progress: number) => number = linear,
  label?: string
): Animation {
  return {
    update: (now, sharedValue, progress, isBackward, onAnimate) => {
      'worklet';
      const easedProgress = easing(progress);

      // Update the shared value
      sharedValue.value =
        startValue + easedProgress * (targetValue - startValue);

      const done = isBackward ? progress <= 0 : progress >= 1;

      // Return true if animation is done
      runOnJS(onAnimate)(done);
    },
  };
}
