import {
  useAddEntity,
  useCanvasDimensions,
} from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs';
import {
  createRenderComponent,
  ShapeTypes,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { createTextComponent } from '@/containers/ReactNativeSkiaGameEngine/internal/components/text';
import { createTapComponent } from '@/containers/ReactNativeSkiaGameEngine/internal/components/touch';
import { createStartOverlayTagComponent } from '@/Game/ecs-components/StartOverlayTag';
import {
  GameSessionComponentData,
  GameSessionComponentName,
} from '@/Game/ecs-components/GameSession';
import { beginGameplay } from '@/Game/session/beginGameplay';
import { getGameSessionEntity } from '@/Game/session/gameSessionQuery';
import { COLOR_CAVE_DEEP, COLOR_TEXT_WHITE } from '@/Game/ui/swimmerTheme';
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

export const PrimaryCTAButton: FC<{ insets: SafeAreaInsets }> = ({
  insets,
}) => {
  const dimensions = useCanvasDimensions();

  const buttonComponents = useMemo(() => {
    const layout = layoutStartOverlay(
      dimensions.width,
      dimensions.height,
      insets
    );
    const btn = layout.cta;
    return [
      createStartOverlayTagComponent({
        role: 'cta',
        baseX: btn.x,
        baseY: btn.y,
        baseWidth: btn.width,
        baseHeight: btn.height,
      }),
      createRenderComponent({
        shape: {
          type: ShapeTypes.Rectangle,
          width: btn.width,
          height: btn.height,
        },
        position: rectCenter(btn),
        image: SWIMMER_UI_IMAGE.uiBtnStartGreen,
        visible: true,
        zIndex: OVERLAY_Z.cta,
      }),
      createTapComponent({
        priority: OVERLAY_Z.cta,
        capture: true,
        shape: {
          type: ShapeTypes.Rectangle,
          width: btn.width,
          height: btn.height,
        },
        onTap: ({ systemArgs }) => {
          'worklet';
          const { ecs } = systemArgs;
          const sessionEntity = getGameSessionEntity(ecs.components);
          if (typeof sessionEntity !== 'number') return;
          const session = ecs.components[GameSessionComponentName]?.get(
            sessionEntity
          ) as GameSessionComponentData | undefined;
          if (!session || session.phase !== 'start_ready') return;
          ecs.updateComponent<GameSessionComponentData>(
            sessionEntity,
            GameSessionComponentName,
            (s) => {
              s.ctaPressStartMs = Date.now();
            }
          );
          beginGameplay(ecs, sessionEntity);
        },
      }),
    ];
  }, [dimensions.height, dimensions.width, insets]);

  const labelComponents = useMemo(() => {
    const layout = layoutStartOverlay(
      dimensions.width,
      dimensions.height,
      insets
    );
    const btn = layout.cta;
    const label = layout.ctaLabel;
    const fontSize = refSize(38, dimensions.width, dimensions.height);
    return [
      createStartOverlayTagComponent({
        role: 'ctaLabel',
        baseX: label.x,
        baseY: label.y,
        baseWidth: label.width,
        baseHeight: label.height,
      }),
      createTextComponent({
        text: 'TAP TO START',
        fontAssetId: 'Fredoka',
        fontSize,
        color: Skia.Color(COLOR_TEXT_WHITE),
        strokeColor: COLOR_CAVE_DEEP,
        strokeWidth: 3,
        align: TextAlign.Center,
        maxWidth: label.width,
        zIndex: OVERLAY_Z.cta + 1,
      }),
      createRenderComponent({
        shape: {
          type: ShapeTypes.Rectangle,
          width: label.width,
          height: label.height,
        },
        position: textPosition(label),
        visible: false,
        zIndex: OVERLAY_Z.cta + 1,
      }),
    ];
  }, [dimensions.height, dimensions.width, insets]);

  useAddEntity({ components: buttonComponents });
  useAddEntity({ components: labelComponents });

  return null;
};
