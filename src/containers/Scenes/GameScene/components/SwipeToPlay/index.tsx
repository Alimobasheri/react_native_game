import {
  createTimingAnimation,
  easeInQuad,
} from '@/containers/ReactNativeSkiaGameEngine';
import { useAnimationsController } from '@/containers/ReactNativeSkiaGameEngine/hooks/useAnimationsController/useAnimationsController';
import { useFrameEffect } from '@/containers/ReactNativeSkiaGameEngine/hooks/useFrameEffect';
import {
  AnimatedProp,
  SkFont,
  Skia,
  SkPath,
  TextPath,
} from '@shopify/react-native-skia';
import { FC, useCallback, useEffect } from 'react';
import { runOnUI, SharedValue, useSharedValue } from 'react-native-reanimated';

interface ISwipeToPlayProps {
  text: string;
  font: AnimatedProp<SkFont | null, any>;
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

  const { registerAnimation, removeAnimation } = useAnimationsController();

  useEffect(() => {
    const animation = registerAnimation(
      wavePhase,
      createTimingAnimation(0.1, 2 * Math.PI, 2000, easeInQuad),
      { loop: -1, yoyo: true, throttle: 0 }
    );
    return () => {
      removeAnimation(animation);
    };
  }, []);

  const initalPath = Skia.Path.Make();
  initalPath.moveTo(x, y);
  initalPath.lineTo(0, 0);

  const path = useSharedValue(initalPath);

  const updatePath = useCallback(
    (
      width: number,
      height: number,
      path: SharedValue<SkPath>,
      wavePhase: SharedValue<number>,
      amplitude: number,
      frequency: number
    ) => {
      'worklet';
      const newPath = Skia.Path.Make();

      const maxY = y + amplitude;
      const minY = y - amplitude;

      newPath.moveTo(width / 2, y);
      for (let x = width / 2; x <= width; x += 10) {
        const targetY =
          y + amplitude * Math.sin(frequency * x + wavePhase.value);
        newPath.lineTo(x, Math.min(Math.max(targetY, minY), maxY));
      }
      path.value = newPath;
    },
    []
  );

  useFrameEffect(
    () => {
      runOnUI(updatePath)(width, height, path, wavePhase, amplitude, frequency);
    },
    [wavePhase.value, width, height, path.value],
    60
  );
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
