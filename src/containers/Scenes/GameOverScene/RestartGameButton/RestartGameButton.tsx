import { TransitionPhase } from '@/containers/ReactNativeSkiaGameEngine/components/Scene/types/transitions';
import { useSceneTransitioning } from '@/containers/ReactNativeSkiaGameEngine/hooks/useSceneTransitioning';
import { Group, Rect, Text, useFont } from '@shopify/react-native-skia';
import { FC, useEffect, useLayoutEffect } from 'react';
import {
  useDerivedValue,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

interface IRestartGameButtonProps {
  x: number;
  y: number;
}

export const RestartGameButton: FC<IRestartGameButtonProps> = ({ x, y }) => {
  const font = useFont(
    require('../../../../../assets/fonts/Montserrat-SemiBold.ttf'),
    24
  );
  const translateY = useSharedValue(0);
  useSceneTransitioning({
    callback: ({ progress }) => {
      'worklet';
      translateY.value = withSpring(
        y -
          (font?.getMetrics().bounds?.height || 0) / 2 -
          progress.value * (y + (font?.getMetrics().bounds?.height || 0) / 2)
      );
    },
  });
  useLayoutEffect(() => {
    if (font)
      translateY.value = y - (font?.getMetrics().bounds?.height || 0) / 2;
  }, [font]);
  const transform = useDerivedValue(() => {
    return [{ translateY: translateY.value }];
  }, [translateY.value]);
  if (!font) return null;

  return (
    <Group transform={transform}>
      <Rect
        x={x - font.getTextWidth('Restart') / 2 - 10}
        y={y - (font.getMetrics().bounds?.height || 0) / 2 - 22}
        height={font.getMetrics().bounds?.height || 0}
        width={font.getTextWidth('Restart') + 20}
        color={'rgba(255, 255, 255, 0.2)'}
      ></Rect>
      <Text
        x={x - font.getTextWidth('Restart') / 2}
        y={y - (font.getMetrics().bounds?.height || 0) / 2}
        text="Restart"
        font={font}
        color={'white'}
      />
    </Group>
  );
};
