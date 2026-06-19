import {
  RenderLayerData,
  ShapeTypes,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';

/** Matches visual inflation in legacy per-block spawn (ObstacleSystem). */
const BLOCK_VISUAL_SCALE = 1.05;

export function buildObstacleRowRenderLayers(args: {
  gaps: readonly number[];
  rowLength: number;
  leftX: number;
  blockWidth: number;
  blockHeight: number;
  rowCenterX: number;
  rowY: number;
  pickImage: (worldX: number, worldY: number) => string;
}): RenderLayerData[] {
  'worklet';
  const gapSet = new Set<number>();
  for (let g = 0; g < args.gaps.length; g++) {
    gapSet.add(args.gaps[g]);
  }

  const visualWidth = args.blockWidth * BLOCK_VISUAL_SCALE;
  const visualHeight = args.blockHeight * BLOCK_VISUAL_SCALE;
  const layers: RenderLayerData[] = [];

  for (let col = 0; col < args.rowLength; col++) {
    if (gapSet.has(col)) continue;

    const blockWorldX =
      args.leftX + (col + 1) * args.blockWidth - args.blockWidth / 2;
    const localX = blockWorldX - args.rowCenterX;

    layers.push({
      position: { x: localX, y: 0 },
      shape: {
        type: ShapeTypes.Rectangle,
        width: visualWidth,
        height: visualHeight,
      },
      image: args.pickImage(blockWorldX, args.rowY),
      visible: true,
    });
  }

  return layers;
}
