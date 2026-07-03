import {
  useAddEntity,
  useCanvasDimensions,
  useRNTGESafeAreaInsets,
} from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs';
import {
  createRenderComponent,
  ShapeTypes,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { createGameOverOverlayTagComponent } from '@/Game/ecs-components/GameOverOverlayTag';
import {
  GAME_OVER_DIM_OPACITY,
  GAME_OVER_PANEL_COLORS,
} from '@/Game/ui/gameOverPanelVisuals';
import { FC, useMemo } from 'react';
import {
  GAME_OVER_OVERLAY_Z,
  layoutGameOverOverlay,
  rectCenter,
} from './gameOverOverlayLayout';

export const GameOverDimLayer: FC = () => {
  const dimensions = useCanvasDimensions();
  const safeAreaInsets = useRNTGESafeAreaInsets();

  const components = useMemo(() => {
    const layout = layoutGameOverOverlay(
      dimensions.width,
      dimensions.height,
      safeAreaInsets
    );
    const dim = layout.dim;
    return [
      createGameOverOverlayTagComponent({
        role: 'dim',
        baseX: dim.x,
        baseY: dim.y,
        baseWidth: dim.width,
        baseHeight: dim.height,
      }),
      createRenderComponent({
        shape: {
          type: ShapeTypes.Rectangle,
          width: dim.width,
          height: dim.height,
        },
        position: rectCenter(dim),
        fillColor: GAME_OVER_PANEL_COLORS.dim,
        opacity: GAME_OVER_DIM_OPACITY,
        visible: false,
        zIndex: GAME_OVER_OVERLAY_Z.dim,
      }),
    ];
  }, [dimensions.height, dimensions.width, safeAreaInsets]);

  useAddEntity({ components });
  return null;
};
