import {
  LoadSceneRequestType,
  UnLoadSceneRequestType,
} from '@/containers/ReactNativeSkiaGameEngine/components-rntge/Scene/events';
import {
  useCanvasDimensions,
  useAddEntity,
} from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs';
import {
  createRenderComponent,
  ShapeTypes,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { createTextComponent } from '@/containers/ReactNativeSkiaGameEngine/internal/components/text';
import { createTapComponent } from '@/containers/ReactNativeSkiaGameEngine/internal/components/touch';
import { Skia, TextAlign } from '@shopify/react-native-skia';
import { FC, useMemo } from 'react';

export const RestartGameButton: FC<{}> = () => {
  const dimensions = useCanvasDimensions();

  const components = useMemo(() => {
    return [
      createTextComponent({
        text: 'Restart Game',
        fontAssetId: 'Montserrat',
        fontSize: 24,
        color: Skia.Color('white'),
        align: TextAlign.Left,
        maxWidth: 200,
      }),
      createTapComponent({
        shape: {
          type: ShapeTypes.Rectangle,
          width: 200,
          height: 100,
        },
        onTap: ({ systemArgs }) => {
          'worklet';
          const { eventQueue } = systemArgs;
          eventQueue.addEvent({
            type: UnLoadSceneRequestType,
            payload: { sceneKey: 'gameOver' },
          });
          eventQueue.addEvent({
            type: LoadSceneRequestType,
            payload: { sceneKey: 'game' },
          });
        },
      }),
      createRenderComponent({
        shape: { type: ShapeTypes.Rectangle, width: 200, height: 100 },
        position: {
          x: dimensions.width / 2 - 100,
          y: dimensions.height - 50,
        },
        visible: true,
      }),
    ];
  }, []);

  useAddEntity({ components });

  return null;
};
