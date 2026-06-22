import {
  useAddEntity,
  useCanvasDimensions,
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
import type { SafeAreaInsets } from '@/Game/ui/refLayout';
import { FC, useMemo } from 'react';
import {
  GAME_OVER_OVERLAY_Z,
  layoutGameOverOverlay,
  rectCenter,
} from './gameOverOverlayLayout';

export const GameOverDimLayer: FC<{ insets: SafeAreaInsets }> = ({ insets }) => {
  const dimensions = useCanvasDimensions();

  const components = useMemo(() => {
    const layout = layoutGameOverOverlay(
      dimensions.width,
      dimensions.height,
      insets
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
  }, [dimensions.height, dimensions.width, insets]);

  useAddEntity({ components });
  return null;
};
