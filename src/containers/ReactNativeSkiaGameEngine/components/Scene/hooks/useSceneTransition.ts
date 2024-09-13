import { useEffect } from 'react';
import {
  useDerivedValue,
  withTiming,
  Easing,
  useSharedValue,
} from 'react-native-reanimated';

interface TransitionConfig {
  duration?: number;
}

/**
 * Hook that manages scene transitions (enter and exit animations) for a scene.
 * It provides animation properties that can be applied to the scene's root component.
 *
 * @param {boolean} isActive - Whether the scene is currently active.
 * @param {'fade'|'slide'|'zoom'} enter - The transition effect when the scene enters.
 * @param {'fade'|'slide'|'zoom'} exit - The transition effect when the scene exits.
 * @param {Object} config - Configuration for transition durations.
 * @param {number} [config.duration=500] - Default duration for transitions.
 * @param {number} [config.enterDuration] - Specific duration for the enter transition (overrides `duration`).
 * @param {number} [config.exitDuration] - Specific duration for the exit transition (overrides `duration`).
 *
 * @returns {Object} props - The animation properties for the scene.
 * @returns {Object} props.opacity - Animated opacity value.
 * @returns {Object} props.transform - Animated transformation (e.g., translateY for slide).
 *
 * @example
 * const { props } = useSceneTransition(true, 'fade', 'slide', { duration: 300 });
 * <Rect {...props}>Scene Content</Rect>
 */
export const useSceneTransition = (
  isActive: boolean,
  enter: 'fade' | 'slide' | 'zoom' | null = null,
  exit: 'fade' | 'slide' | 'zoom' | null = null,
  config: {
    duration?: number;
    enterDuration?: number;
    exitDuration?: number;
  } = { duration: 500 }
) => {
  const enterDuration = config.enterDuration ?? config.duration ?? 500;
  const exitDuration = config.exitDuration ?? config.duration ?? 500;
  const duration = isActive ? enterDuration : exitDuration;

  const progress = useSharedValue(isActive ? 0 : 1);

  useEffect(() => {
    if (duration === 0) {
      progress.value = isActive ? 1 : 0;
    } else {
      progress.value = withTiming(isActive ? 1 : 0, {
        duration,
        easing: Easing.inOut(Easing.ease),
      });
    }
  }, [isActive]);

  const opacity = useDerivedValue(() => {
    if (enter === 'fade' || exit === 'fade') {
      return progress.value;
    }
    return 1;
  });

  const transform = useDerivedValue(() => {
    if (enter === 'slide' || exit === 'slide') {
      return [{ translateY: (1 - progress.value) * 300 }];
    }
    if (enter === 'zoom' || exit === 'zoom') {
      return [{ scale: 1 + (1 - progress.value) * 0.5 }];
    }
    return [{ translateY: 0 }];
  });

  return {
    props: {
      opacity,
      transform,
    },
  };
};
