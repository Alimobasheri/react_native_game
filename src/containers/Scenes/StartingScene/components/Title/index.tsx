import {
  createTimingAnimation,
  easeInOutQuad,
  linear,
} from '@/containers/ReactNativeSkiaGameEngine';
import { useCreateAnimation } from '@/containers/ReactNativeSkiaGameEngine/hooks/useCreateAnimation/useCreateAnimation';
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
  const image = useImage(
    require('../../../../../../assets/game-title.png')?.uri
  );
  const scale = useSharedValue(1);
  const translateX = useDerivedValue(() => {
    return -width * (scale.value - 1) * 2;
  }, [scale]);
  const translateY = useDerivedValue(() => {
    return -height * (scale.value - 1) * 2;
  }, [scale]);

  const { registerAnimation, remove: removeAnimation } = useCreateAnimation({
    sharedValue: scale,
    animation: createTimingAnimation(1, 1.05, 5000, easeInOutQuad, 'title'),
    config: {
      loop: -1,
      yoyo: true,
      throttle: 0,
    },
  });

  const transform = useDerivedValue(() => {
    return [
      { translateX: width / 2 },
      { translateY: height / 2 },
      { scale: scale.value },
      { translateX: -width / 2 },
      { translateY: -height / 2 },
      { translateX: translateX.value },
      { translateY: translateY.value },
    ];
  }, [scale, translateX, translateY]);

  useEffect(() => {
    registerAnimation({ isRunning: true });
    return () => {
      removeAnimation();
    };
  }, []);
  if (!image) return;

  return (
    <Group transform={transform}>
      <Image image={image} x={x} y={y} width={width} height={height} />
    </Group>
  );
};
