import {
  RenderLayerData,
  ShapeTypes,
  createRectLayerBacking,
  withRenderLayerBacking,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { platformShaftTuning } from '@/config/platformShaftTuning';
import type { GridSpanWorldRect } from '@/Game/grid/types';

export type MovingHazardRenderLayerArgs = {
  worldRect: GridSpanWorldRect;
};

export function buildMovingHazardRenderLayers(
  args: MovingHazardRenderLayerArgs
): RenderLayerData[] {
  'worklet';
  const { worldRect } = args;
  const visualWidth = worldRect.width;
  const visualHeight = worldRect.height;
  const steelColor = platformShaftTuning.PLATFORM_SLAB_STEEL_COLOR;

  return [
    withRenderLayerBacking(
      {
        position: { x: worldRect.localSlabX, y: 0 },
        shape: {
          type: ShapeTypes.Rectangle,
          width: visualWidth,
          height: visualHeight,
        },
        visible: true,
      },
      createRectLayerBacking(steelColor, visualWidth, visualHeight, {
        borderRadius: Math.min(visualWidth, visualHeight) * 0.08,
      })
    ),
  ];
}
