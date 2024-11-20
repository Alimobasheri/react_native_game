import { TransitionPhase } from '@/containers/ReactNativeSkiaGameEngine/components/Scene/types/transitions';
import { useSceneTransitioning } from '@/containers/ReactNativeSkiaGameEngine/hooks/useSceneTransitioning';
import { Text, useFont } from '@shopify/react-native-skia';
import { FC, useEffect, useLayoutEffect } from 'react';
import {
  useDerivedValue,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

interface IGameOverTitleProps {
  x: number;
  y: number;
}

export const GameOverTitle: FC<IGameOverTitleProps> = ({ x, y }) => {
  const font = useFont(
    require('../../../../../assets/fonts/Montserrat-SemiBold.ttf'),
    66
  );
  const translateY = useSharedValue(0);
  useSceneTransitioning({
    callback: ({ progress }) => {
      'worklet';

      translateY.value = withSpring(
        -(y + (font?.getMetrics().bounds?.height || 0) / 2) +
          progress.value * (y + (font?.getMetrics().bounds?.height || 0))
      );
    },
  });
  useLayoutEffect(() => {
    if (font)
      translateY.value = -(y + (font?.getMetrics().bounds?.height || 0) / 2);
  }, [font]);
  const transform = useDerivedValue(() => {
    return [{ translateY: translateY.value }];
  }, [translateY.value]);
  if (!font) return null;

  return (
    <Text
      x={x - font.getTextWidth('Game Over') / 2}
      y={y + (font.getMetrics().bounds?.height || 0) / 2}
      text="Game Over"
      font={font}
      color={'white'}
      transform={transform}
    />
  );
};
