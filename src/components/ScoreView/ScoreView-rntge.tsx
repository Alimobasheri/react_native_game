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
import { createScoreComponent } from '@/Game/ecs-components/Score';
import { ScoreSystem } from '@/systems/PhysicsSystem/ScoreSystem';
import { Skia, TextAlign } from '@shopify/react-native-skia';
import { FC, useMemo } from 'react';

const SCORE_BOX_WIDTH = 200;
const SCORE_BOX_HEIGHT = 56;
const SCORE_TOP_OFFSET = 56;
const SCORE_FONT_SIZE = 42;
const SCORE_Z_INDEX = 100;

export const ScoreView: FC<{}> = () => {
  const dimensions = useCanvasDimensions();

  const components = useMemo(() => {
    const width = dimensions?.width ?? 400;
    const centerX = width / 2;
    return [
      createScoreComponent({
        score: 0,
        accumulatedTime: 0,
      }),
      createTextComponent({
        text: '0',
        fontAssetId: 'Montserrat',
        fontSize: SCORE_FONT_SIZE,
        color: Skia.Color('white'),
        align: TextAlign.Center,
        maxWidth: SCORE_BOX_WIDTH,
        zIndex: SCORE_Z_INDEX,
      }),
      createRenderComponent({
        shape: {
          type: ShapeTypes.Rectangle,
          width: SCORE_BOX_WIDTH,
          height: SCORE_BOX_HEIGHT,
        },
        position: {
          x: centerX - SCORE_BOX_WIDTH / 2,
          y: SCORE_TOP_OFFSET,
        },
        visible: true,
        zIndex: SCORE_Z_INDEX,
      }),
    ];
  }, [dimensions?.width]);

  useAddEntity({ components });
  useAddSystem({ system: ScoreSystem });

  return null;
};
