import {
  aabbFromCenter,
  aabbOverlap,
  resolveSwimmerAgainstRows,
  selectRowsNearSwimmer,
  selectRowsNearSwimmerFromComponentStore,
  solidAABBsFromRow,
  sweptAabbTOI,
  tiltedAabbHalfExtents,
  type CollisionRow,
} from '@/Game/collision/swimmerBlockCollision';
import { getColumnCenterX } from '@/Layout';
import type { ObstacleRowComponentData } from '@/Game/ecs-components/ObstacleRowComponent';
import type { ComponentStore } from '@/containers/ReactNativeSkiaGameEngine/services-ecs';

const CONTAINER = { centerX: 200, width: 360, columnCount: 9 };
const BLOCK = { width: 40, height: 40 };
const COL4_CENTER_X = getColumnCenterX(4, CONTAINER.centerX, CONTAINER.width);

function rowAt(y: number, gaps: number[]): CollisionRow {
  return { y, gaps };
}

function resolve(
  overrides: Partial<Parameters<typeof resolveSwimmerAgainstRows>[0]> & {
    rows?: CollisionRow[];
  }
) {
  const halfW = 13;
  const halfH = 23;
  return resolveSwimmerAgainstRows({
    x: 200,
    y: 300,
    halfWidth: halfW,
    halfHeight: halfH,
    deltaX: 0,
    deltaY: 0,
    rowDeltaY: 0,
    rows: [],
    container: CONTAINER,
    blockSize: BLOCK,
    minX: 200 - 180 + halfW,
    maxX: 200 + 180 - halfW,
    ...overrides,
  });
}

describe('aabbOverlap', () => {
  it('detects overlap', () => {
    const a = aabbFromCenter(0, 0, 10, 10);
    const b = aabbFromCenter(5, 5, 10, 10);
    expect(aabbOverlap(a, b)).toBe(true);
  });

  it('rejects separated boxes', () => {
    const a = aabbFromCenter(0, 0, 10, 10);
    const b = aabbFromCenter(50, 0, 10, 10);
    expect(aabbOverlap(a, b)).toBe(false);
  });
});

describe('sweptAabbTOI', () => {
  it('finds upward collision before tunneling', () => {
    const mover = aabbFromCenter(100, 200, 10, 10);
    const ceiling = aabbFromCenter(100, 170, 20, 10);
    const toi = sweptAabbTOI(mover, ceiling, { x: 0, y: -50 });
    expect(toi).not.toBeNull();
    expect(toi!).toBeGreaterThan(0);
    expect(toi!).toBeLessThan(1);
  });
});

describe('selectRowsNearSwimmer', () => {
  it('keeps only rows within vertical band', () => {
    const rows = [rowAt(100, [4]), rowAt(500, [4]), rowAt(310, [4])];
    const near = selectRowsNearSwimmer(rows, 300, 20, 40);
    expect(near.map((r) => r.y)).toEqual([310]);
  });
});

describe('solidAABBsFromRow', () => {
  it('skips gap columns', () => {
    const solids = solidAABBsFromRow(rowAt(200, [4]), CONTAINER, BLOCK, 1.0);
    expect(solids.length).toBe(8);
  });

  it('fast path with solidColumnCentersX matches gaps path bounds', () => {
    const gaps = [4];
    const y = 200;
    const hitboxScale = 1.0;
    const gapRow = rowAt(y, gaps);
    const fromGaps = solidAABBsFromRow(gapRow, CONTAINER, BLOCK, hitboxScale);

    const solidColumnCentersX: number[] = [];
    for (let col = 0; col < 9; col++) {
      if (col === 4) continue;
      solidColumnCentersX.push(
        getColumnCenterX(col, CONTAINER.centerX, CONTAINER.width)
      );
    }
    const fromPrecomputed = solidAABBsFromRow(
      { y, gaps, solidColumnCentersX },
      CONTAINER,
      BLOCK,
      hitboxScale
    );

    expect(fromPrecomputed.length).toBe(fromGaps.length);
    for (let i = 0; i < fromGaps.length; i++) {
      expect(fromPrecomputed[i].minX).toBeCloseTo(fromGaps[i].minX, 5);
      expect(fromPrecomputed[i].maxX).toBeCloseTo(fromGaps[i].maxX, 5);
      expect(fromPrecomputed[i].minY).toBeCloseTo(fromGaps[i].minY, 5);
      expect(fromPrecomputed[i].maxY).toBeCloseTo(fromGaps[i].maxY, 5);
    }
  });
});

