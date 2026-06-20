import {
  useAddEntity,
  useCanvasDimensions,
} from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs';
import {
  createRenderComponent,
  ShapeTypes,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { createStartOverlayTagComponent } from '@/Game/ecs-components/StartOverlayTag';
import { SWIMMER_UI_IMAGE, TITLE_LOGO_IMAGE_SHADOW } from '@/assets/swimmerUi';
import type { SafeAreaInsets } from '@/Game/ui/refLayout';
import { FC, useMemo } from 'react';
import {
  layoutStartOverlay,
  OVERLAY_Z,
  rectCenter,
} from './startOverlayLayout';

export const StartTitleLogo: FC<{ insets: SafeAreaInsets }> = ({ insets }) => {
  const dimensions = useCanvasDimensions();

  const components = useMemo(() => {
    const layout = layoutStartOverlay(
      dimensions.width,
      dimensions.height,
      insets
    );
    const title = layout.title;
    return [
      createStartOverlayTagComponent({
        role: 'titleLogo',
        baseX: title.x,
        baseY: title.y,
        baseWidth: title.width,
        baseHeight: title.height,
      }),
      createRenderComponent({
        shape: {
          type: ShapeTypes.Rectangle,
          width: title.width,
          height: title.height,
        },
        position: rectCenter(title),
        image: SWIMMER_UI_IMAGE.titleFloodRush,
        imageShadow: TITLE_LOGO_IMAGE_SHADOW,
        visible: true,
        zIndex: OVERLAY_Z.title,
      }),
    ];
  }, [dimensions.height, dimensions.width, insets]);

  useAddEntity({ components });

  return null;
};
