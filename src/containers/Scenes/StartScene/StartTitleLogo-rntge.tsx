import {
  useAddEntity,
  useCanvasDimensions,
  useRNTGESafeAreaInsets,
} from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs';
import {
  createRenderComponent,
  ShapeTypes,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { createStartOverlayTagComponent } from '@/Game/ecs-components/StartOverlayTag';
import { SWIMMER_UI_IMAGE, TITLE_LOGO_IMAGE_SHADOW } from '@/assets/swimmerUi';
import { FC, useMemo } from 'react';
import {
  layoutStartOverlay,
  OVERLAY_Z,
  rectCenter,
} from './startOverlayLayout';

export const StartTitleLogo: FC = () => {
  const dimensions = useCanvasDimensions();
  const safeAreaInsets = useRNTGESafeAreaInsets();

  const components = useMemo(() => {
    const layout = layoutStartOverlay(
      dimensions.width,
      dimensions.height,
      safeAreaInsets
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
  }, [dimensions.height, dimensions.width, safeAreaInsets]);

  useAddEntity({ components });

  return null;
};
