import {
  useCanvasDimensions,
  useAddEntity,
} from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs';
import {
  createRenderComponent,
  ShapeTypes,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { createTextComponent } from '@/containers/ReactNativeSkiaGameEngine/internal/components/text';
import { Skia, TextAlign } from '@shopify/react-native-skia';
import { FC, useMemo } from 'react';

export const GameOverTitle: FC<{}> = () => {
  const dimensions = useCanvasDimensions();

  const components = useMemo(() => {
    return [
      createTextComponent({
        text: 'Game Over',
        fontAssetId: 'Montserrat',
        fontSize: 66,
        color: Skia.Color('white'),
        align: TextAlign.Center,
        maxWidth: 400,
      }),
      createRenderComponent({
        shape: { type: ShapeTypes.Rectangle, width: 400, height: 100 },
        position: {
          x: dimensions.width / 2 - 200,
          y: dimensions.height / 2 - 50,
        },
        visible: true,
      }),
    ];
  }, []);

  useAddEntity({ components });

  return null;
};
