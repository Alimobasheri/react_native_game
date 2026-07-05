import type { RenderLayerData } from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import type { GridSpanWorldRect } from '@/Game/grid/types';
import { buildMovingHazardRenderLayers } from '@/Game/render/buildMovingHazardRenderLayers';

export const isOrangeObstacleRenderLayer = (layer: RenderLayerData): boolean => {
  'worklet';
  return layer.image != null && layer.image.length > 0;
};

/** Orange layers always sit at local y=0 on the lead row — never accumulate offsets. */
export const orangeLayersFromRowRender = (
  existingLayers: readonly RenderLayerData[]
): RenderLayerData[] => {
  'worklet';
  const orangeLayers: RenderLayerData[] = [];
  for (let i = 0; i < existingLayers.length; i++) {
    const layer = existingLayers[i];
    if (isOrangeObstacleRenderLayer(layer)) {
      orangeLayers.push({
        ...layer,
        position: {
          x: layer.position.x,
          y: 0,
        },
      });
    }
  }
  return orangeLayers;
};

export const appendHazardSteelToRowRender = (args: {
  existingLayers: readonly RenderLayerData[];
  worldRect: GridSpanWorldRect;
  leadRowY: number;
}): { renderLayers: RenderLayerData[]; positionY: number } => {
  'worklet';
  const { existingLayers, worldRect, leadRowY } = args;
  const orangeLayers = orangeLayersFromRowRender(existingLayers);
  const localSteelY = worldRect.centerY - leadRowY;

  const steelLayers = buildMovingHazardRenderLayers({ worldRect });
  const mergedSteel: RenderLayerData[] = [];
  for (let i = 0; i < steelLayers.length; i++) {
    const layer = steelLayers[i];
    mergedSteel.push({
      ...layer,
      position: {
        x: layer.position.x,
        y: layer.position.y + localSteelY,
      },
    });
  }

  return {
    renderLayers: orangeLayers.concat(mergedSteel),
    positionY: leadRowY,
  };
};

export const restoreOrangeOnlyHazardRowRender = (args: {
  existingLayers: readonly RenderLayerData[];
  rowY: number;
}): { renderLayers: RenderLayerData[]; positionY: number } => {
  'worklet';
  return {
    renderLayers: orangeLayersFromRowRender(args.existingLayers),
    positionY: args.rowY,
  };
};

/** Visual steel span matches integer blockCols (collision uses full columns). */
export const slabSpanFromBlockCols = (
  blockCols: readonly number[],
  columns: number,
  fallbackSlabStart: number,
  fallbackSlabEnd: number
): { slabStart: number; slabEnd: number } => {
  'worklet';
  if (blockCols.length === 0) {
    return { slabStart: fallbackSlabStart, slabEnd: fallbackSlabEnd };
  }
  let minCol = columns;
  let maxCol = -1;
  for (let i = 0; i < blockCols.length; i++) {
    const col = blockCols[i];
    if (col < minCol) {
      minCol = col;
    }
    if (col > maxCol) {
      maxCol = col;
    }
  }
  return { slabStart: minCol, slabEnd: maxCol + 1 };
};
