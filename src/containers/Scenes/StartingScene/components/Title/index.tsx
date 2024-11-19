import {
  createTimingAnimation,
  easeInOutQuad,
  linear,
} from '@/containers/ReactNativeSkiaGameEngine';
import { useAnimationsController } from '@/containers/ReactNativeSkiaGameEngine/hooks/useAnimationsController/useAnimationsController';
import { Group, Image, useImage } from '@shopify/react-native-skia';
import { FC, useDebugValue, useEffect } from 'react';
import { useDerivedValue, useSharedValue } from 'react-native-reanimated';

interface ITitleProps {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const Title: FC<ITitleProps> = ({ x, y, width, height }) => {
  const image = useImage(require('../../../../../../assets/game-title.png'));
  const scale = useSharedValue(1);
  const translateX = useDerivedValue(() => {
    return -width * (scale.value - 1) * 2;
  }, [scale.value]);
  const translateY = useDerivedValue(() => {
    return -height * (scale.value - 1) * 2;
  }, [scale.value]);
  const { registerAnimation, removeAnimation } = useAnimationsController();

  const transform = useDerivedValue(() => {
    return [
      { scale: scale.value },
      { translateX: translateX.value },
      { translateY: translateY.value },
    ];
  }, [scale.value, translateX.value, translateY.value]);

  useEffect(() => {
    const animation = registerAnimation(
      scale,
      createTimingAnimation(1, 1.05, 5000, easeInOutQuad),
      { loop: -1, yoyo: true, throttle: 0 }
    );
    return () => {
      removeAnimation(animation);
    };
  }, []);
  if (!image) return;

  return (
    <Group transform={transform}>
      <Image image={image} x={x} y={y} width={width} height={height} />
    </Group>
  );
};
