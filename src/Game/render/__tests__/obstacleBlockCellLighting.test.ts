import { BlendMode } from '@shopify/react-native-skia';
import { gapSetFromColumns, isSolidColumn } from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import {
  BLOCK_CONTACT_SHADOW_COLOR,
  BLOCK_EDGE_DARK_COLOR,
  BLOCK_HIGHLIGHT_COLOR,
  BLOCK_SHADOW_COLOR,
} from '@/config/swimmerBlockLightingTuning';
import {
  buildObstacleBlockCellLayers,
  deriveBlockCellNeighborMask,
} from '@/Game/render/obstacleBlockCellLighting';
import { buildObstacleRowRenderLayers } from '@/Game/render/buildObstacleRowRenderLayers';

const COLS = 9;
const BLOCK_W = 40;
const BLOCK_H = 45;

function solidChecker(col: number, gapSet: Set<number>) {
  return isSolidColumn(gapSet, col, COLS);
}

describe('deriveBlockCellNeighborMask', () => {
  it('marks all exterior faces on an isolated cell', () => {
    const gapSet = gapSetFromColumns([0, 1, 2, 4, 5, 6, 7, 8]);
    const mask = deriveBlockCellNeighborMask({
      col: 3,
      rowLength: COLS,
      isSolidInRow: (c) => solidChecker(c, gapSet),
    });
    expect(mask).toEqual({
      left: false,
      right: false,
      top: false,
      bottomExposed: true,
    });
  });

  it('detects horizontal and vertical neighbors', () => {
    const rowGaps = [0, 1, 2, 5, 6, 7, 8];
    const rowSet = gapSetFromColumns(rowGaps);
    const belowSet = gapSetFromColumns(rowGaps);
    const aboveSet = gapSetFromColumns(rowGaps);

    const mask = deriveBlockCellNeighborMask({
      col: 3,
      rowLength: COLS,
      isSolidInRow: (c) => solidChecker(c, rowSet),
      isSolidInRowBelow: (c) => solidChecker(c, belowSet),
      isSolidInRowAbove: (c) => solidChecker(c, aboveSet),
    });

    expect(mask).toEqual({
      left: false,
      right: true,
      top: true,
      bottomExposed: false,
    });
  });
});

describe('buildObstacleBlockCellLayers', () => {
  const baseArgs = {
    localX: 0,
    blockWidth: BLOCK_W,
    blockHeight: BLOCK_H,
    imageKey: 'block_var_0',
    borderRadius: { tl: 6, tr: 6, bl: 6, br: 6 },
    cellBackingColor: '#9A4518',
  };

  it('includes contact shadow when bottom is exposed', () => {
    const layers = buildObstacleBlockCellLayers({
      ...baseArgs,
      neighbors: {
        left: false,
        right: false,
        top: false,
        bottomExposed: true,
      },
    });
    const contactShadows = layers.filter(
      (l) => l.fillColor === BLOCK_CONTACT_SHADOW_COLOR
    );
    expect(contactShadows).toHaveLength(1);
  });

  it('omits contact shadow when supported from below', () => {
    const layers = buildObstacleBlockCellLayers({
      ...baseArgs,
      neighbors: {
        left: false,
        right: false,
        top: false,
        bottomExposed: false,
      },
    });
    expect(
      layers.some((l) => l.fillColor === BLOCK_CONTACT_SHADOW_COLOR)
    ).toBe(false);
  });

  it('adds left seam AO and crevice only when left neighbor is solid', () => {
    const withLeft = buildObstacleBlockCellLayers({
      ...baseArgs,
      neighbors: {
        left: true,
        right: true,
        top: false,
        bottomExposed: true,
      },
    });
    const leftAo = withLeft.filter(
      (l) =>
        l.fillColor === BLOCK_SHADOW_COLOR &&
        l.opacity !== undefined &&
        !l.blendMode
    );
    const crevices = withLeft.filter(
      (l) => l.fillColor === BLOCK_EDGE_DARK_COLOR && !l.blendMode
    );
    expect(leftAo.length).toBeGreaterThanOrEqual(1);
    expect(crevices).toHaveLength(1);

    const withoutLeft = buildObstacleBlockCellLayers({
      ...baseArgs,
      neighbors: {
        left: false,
        right: true,
        top: false,
        bottomExposed: true,
      },
    });
    expect(
      withoutLeft.filter(
        (l) => l.fillColor === BLOCK_EDGE_DARK_COLOR && !l.blendMode
      )
    ).toHaveLength(0);
  });

  it('adds top seam AO when stacked below another solid', () => {
    const layers = buildObstacleBlockCellLayers({
      ...baseArgs,
      neighbors: {
        left: false,
        right: false,
        top: true,
        bottomExposed: false,
      },
    });
    const topAo = layers.filter(
      (l) =>
        l.fillColor === BLOCK_SHADOW_COLOR &&
        l.position?.y !== undefined &&
        (l.position.y as number) < 0
    );
    expect(topAo.length).toBeGreaterThanOrEqual(1);
  });

  it('includes sprite backing, multiply shades, and screen highlight', () => {
    const layers = buildObstacleBlockCellLayers({
      ...baseArgs,
      neighbors: {
        left: false,
        right: false,
        top: false,
        bottomExposed: true,
      },
    });
    expect(layers.some((l) => l.image === 'block_var_0' && l.backing)).toBe(
      true
    );
    expect(
      layers.some(
        (l) => l.blendMode === BlendMode.Multiply && l.fillColor === BLOCK_SHADOW_COLOR
      )
    ).toBe(true);
    expect(
      layers.some(
        (l) =>
          l.blendMode === BlendMode.Screen && l.fillColor === BLOCK_HIGHLIGHT_COLOR
      )
    ).toBe(true);
  });
});

describe('buildObstacleRowRenderLayers', () => {
  it('emits more layers per solid cell than the pre-lighting single layer', () => {
    const rowGaps = [0, 1, 2, 4, 5, 6, 7, 8];
    const layers = buildObstacleRowRenderLayers({
      gaps: rowGaps,
      rowLength: COLS,
      leftX: 10,
      blockWidth: BLOCK_W,
      blockHeight: BLOCK_H,
      rowCenterX: 200,
      rowY: 300,
      pickImage: () => 'block_var_0',
    });
    expect(layers.length).toBeGreaterThan(1);
  });

  it('draws crevice on the right cell of an adjacent pair only once per seam', () => {
    const rowGaps = [0, 1, 2, 5, 6, 7, 8];
    const layers = buildObstacleRowRenderLayers({
      gaps: rowGaps,
      rowLength: COLS,
      leftX: 10,
      blockWidth: BLOCK_W,
      blockHeight: BLOCK_H,
      rowCenterX: 200,
      rowY: 300,
      pickImage: () => 'block_var_0',
    });
    const crevices = layers.filter(
      (l) => l.fillColor === BLOCK_EDGE_DARK_COLOR && !l.blendMode
    );
    expect(crevices).toHaveLength(1);
  });
});
