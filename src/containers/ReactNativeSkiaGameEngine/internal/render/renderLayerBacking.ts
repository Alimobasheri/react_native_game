import type {
  RenderLayerData,
  RenderShapeCircle,
  RenderShapePolygon,
  RenderShapeRectangle,
} from '../components/render';
import type { RectangleBorderRadius } from './renderShapes';

/** Opaque fill drawn behind a render layer's main content (image, stroke, etc.). */
export type RenderLayerBackingData = {
  fillColor: string;
  opacity?: number;
  /**
   * Optional shape override. When omitted, the parent layer's `shape` is used.
   * Rectangles may include per-corner `borderRadius` for grid-aware occluders.
   */
  shape?: RenderShapeRectangle | RenderShapeCircle | RenderShapePolygon;
};

/** Create a backing descriptor for a rectangular cell occluder. */
export function createRectLayerBacking(
  fillColor: string,
  width: number,
  height: number,
  options?: {
    opacity?: number;
    borderRadius?: RectangleBorderRadius | number;
  }
): RenderLayerBackingData {
  'worklet';
  return {
    fillColor,
    opacity: options?.opacity,
    shape: {
      type: 'rectangle',
      width,
      height,
      borderRadius: options?.borderRadius,
    },
  };
}

/** Attach full-cell opaque backing to a render layer (shorthand string = fillColor only). */
export function withRenderLayerBacking(
  layer: RenderLayerData,
  backing: RenderLayerBackingData | string
): RenderLayerData {
  'worklet';
  return {
    ...layer,
    backing:
      typeof backing === 'string'
        ? { fillColor: backing }
        : backing,
  };
}

export function gapSetFromColumns(gaps: readonly number[]): Set<number> {
  'worklet';
  const set = new Set<number>();
  for (let i = 0; i < gaps.length; i++) {
    set.add(gaps[i]);
  }
  return set;
}

export function isSolidColumn(
  gapSet: Set<number>,
  col: number,
  columnCount: number
): boolean {
  'worklet';
  if (col < 0 || col >= columnCount) {
    return false;
  }
  return !gapSet.has(col);
}

/**
 * Per-corner backing radius for a grid cell: round only corners with no
 * solid neighbor on both adjacent sides (exterior silhouette).
 */
export function computeGridExteriorBorderRadius(args: {
  col: number;
  columnCount: number;
  exteriorRadius: number;
  isSolidInRow: (col: number) => boolean;
  isSolidInRowBelow?: (col: number) => boolean;
  isSolidInRowAbove?: (col: number) => boolean;
}): RectangleBorderRadius {
  'worklet';
  const left = args.isSolidInRow(args.col - 1);
  const right = args.isSolidInRow(args.col + 1);
  const below = args.isSolidInRowBelow?.(args.col) ?? false;
  const above = args.isSolidInRowAbove?.(args.col) ?? false;
  const radius = args.exteriorRadius;

  return {
    tl: !left && !above ? radius : 0,
    tr: !right && !above ? radius : 0,
    bl: !left && !below ? radius : 0,
    br: !right && !below ? radius : 0,
  };
}
