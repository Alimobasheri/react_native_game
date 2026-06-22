import {
  useAddEntity,
  useCanvasDimensions,
} from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs';
import {
  createRenderComponent,
  ShapeTypes,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { createTextComponent } from '@/containers/ReactNativeSkiaGameEngine/internal/components/text';
import { createStartOverlayTagComponent } from '@/Game/ecs-components/StartOverlayTag';
import {
  COLOR_REWARD_YELLOW,
  COLOR_TEXT_WHITE,
} from '@/Game/ui/swimmerTheme';
import { SWIMMER_UI_IMAGE } from '@/assets/swimmerUi';
import { refSize, type SafeAreaInsets } from '@/Game/ui/refLayout';
import { Skia, TextAlign } from '@shopify/react-native-skia';
import { FC, useMemo } from 'react';
import {
  layoutStartOverlay,
  OVERLAY_Z,
  rectCenter,
  textPosition,
} from './startOverlayLayout';

export const BestScoreChip: FC<{ insets: SafeAreaInsets }> = ({ insets }) => {
  const dimensions = useCanvasDimensions();

  const panelComponents = useMemo(() => {
    const layout = layoutStartOverlay(
      dimensions.width,
      dimensions.height,
      insets
    );
    const chip = layout.best;
    return [
      createStartOverlayTagComponent({
        role: 'bestScorePanel',
        baseX: chip.x,
        baseY: chip.y,
        baseWidth: chip.width,
        baseHeight: chip.height,
      }),
      createRenderComponent({
        shape: {
          type: ShapeTypes.Rectangle,
          width: chip.width,
          height: chip.height,
        },
        position: rectCenter(chip),
        image: SWIMMER_UI_IMAGE.uiChipPanel,
        visible: true,
        zIndex: OVERLAY_Z.chip,
      }),
    ];
  }, [dimensions.height, dimensions.width, insets]);

  const crownComponents = useMemo(() => {
    const layout = layoutStartOverlay(
      dimensions.width,
      dimensions.height,
      insets
    );
    const crown = layout.crown;
    return [
      createStartOverlayTagComponent({
        role: 'bestScoreCrown',
        baseX: crown.x,
        baseY: crown.y,
        baseWidth: crown.width,
        baseHeight: crown.height,
      }),
      createRenderComponent({
        shape: {
          type: ShapeTypes.Rectangle,
          width: crown.width,
          height: crown.height,
        },
        position: rectCenter(crown),
        image: SWIMMER_UI_IMAGE.iconCrownGold,
        visible: true,
        zIndex: OVERLAY_Z.chip + 1,
      }),
    ];
  }, [dimensions.height, dimensions.width, insets]);

  const labelComponents = useMemo(() => {
    const layout = layoutStartOverlay(
      dimensions.width,
      dimensions.height,
      insets
    );
    const label = layout.bestLabel;
    return [
      createStartOverlayTagComponent({
        role: 'bestScoreLabel',
        baseX: label.x,
        baseY: label.y,
        baseWidth: label.width,
        baseHeight: label.height,
      }),
      createTextComponent({
        text: 'BEST',
        fontAssetId: 'Fredoka',
        fontSize: refSize(26, dimensions.width, dimensions.height),
        color: Skia.Color(COLOR_REWARD_YELLOW),
        align: TextAlign.Center,
        maxWidth: label.width,
        zIndex: OVERLAY_Z.chip + 2,
      }),
      createRenderComponent({
        shape: {
          type: ShapeTypes.Rectangle,
          width: label.width,
          height: label.height,
        },
        position: textPosition(label),
        visible: false,
        zIndex: OVERLAY_Z.chip + 2,
      }),
    ];
  }, [dimensions.height, dimensions.width, insets]);

  const scoreComponents = useMemo(() => {
    const layout = layoutStartOverlay(
      dimensions.width,
      dimensions.height,
      insets
    );
    const score = layout.bestScore;
    return [
      createStartOverlayTagComponent({
        role: 'bestScoreValue',
        baseX: score.x,
        baseY: score.y,
        baseWidth: score.width,
        baseHeight: score.height,
      }),
      createTextComponent({
        text: '0',
        fontAssetId: 'Fredoka',
        fontSize: refSize(48, dimensions.width, dimensions.height),
        color: Skia.Color(COLOR_TEXT_WHITE),
        align: TextAlign.Center,
        maxWidth: score.width,
        zIndex: OVERLAY_Z.chip + 2,
      }),
      createRenderComponent({
        shape: {
          type: ShapeTypes.Rectangle,
          width: score.width,
          height: score.height,
        },
        position: textPosition(score),
        visible: false,
        zIndex: OVERLAY_Z.chip + 2,
      }),
    ];
  }, [dimensions.height, dimensions.width, insets]);

  useAddEntity({ components: panelComponents });
  useAddEntity({ components: crownComponents });
  useAddEntity({ components: labelComponents });
  useAddEntity({ components: scoreComponents });

  return null;
};
