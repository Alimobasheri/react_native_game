import {
  createTimingAnimation,
  easeInQuad,
} from '@/containers/ReactNativeSkiaGameEngine';
import { useCreateAnimation } from '@/containers/ReactNativeSkiaGameEngine/hooks/useCreateAnimation/useCreateAnimation';
import { useFrameEffect } from '@/containers/ReactNativeSkiaGameEngine/hooks/useFrameEffect';
import {
  AnimatedProp,
  SkFont,
  Skia,
  SkPath,
  TextPath,
} from '@shopify/react-native-skia';
import { FC, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import {
  runOnUI,
  SharedValue,
  useAnimatedReaction,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated';

export interface ISwipeToPlayProps {
  text: string;
  font: SkFont;
  x: number;
  y: number;
  width: number;
  height: number;
  amplitude?: number;
  frequency?: number;
  color?: string;
}

export const SwipeToPlay: FC<ISwipeToPlayProps> = ({
  text,
  font,
  x,
  y,
  width,
  height,
  amplitude = 3,
  frequency = 0.05,
  color = 'white',
}) => {
  const wavePhase = useSharedValue(0);

  const { registerAnimation, remove: removeAnimation } = useCreateAnimation({
    sharedValue: wavePhase,
    config: {
      loop: -1,
      throttle: 0,
      label: 'wavePhase',
    },
  });

  const initalPath = Skia.Path.Make();
  initalPath.moveTo(x - font.getTextWidth(text) / 2, y);
  initalPath.lineTo(width, y);

  const path = useDerivedValue(() => {
    const newPath = Skia.Path.Make();

    const maxY = y + amplitude;
    const minY = y - amplitude;

    newPath.moveTo(x - font.getTextWidth(text) / 2, y);
    for (
      let z = x - font.getTextWidth(text) / 2;
      z <= x + font.getTextWidth(text) / 2;
      z += 10
    ) {
      const targetY = y + amplitude * Math.sin(frequency * z + wavePhase.value);
      newPath.lineTo(z, Math.min(Math.max(targetY, minY), maxY));
    }
    return newPath;
  });

  useEffect(() => {
    registerAnimation({
      isRunning: true,
      animation: createTimingAnimation(
        0.1,
        2 * Math.PI,
        2000,
        easeInQuad,
        'wavePhase'
      ),
    });
    return () => {
      removeAnimation();
    };
  }, []);
  return (
    <TextPath
      text={text}
      font={font}
      style={'fill'}
      color={color}
      path={path}
      initialOffset={0}
    />
  );
};
