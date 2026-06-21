import { BlendMode } from '@shopify/react-native-skia';
import {
  RenderLayerData,
  ShapeTypes,
  computeGridExteriorBorderRadius,
  createRectLayerBacking,
  withRenderLayerBacking,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import type { RectangleBorderRadius } from '@/containers/ReactNativeSkiaGameEngine/internal/render/renderShapes';
import {
  BLOCK_AO_OPACITY,
  BLOCK_AO_STRIP_WIDTH_RATIO,
  BLOCK_BOTTOM_SHADE_HEIGHT_RATIO,
  BLOCK_CONTACT_SHADOW_COLOR,
  BLOCK_CONTACT_SHADOW_HEIGHT_RATIO,
  BLOCK_CONTACT_SHADOW_OPACITY,
  BLOCK_CREVICE_OPACITY,
  BLOCK_CREVICE_WIDTH_RATIO,
  BLOCK_EDGE_DARK_COLOR,
  BLOCK_FACE_HEIGHT_RATIO,
  BLOCK_HIGHLIGHT_COLOR,
  BLOCK_HIGHLIGHT_OPACITY,
  BLOCK_HIGHLIGHT_SIZE_RATIO,
  BLOCK_RIGHT_SHADE_WIDTH_RATIO,
  BLOCK_SHADOW_COLOR,
  BLOCK_SHADE_OPACITY,
} from '@/config/swimmerBlockLightingTuning';

export type BlockCellNeighborMask = {
  left: boolean;
  right: boolean;
  top: boolean;
  /** True when no solid block occupies the same column in the row below. */
  bottomExposed: boolean;
};

export type ObstacleBlockCellLayerArgs = {
  localX: number;
  blockWidth: number;
  blockHeight: number;
  imageKey: string;
  neighbors: BlockCellNeighborMask;
  borderRadius: RectangleBorderRadius;
  cellBackingColor: string;
};

function minPx(ratio: number, basis: number): number {
  'worklet';
  return Math.max(1, ratio * basis);
}

function rectLayer(
  localX: number,
  offsetX: number,
  offsetY: number,
  width: number,
  height: number,
  fillColor: string,
  opacity: number,
  blendMode?: BlendMode
): RenderLayerData {
  'worklet';
  const layer: RenderLayerData = {
    position: { x: localX + offsetX, y: offsetY },
    shape: { type: ShapeTypes.Rectangle, width, height },
    fillColor,
    opacity,
    visible: true,
  };
  if (blendMode !== undefined) {
    layer.blendMode = blendMode;
  }
  return layer;
}

/**
 * Ordered render layers for one solid block cell (back → front).
 * Positions are relative to the obstacle row center.
 */
export function buildObstacleBlockCellLayers(
  args: ObstacleBlockCellLayerArgs
): RenderLayerData[] {
  'worklet';

  const { localX, blockWidth, blockHeight, imageKey, neighbors, borderRadius } =
    args;
  const halfW = blockWidth / 2;
  const halfH = blockHeight / 2;

  const faceH = blockHeight * BLOCK_FACE_HEIGHT_RATIO;
  const faceTop = -halfH;
  const faceBottom = faceTop + faceH;
  const faceCenterY = faceTop + faceH / 2;

  const aoStripW = minPx(BLOCK_AO_STRIP_WIDTH_RATIO, blockWidth);
  const creviceW = minPx(BLOCK_CREVICE_WIDTH_RATIO, blockWidth);
  const layers: RenderLayerData[] = [];

  if (neighbors.bottomExposed) {
    const shadowH = blockHeight * BLOCK_CONTACT_SHADOW_HEIGHT_RATIO;
    layers.push(
      rectLayer(
        localX,
        0,
        faceBottom + shadowH / 2,
        blockWidth * 0.92,
        shadowH,
        BLOCK_CONTACT_SHADOW_COLOR,
        BLOCK_CONTACT_SHADOW_OPACITY
      )
    );
  }

  if (neighbors.left) {
    layers.push(
      rectLayer(
        localX,
        -halfW + aoStripW / 2,
        faceCenterY,
        aoStripW,
        faceH,
        BLOCK_SHADOW_COLOR,
        BLOCK_AO_OPACITY
      )
    );
  }

  if (neighbors.top) {
    layers.push(
      rectLayer(
        localX,
        0,
        faceTop + aoStripW / 2,
        blockWidth,
        aoStripW,
        BLOCK_SHADOW_COLOR,
        BLOCK_AO_OPACITY
      )
    );
  }

  layers.push(
    withRenderLayerBacking(
      {
        position: { x: localX, y: 0 },
        shape: {
          type: ShapeTypes.Rectangle,
          width: blockWidth,
          height: blockHeight,
        },
        image: imageKey,
        visible: true,
      },
      createRectLayerBacking(
        args.cellBackingColor,
        blockWidth,
        blockHeight,
        { borderRadius }
      )
    )
  );

  const bottomShadeH = faceH * BLOCK_BOTTOM_SHADE_HEIGHT_RATIO;
  layers.push(
    rectLayer(
      localX,
      0,
      faceBottom - bottomShadeH / 2,
      blockWidth,
      bottomShadeH,
      BLOCK_SHADOW_COLOR,
      BLOCK_SHADE_OPACITY,
      BlendMode.Multiply
    )
  );

  const rightShadeW = blockWidth * BLOCK_RIGHT_SHADE_WIDTH_RATIO;
  layers.push(
    rectLayer(
      localX,
      halfW - rightShadeW / 2,
      faceCenterY,
      rightShadeW,
      faceH,
      BLOCK_EDGE_DARK_COLOR,
      BLOCK_SHADE_OPACITY,
      BlendMode.Multiply
    )
  );

  const hlSize = Math.min(
    blockWidth * BLOCK_HIGHLIGHT_SIZE_RATIO,
    faceH * BLOCK_HIGHLIGHT_SIZE_RATIO
  );
  layers.push(
    rectLayer(
      localX,
      -halfW + hlSize / 2,
      faceTop + hlSize / 2,
      hlSize,
      hlSize,
      BLOCK_HIGHLIGHT_COLOR,
      BLOCK_HIGHLIGHT_OPACITY,
      BlendMode.Screen
    )
  );

  if (neighbors.left) {
    layers.push(
      rectLayer(
        localX,
        -halfW + creviceW / 2,
        faceCenterY,
        creviceW,
        faceH,
        BLOCK_EDGE_DARK_COLOR,
        BLOCK_CREVICE_OPACITY
      )
    );
  }

  return layers;
}

export function deriveBlockCellNeighborMask(args: {
  col: number;
  rowLength: number;
  isSolidInRow: (col: number) => boolean;
  isSolidInRowBelow?: (col: number) => boolean;
  isSolidInRowAbove?: (col: number) => boolean;
}): BlockCellNeighborMask {
  'worklet';
  const { col, rowLength, isSolidInRow, isSolidInRowBelow, isSolidInRowAbove } =
    args;

  return {
    left: col > 0 && isSolidInRow(col - 1),
    right: col < rowLength - 1 && isSolidInRow(col + 1),
    top: isSolidInRowAbove?.(col) ?? false,
    bottomExposed: isSolidInRowBelow ? !isSolidInRowBelow(col) : true,
  };
}

export { computeGridExteriorBorderRadius };