describe('selectRowsNearSwimmerFromComponentStore', () => {
  it('keeps only rows within vertical band', () => {
    const storeData: Record<number, ObstacleRowComponentData> = {
      1: {
        y: 100,
        gaps: [4],
        solidColumnCentersX: [0],
        prevRowEntity: null,
      },
      2: {
        y: 500,
        gaps: [4],
        solidColumnCentersX: [0],
        prevRowEntity: null,
      },
      3: {
        y: 310,
        gaps: [4],
        solidColumnCentersX: [0],
        prevRowEntity: null,
      },
    };
    const rowStore = {
      get: (entity: number) => storeData[entity],
      forEach: (fn: (entity: number, data: ObstacleRowComponentData) => void) => {
        fn(1, storeData[1]);
        fn(2, storeData[2]);
        fn(3, storeData[3]);
      },
    } as ComponentStore<ObstacleRowComponentData>;

    const near = selectRowsNearSwimmerFromComponentStore(
      rowStore,
      300,
      20,
      40
    );
    expect(near.map((r) => r.y)).toEqual([310]);
  });
});

describe('tiltedAabbHalfExtents', () => {
  it('expands bounds when tilted', () => {
    const upright = tiltedAabbHalfExtents(13, 23, 0);
    const tilted = tiltedAabbHalfExtents(13, 23, (75 * Math.PI) / 180);
    expect(tilted.halfWidth).toBeGreaterThan(upright.halfWidth);
    expect(tilted.halfWidth + tilted.halfHeight).toBeGreaterThan(
      upright.halfWidth + upright.halfHeight
    );
  });
});

