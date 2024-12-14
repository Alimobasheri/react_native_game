import { useCanvasDimensions } from '@/containers/ReactNativeSkiaGameEngine';
import { useSceneTransitioning } from '@/containers/ReactNativeSkiaGameEngine/hooks/useSceneTransitioning';
import { Rect } from '@shopify/react-native-skia';
import { FC } from 'react';
import { useSharedValue } from 'react-native-reanimated';

export const GameOverBackground: FC<{}> = () => {
  const { width: windowWidth, height: windowHeight } = useCanvasDimensions();
  const opacity = useSharedValue(0);
  useSceneTransitioning({
    callback: ({ progress }) => {
      'worklet';
      opacity.value = progress.value;
    },
  });

  return (
    <Rect
      x={0}
      y={0}
      color={'#0B3D91'}
      width={windowWidth || 0}
      height={windowHeight || 0}
      opacity={opacity}
    />
  );
};
