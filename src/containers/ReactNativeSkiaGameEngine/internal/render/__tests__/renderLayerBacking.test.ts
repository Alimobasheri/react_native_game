import {
  computeGridExteriorBorderRadius,
  createRectLayerBacking,
  gapSetFromColumns,
  isSolidColumn,
  withRenderLayerBacking,
} from '../renderLayerBacking';
import { borderRadiusHasAny } from '../renderShapes';
import { ShapeTypes } from '../../components/render';

describe('renderLayerBacking', () => {
  const baseLayer = {
    position: { x: 10, y: 0 },
    shape: { type: ShapeTypes.Rectangle, width: 40, height: 50 },
    image: 'block_var_0',
    visible: true,
  };

  it('withRenderLayerBacking accepts fill color shorthand', () => {
    const layer = withRenderLayerBacking(baseLayer, '#9A4518');
    expect(layer.backing).toEqual({ fillColor: '#9A4518' });
    expect(layer.image).toBe('block_var_0');
  });

  it('createRectLayerBacking builds explicit rectangle shape with border radius', () => {
    expect(createRectLayerBacking('#9A4518', 40, 50, { borderRadius: { tr: 24 } })).toEqual({
      fillColor: '#9A4518',
      opacity: undefined,
      shape: {
        type: 'rectangle',
        width: 40,
        height: 50,
        borderRadius: { tr: 24 },
      },
    });
  });

  it('withRenderLayerBacking attaches rounded rect backing', () => {
    const layer = withRenderLayerBacking(
      baseLayer,
      createRectLayerBacking('#9A4518', 40, 50, {
        borderRadius: { tl: 8, tr: 8, bl: 0, br: 0 },
      })
    );
    expect(layer.backing?.shape?.borderRadius).toEqual({
      tl: 8,
      tr: 8,
      bl: 0,
      br: 0,
    });
  });
});

describe('computeGridExteriorBorderRadius', () => {
  const cols = 9;
  const R = 12;

  it('rounds all corners on a lone solid cell', () => {
    const gapSet = gapSetFromColumns([0, 1, 2, 4, 5, 6, 7, 8]);
    const radius = computeGridExteriorBorderRadius({
      col: 3,
      columnCount: cols,
      exteriorRadius: R,
      isSolidInRow: (c) => isSolidColumn(gapSet, c, cols),
    });
    expect(radius).toEqual({ tl: R, tr: R, bl: R, br: R });
    expect(borderRadiusHasAny(radius)).toBe(true);
  });

  it('squares interior corners at a 2x2 cluster junction', () => {
    const rowGaps = [0, 1, 2, 5, 6, 7, 8];
    const row0 = gapSetFromColumns(rowGaps);
    const row1 = gapSetFromColumns(rowGaps);
    const solid = (set: Set<number>, c: number) => isSolidColumn(set, c, cols);

    const topLeft = computeGridExteriorBorderRadius({
      col: 3,
      columnCount: cols,
      exteriorRadius: R,
      isSolidInRow: (c) => solid(row0, c),
      isSolidInRowBelow: (c) => solid(row1, c),
    });
    expect(topLeft.tl).toBe(R);
    expect(topLeft.tr).toBe(0);
    expect(topLeft.bl).toBe(0);
    expect(topLeft.br).toBe(0);

    const bottomRight = computeGridExteriorBorderRadius({
      col: 4,
      columnCount: cols,
      exteriorRadius: R,
      isSolidInRow: (c) => solid(row1, c),
      isSolidInRowAbove: (c) => solid(row0, c),
    });
    expect(bottomRight.tl).toBe(0);
    expect(bottomRight.tr).toBe(0);
    expect(bottomRight.bl).toBe(0);
    expect(bottomRight.br).toBe(R);
  });
});