describe('resolveSwimmerAgainstRows', () => {
  it('moves freely when no solids', () => {
    const result = resolve({ deltaX: 30, deltaY: -20 });
    expect(result.x).toBe(230);
    expect(result.y).toBe(280);
    expect(result.isColliding).toBe(false);
  });

  it('pins under a ceiling block and carries down with rowDeltaY', () => {
    // Block centered at y=250; swimmer below with top touching block bottom.
    const rows = [rowAt(250, [0, 1, 2, 3, 5, 6, 7, 8])]; // solid col 4
    const blockBottom = 250 + (BLOCK.height * 1.0) / 2;
    const halfH = 23;
    const startY = blockBottom + halfH;

    const result = resolve({
      x: COL4_CENTER_X,
      y: startY,
      halfHeight: halfH,
      deltaY: -40,
      rowDeltaY: 10,
      rows,
    });

    expect(result.isPinnedFromAbove).toBe(true);
    expect(result.isColliding).toBe(true);
    expect(result.y).toBeGreaterThan(startY);
  });

  it('blocks horizontal motion into a side solid', () => {
    const rows = [rowAt(300, [0, 1, 2, 3, 5, 6, 7, 8])]; // only column 4 is solid
    const result = resolve({
      x: 160,
      y: 300,
      deltaX: 80,
      rows,
    });

    expect(result.isSideBlocked).toBe(true);
    expect(result.x).toBeLessThan(160 + 80);
  });

  it('allows passage through gap column', () => {
    const rows = [rowAt(280, [4])]; // gap at center col 4
    const result = resolve({
      x: 200,
      y: 320,
      deltaY: -60,
      rows,
    });

    expect(result.isPinnedFromAbove).toBe(false);
    expect(result.isColliding).toBe(false);
    expect(result.y).toBe(260);
  });

  it('prevents tunneling through ceiling at high upward delta', () => {
    const rows = [rowAt(200, [0, 1, 2, 3, 5, 6, 7, 8])];
    const halfH = 23;
    const startY = 280;
    const result = resolve({
      x: COL4_CENTER_X,
      y: startY,
      halfHeight: halfH,
      deltaY: -120,
      rowDeltaY: 8,
      rows,
    });

    const swimmerTop = result.y - halfH;
    const blockBottom = 200 + (BLOCK.height * 1.0) / 2;
    expect(swimmerTop).toBeGreaterThanOrEqual(blockBottom - 1);
    expect(result.isColliding).toBe(true);
  });

  it('prevents tunneling at extreme upward delta with fast descending rows', () => {
    const rows = [rowAt(200, [0, 1, 2, 3, 5, 6, 7, 8])];
    const halfH = 23;
    const startY = 320;
    const result = resolve({
      x: COL4_CENTER_X,
      y: startY,
      halfHeight: halfH,
      deltaY: -200,
      rowDeltaY: 14,
      rows,
    });

    const swimmerTop = result.y - halfH;
    const blockBottom = 200 + (BLOCK.height * 1.0) / 2;
    expect(swimmerTop).toBeGreaterThanOrEqual(blockBottom - 2);
    expect(result.isColliding).toBe(true);
  });

  it('does not pin swimmer in gap when solids exist only in adjacent columns', () => {
    const rows = [rowAt(300, [4])];
    const result = resolve({
      x: 200,
      y: 320,
      deltaY: 0,
      deltaX: 0,
      rows,
    });

    expect(result.isPinnedFromAbove).toBe(false);
  });

  it('does not pin when sliding into adjacent column block horizontally', () => {
    const rows = [rowAt(300, [4])];
    const result = resolve({
      x: 188,
      y: 320,
      deltaX: -50,
      angle: 0,
      rows,
    });

    expect(result.isPinnedFromAbove).toBe(false);
    expect(result.y).toBe(320);
  });

  it('blocks fast kinematic tap into adjacent side solid', () => {
    const rows = [rowAt(300, [4])];
    const col3CenterX = getColumnCenterX(3, CONTAINER.centerX, CONTAINER.width);
    const blockRightX = col3CenterX + BLOCK.width / 2;
    const startX = blockRightX + 8;
    const result = resolve({
      x: startX,
      y: 320,
      deltaX: -140,
      kinematicHorizontal: true,
      angle: ((62 * Math.PI) / 180) * 0.9,
      rows,
    });

    expect(result.isPinnedFromAbove).toBe(false);
    expect(result.isSideBlocked).toBe(true);
    expect(result.x).toBeGreaterThan(col3CenterX - BLOCK.width / 2 - 1);
  });

  it('pinned swimmer can move horizontally under ceiling block', () => {
    const rows = [rowAt(250, [0, 1, 2, 3, 5, 6, 7, 8])];
    const blockBottom = 250 + (BLOCK.height * 1.0) / 2;
    const halfH = 23;
    const startY = blockBottom + halfH;

    const leftTry = resolve({
      x: COL4_CENTER_X,
      y: startY,
      halfHeight: halfH,
      deltaX: -15,
      deltaY: 0,
      rowDeltaY: 0,
      rows,
    });
    expect(leftTry.isPinnedFromAbove).toBe(true);
    expect(leftTry.x).toBeLessThan(COL4_CENTER_X);

    const rightTry = resolve({
      x: COL4_CENTER_X,
      y: startY,
      halfHeight: halfH,
      deltaX: 15,
      deltaY: 0,
      rowDeltaY: 0,
      rows,
    });
    expect(rightTry.isPinnedFromAbove).toBe(true);
    expect(rightTry.x).toBeGreaterThan(COL4_CENTER_X);
  });

  it('unpins when sliding horizontally out from under ceiling', () => {
    const rows = [rowAt(250, [0, 1, 2, 3, 5, 6, 7, 8])];
    const blockBottom = 250 + (BLOCK.height * 1.0) / 2;
    const pinnedHalfH = 23;
    const startY = blockBottom + pinnedHalfH;

    const slideOut = resolve({
      x: COL4_CENTER_X,
      y: startY,
      halfHeight: pinnedHalfH,
      deltaX: 55,
      rows,
    });

    expect(slideOut.x).toBeGreaterThan(COL4_CENTER_X + 20);
    expect(slideOut.isPinnedFromAbove).toBe(false);
  });

  it('pinned swimmer slides away from a one-sided side block', () => {
    const rows = [rowAt(250, [0, 1, 2, 5, 6, 7, 8])]; // solids at col 3 and 4
    const blockBottom = 250 + (BLOCK.height * 1.0) / 2;
    const halfH = 23;
    const startY = blockBottom + halfH;
    const col3CenterX = getColumnCenterX(3, CONTAINER.centerX, CONTAINER.width);
    const col4CenterX = getColumnCenterX(4, CONTAINER.centerX, CONTAINER.width);

    const intoSide = resolve({
      x: col4CenterX,
      y: startY,
      halfHeight: halfH,
      deltaX: -50,
      rows,
    });
    expect(intoSide.isPinnedFromAbove).toBe(true);
    expect(intoSide.x).toBeGreaterThan(col3CenterX + BLOCK.width / 2 - 2);
    expect(intoSide.x).toBeLessThan(col4CenterX);

    const awayFromSide = resolve({
      x: col4CenterX,
      y: startY,
      halfHeight: halfH,
      deltaX: 55,
      rows,
    });
    expect(awayFromSide.x).toBeGreaterThan(col4CenterX + 20);
    expect(awayFromSide.isPinnedFromAbove).toBe(false);
  });

  it('stays pinned when sliding within ceiling column beside a side block', () => {
    const rows = [rowAt(250, [0, 1, 2, 5, 6, 7, 8])];
    const blockBottom = 250 + (BLOCK.height * 1.0) / 2;
    const halfH = 23;
    const startY = blockBottom + halfH;
    const col4CenterX = getColumnCenterX(4, CONTAINER.centerX, CONTAINER.width);

    const tapAwayFromSideBlock = resolve({
      x: col4CenterX,
      y: startY,
      halfHeight: halfH,
      deltaX: 15,
      rows,
    });
    expect(tapAwayFromSideBlock.isPinnedFromAbove).toBe(true);
    expect(tapAwayFromSideBlock.x).toBeGreaterThan(col4CenterX);
    expect(tapAwayFromSideBlock.sideBlockedDirection).toBe(0);
  });

  it('does not rise through ceiling while still pinned in column', () => {
    const rows = [
      rowAt(200, [0, 1, 2, 3, 5, 6, 7, 8]),
      rowAt(250, [0, 1, 2, 3, 5, 6, 7, 8]),
    ];
    const halfH = 23;
    const blockBottom = 250 + (BLOCK.height * 1.0) / 2;
    const startY = blockBottom + halfH;
    const rise = resolve({
      x: COL4_CENTER_X,
      y: startY,
      halfHeight: halfH,
      deltaY: -140,
      rows,
    });
    const upperBlockBottom = 200 + (BLOCK.height * 1.0) / 2;
    expect(rise.isPinnedFromAbove).toBe(true);
    expect(rise.y - halfH).toBeGreaterThanOrEqual(upperBlockBottom - 2);
  });

  it('escapes side overlap with one tap away from the block', () => {
    const rows = [rowAt(300, [4])];
    const col3CenterX = getColumnCenterX(3, CONTAINER.centerX, CONTAINER.width);
    const blockRightX = col3CenterX + BLOCK.width / 2;
    const embeddedX = blockRightX - 6;
    const result = resolve({
      x: embeddedX,
      y: 320,
      deltaX: 90,
      rows,
    });

    expect(result.sideBlockedDirection).toBe(0);
    expect(result.x).toBeGreaterThan(embeddedX + 40);
  });
});
