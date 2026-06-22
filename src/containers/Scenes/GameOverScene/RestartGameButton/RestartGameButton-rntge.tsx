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
import { resetGameSessionToStartReady } from '@/Game/session/beginGameplay';
import { getGameSessionEntity } from '@/Game/session/gameSessionQuery';
import { Skia, TextAlign } from '@shopify/react-native-skia';
import { FC, useMemo } from 'react';

export const RestartGameButton: FC<{}> = () => {
  const dimensions = useCanvasDimensions();

  const components = useMemo(() => {
    return [
      createTextComponent({
        text: 'Restart Game',
        fontAssetId: 'Fredoka',
        fontSize: 30,
        color: Skia.Color('white'),
        align: TextAlign.Left,
        maxWidth: 240,
      }),
      createTapComponent({
        shape: {
          type: ShapeTypes.Rectangle,
          width: 240,
          height: 120,
        },
        onTap: ({ systemArgs }) => {
          'worklet';
          const { eventQueue, ecs } = systemArgs;
          const sessionEntity = getGameSessionEntity(ecs.components);
          if (typeof sessionEntity === 'number') {
            resetGameSessionToStartReady(ecs, sessionEntity);
          }
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
        shape: { type: ShapeTypes.Rectangle, width: 240, height: 120 },
        position: {
          x: dimensions.width / 2 - 120,
          y: dimensions.height - 60,
        },
        visible: true,
      }),
    ];
  }, [dimensions.height, dimensions.width]);

  useAddEntity({ components });

  return null;
};
