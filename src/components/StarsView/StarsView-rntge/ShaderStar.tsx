// In a new component file, e.g. ShaderStar.tsx
import {
  makeMutable,
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';
import { createRenderComponent } from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { FC, useMemo } from 'react';
import {
  useAddEntity,
  useCanvasDimensions,
} from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs';

export const ShaderStar: FC<{ x: number; y: number }> = ({ x, y }) => {
  const time = useSharedValue(0);
  const dimensions = useCanvasDimensions();

  // This will run every frame, keeping `time` updated.
  useFrameCallback(() => {
    time.value = performance.now() / 1000; // time in seconds
  });

  // Example of deriving a uniform from canvas dimensions.
  const resolution = useDerivedValue(() => {
    return [dimensions.width, dimensions.height];
  }, [dimensions]);

  // Create the render component with the shader info
  const components = useMemo(
    () => [
      createRenderComponent({
        shape: { type: 'circle', radius: 50 },
        position: { x, y },
        shader: {
          key: 'water',
          uniforms: {
            iTime: time, // Pass the shared value
            iResolution: resolution,
            iCenter: makeMutable([x, y]), // Can be static
          },
        },
      }),
    ],
    [x, y, time, resolution]
  );

  useAddEntity({ components });

  return null;
};
