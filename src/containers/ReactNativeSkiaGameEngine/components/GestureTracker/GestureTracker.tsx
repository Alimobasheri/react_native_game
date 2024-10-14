import { FC } from 'react';
import { GestureItem } from '../../types/gestures';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

export interface IGestureTrackerProps {
  gesture: GestureItem;
}

export const GestureTracker: FC<IGestureTrackerProps> = ({ gesture }) => {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      position: 'absolute',
      top: 0,
      left: 0,
      width: gesture.rect.width.value,
      height: gesture.rect.height.value,
      transform: [
        { translateX: gesture.rect.x.value },
        { translateY: gesture.rect.y.value },
      ],
    };
  }, [gesture.rect.x, gesture.rect.y, gesture.rect.width, gesture.rect.height]);
  return (
    <GestureDetector gesture={gesture.gesture}>
      <Animated.View style={animatedStyle} />
    </GestureDetector>
  );
};
