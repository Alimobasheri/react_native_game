import {
  useAddEntity,
  useCanvasDimensions,
  useRNTGESafeAreaInsets,
} from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs';
import {
  createRenderComponent,
  ShapeTypes,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { createSpriteSheetAnimatedComponent } from '@/containers/ReactNativeSkiaGameEngine/internal/components/sprite';
import { createTextComponent } from '@/containers/ReactNativeSkiaGameEngine/internal/components/text';
import { createStartOverlayTagComponent } from '@/Game/ecs-components/StartOverlayTag';
import { COLOR_CAVE_DEEP, COLOR_TEXT_WHITE } from '@/Game/ui/swimmerTheme';
import {
  SWIMMER_UI_IMAGE,
  TAP_CURSOR_SPRITE,
} from '@/assets/swimmerUi';
import { refSize } from '@/Game/ui/refLayout';
import { Skia, TextAlign } from '@shopify/react-native-skia';
import { FC, useMemo } from 'react';
import {
  layoutStartOverlay,
  OVERLAY_Z,
  rectCenter,
  textPosition,
} from './startOverlayLayout';

export const TapTutorialHint: FC = () => {
  const dimensions = useCanvasDimensions();
  const safeAreaInsets = useRNTGESafeAreaInsets();

  const labelComponents = useMemo(() => {
    const layout = layoutStartOverlay(
      dimensions.width,
      dimensions.height,
      safeAreaInsets
    );
    const label = layout.tutorialText;
    return [
      createStartOverlayTagComponent({
        role: 'tutorialLabel',
        baseX: label.x,
        baseY: label.y,
        baseWidth: label.width,
        baseHeight: label.height,
      }),
      createTextComponent({
        text: 'TAP LEFT OR RIGHT',
        fontAssetId: 'Fredoka',
        fontSize: refSize(36, dimensions.width, dimensions.height),
        color: Skia.Color(COLOR_TEXT_WHITE),
        strokeColor: COLOR_CAVE_DEEP,
        strokeWidth: 3,
        align: TextAlign.Center,
        maxWidth: label.width,
        zIndex: OVERLAY_Z.tutorial,
      }),
      createRenderComponent({
        shape: {
          type: ShapeTypes.Rectangle,
          width: label.width,
          height: label.height,
        },
        position: textPosition(label),
        visible: false,
        zIndex: OVERLAY_Z.tutorial,
      }),
    ];
  }, [dimensions.height, dimensions.width, safeAreaInsets]);

  const cursorComponents = useMemo(() => {
    const layout = layoutStartOverlay(
      dimensions.width,
      dimensions.height,
      safeAreaInsets
    );
    const cursor = layout.tapCursor;
    return [
      createStartOverlayTagComponent({
        role: 'tapCursor',
        baseX: cursor.x,
        baseY: cursor.y,
        baseWidth: cursor.width,
        baseHeight: cursor.height,
      }),
      createSpriteSheetAnimatedComponent(SWIMMER_UI_IMAGE.tapCursorSprite, {
        frameWidth: TAP_CURSOR_SPRITE.frameWidth,
        frameHeight: TAP_CURSOR_SPRITE.frameHeight,
        framesPerRow: TAP_CURSOR_SPRITE.framesPerRow,
        totalFrames: TAP_CURSOR_SPRITE.totalFrames,
        frameDuration: TAP_CURSOR_SPRITE.frameDurationMs,
        loop: false,
        isPlaying: false,
      }),
      createRenderComponent({
        shape: {
          type: ShapeTypes.Rectangle,
          width: cursor.width,
          height: cursor.height,
        },
        position: rectCenter(cursor),
        image: SWIMMER_UI_IMAGE.tapCursorSprite,
        visible: true,
        zIndex: OVERLAY_Z.tutorial + 1,
      }),
    ];
  }, [dimensions.height, dimensions.width, safeAreaInsets]);

  useAddEntity({ components: labelComponents });
  useAddEntity({ components: cursorComponents });

  return null;
};
