import {
  useCanvasDimensions,
  useAddEntity,
  useAddSystem,
} from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs';
import {
  createRenderComponent,
  ShapeTypes,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { createTextComponent } from '@/containers/ReactNativeSkiaGameEngine/internal/components/text';
import { createGameOverScoreComponent } from '@/Game/ecs-components/GameOverScore';
import { GameOverScoreSystem } from '@/systems/PhysicsSystem/GameOverScoreSystem';
import { Skia, TextAlign } from '@shopify/react-native-skia';
import { FC, useMemo } from 'react';

const SCORE_BOX_WIDTH = 240;
const SCORE_BOX_HEIGHT = 56;
/** Placed just below the centered "Game Over" title block. */
const SCORE_BELOW_TITLE_OFFSET = 70;
const SCORE_FONT_SIZE = 42;

export const GameOverScore: FC<{}> = () => {
  const dimensions = useCanvasDimensions();

  const components = useMemo(() => {
    const centerX = dimensions.width / 2;
    const y = dimensions.height / 2 + SCORE_BELOW_TITLE_OFFSET;
    return [
      createGameOverScoreComponent(),
      createTextComponent({
        text: '0',
        fontAssetId: 'Montserrat',
        fontSize: SCORE_FONT_SIZE,
        color: Skia.Color('white'),
        align: TextAlign.Center,
        maxWidth: SCORE_BOX_WIDTH,
      }),
      createRenderComponent({
        shape: {
          type: ShapeTypes.Rectangle,
          width: SCORE_BOX_WIDTH,
          height: SCORE_BOX_HEIGHT,
        },
        position: {
          x: centerX - SCORE_BOX_WIDTH / 2,
          y,
        },
        visible: true,
      }),
    ];
  }, [dimensions.height, dimensions.width]);

  useAddEntity({ components });
  useAddSystem({ system: GameOverScoreSystem });

  return null;
};
