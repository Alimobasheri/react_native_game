import {
  useAddEntity,
  useCanvasDimensions,
} from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs';
import { createRenderComponent } from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { createTextComponent } from '@/containers/ReactNativeSkiaGameEngine/internal/components/text';
import { Skia, TextAlign } from '@shopify/react-native-skia';
import { FC, useMemo } from 'react';

export const SwipeToPlay: FC<{}> = () => {
  const dimensions = useCanvasDimensions();
  const components = useMemo(() => {
    return [
      createTextComponent({
        text: 'Swipe to Play',
        fontAssetId: 'Montserrat',
        fontSize: 24,
        color: Skia.Color('white'),
        align: TextAlign.Center,
        maxWidth: 200,
      }),
      createRenderComponent({
        shape: { type: 'rectangle', width: 200, height: 100 },
        position: { x: dimensions.width / 2 - 100, y: dimensions.height - 50 },
        visible: true,
      }),
    ];
  }, []);

  useAddEntity({ components });

  return null;
};
