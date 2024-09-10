import { useValue } from '@shopify/react-native-skia';
import { useDerivedValue, withTiming, Easing } from 'react-native-reanimated';

interface TransitionConfig {
  duration?: number;
}

export const useSceneTransition = (
  isActive: boolean,
  enter: 'fade' | 'slide' | 'zoom' = 'fade',
  exit: 'fade' | 'slide' | 'zoom' = 'fade',
  config: TransitionConfig = { duration: 500 }
) => {
  const progress = useValue(isActive ? 1 : 0); // Shared progress value

  // Animate progress when isActive changes
  progress.current = withTiming(isActive ? 1 : 0, {
    duration: config.duration || 500,
    easing: Easing.inOut(Easing.ease),
  });

  // Derived values for each property based on transition type
  const opacity = useDerivedValue(() => {
    if (enter === 'fade' || exit === 'fade') {
      return progress.current; // Only change opacity in fade transitions
    }
    return 1; // Keep opacity constant in non-fade transitions
  });

  const transform = useDerivedValue(() => {
    if (enter === 'slide' || exit === 'slide') {
      return [{ translateY: progress.current * 300 }]; // Slide vertically by 300 units
    }
    if (enter === 'zoom' || exit === 'zoom') {
      return [{ scale: 1 + progress.current * 0.5 }]; // Zoom from scale 1 to 1.5
    }
    return [{ translateY: 0 }]; // Default no transform for other transitions
  });

  // Return animated props to be spread into the component
  return {
    props: {
      opacity,
      transform,
    },
  };
};
