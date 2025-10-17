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
      }),
      createRenderComponent({
        shape: { type: 'rectangle', width: 200, height: 50 },
        position: { x: dimensions.width / 2, y: dimensions.height - 100 },
        visible: true,
      }),
    ];
  }, []);

  const { entityId } = useAddEntity({ components });

  return null;
};
