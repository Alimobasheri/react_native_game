import {
  RenderLayerData,
  gapSetFromColumns,
  isSolidColumn,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import {
  SWIMMER_BLOCK_CELL_BACKING_COLOR,
  SWIMMER_BLOCK_CELL_BACKING_CORNER_RADIUS_RATIO,
} from '@/assets/swimmerBlocks';
import {
  buildObstacleBlockCellLayers,
  computeGridExteriorBorderRadius,
  deriveBlockCellNeighborMask,
} from '@/Game/render/obstacleBlockCellLighting';

export type ObstacleRowRenderLayerArgs = {
  gaps: readonly number[];
  rowLength: number;
  leftX: number;
  blockWidth: number;
  blockHeight: number;
  rowCenterX: number;
  rowY: number;
  pickImage: (worldX: number, worldY: number) => string;
  /** Gap columns of the row below (higher Y). */
  rowBelowGaps?: readonly number[] | null;
  /** Gap columns of the row above (lower Y). */
  rowAboveGaps?: readonly number[] | null;
  /** Backing fill; defaults to swimmer clay underside. */
  cellBackingColor?: string;
  /** Exterior corner radius as fraction of min(block width, height). */
  backingCornerRadiusRatio?: number;
};

export function buildObstacleRowRenderLayers(
  args: ObstacleRowRenderLayerArgs
): RenderLayerData[] {
  'worklet';
  const gapSet = gapSetFromColumns(args.gaps);
  const belowGapSet = args.rowBelowGaps
    ? gapSetFromColumns(args.rowBelowGaps)
    : null;
  const aboveGapSet = args.rowAboveGaps
    ? gapSetFromColumns(args.rowAboveGaps)
    : null;

  const visualWidth = args.blockWidth;
  const visualHeight = args.blockHeight;
  const cellBackingColor =
    args.cellBackingColor ?? SWIMMER_BLOCK_CELL_BACKING_COLOR;
  const cornerRadiusRatio =
    args.backingCornerRadiusRatio ?? SWIMMER_BLOCK_CELL_BACKING_CORNER_RADIUS_RATIO;
  const exteriorRadius =
    Math.min(visualWidth, visualHeight) * cornerRadiusRatio;
  const layers: RenderLayerData[] = [];

  const isSolidInRow = (col: number) =>
    isSolidColumn(gapSet, col, args.rowLength);
  const isSolidInRowBelow = belowGapSet
    ? (col: number) => isSolidColumn(belowGapSet, col, args.rowLength)
    : undefined;
  const isSolidInRowAbove = aboveGapSet
    ? (col: number) => isSolidColumn(aboveGapSet, col, args.rowLength)
    : undefined;

  for (let col = 0; col < args.rowLength; col++) {
    if (gapSet.has(col)) continue;

    const blockWorldX =
      args.leftX + (col + 1) * args.blockWidth - args.blockWidth / 2;
    const localX = blockWorldX - args.rowCenterX;

    const borderRadius = computeGridExteriorBorderRadius({
      col,
      columnCount: args.rowLength,
      exteriorRadius,
      isSolidInRow,
      isSolidInRowBelow,
      isSolidInRowAbove,
    });

    const neighbors = deriveBlockCellNeighborMask({
      col,
      rowLength: args.rowLength,
      isSolidInRow,
      isSolidInRowBelow,
      isSolidInRowAbove,
    });

    const cellLayers = buildObstacleBlockCellLayers({
      localX,
      blockWidth: visualWidth,
      blockHeight: visualHeight,
      imageKey: args.pickImage(blockWorldX, args.rowY),
      neighbors,
      borderRadius,
      cellBackingColor,
    });

    for (let i = 0; i < cellLayers.length; i++) {
      layers.push(cellLayers[i]);
    }
  }

  return layers;
}
