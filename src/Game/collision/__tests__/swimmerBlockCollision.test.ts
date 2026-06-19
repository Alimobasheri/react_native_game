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
    const solids = solidAABBsFromRow(rowAt(200, [4]), CONTAINER, BLOCK, 1.05);
    expect(solids.length).toBe(8);
  });

  it('fast path with solidColumnCentersX matches gaps path bounds', () => {
    const gaps = [4];
    const y = 200;
    const hitboxScale = 1.05;
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
    const blockBottom = 250 + (BLOCK.height * 1.05) / 2;
    const halfH = 23;
    const startY = blockBottom + halfH - 1;

    const result = resolve({
      x: 200,
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

    expect(result.isColliding).toBe(false);
    expect(result.y).toBe(260);
  });

  it('prevents tunneling through ceiling at high upward delta', () => {
    const rows = [rowAt(200, [0, 1, 2, 3, 5, 6, 7, 8])];
    const halfH = 23;
    const startY = 280;
    const result = resolve({
      y: startY,
      halfHeight: halfH,
      deltaY: -120,
      rowDeltaY: 8,
      rows,
    });

    const swimmerTop = result.y - halfH;
    const blockBottom = 200 + (BLOCK.height * 1.05) / 2;
    expect(swimmerTop).toBeGreaterThanOrEqual(blockBottom - 1);
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
      angle: ((75 * Math.PI) / 180) * 0.85,
      rows,
    });

    expect(result.isPinnedFromAbove).toBe(false);
    expect(result.y).toBe(320);
  });

  it('pinned swimmer can move horizontally under ceiling block', () => {
    const rows = [rowAt(250, [0, 1, 2, 3, 5, 6, 7, 8])];
    const blockBottom = 250 + (BLOCK.height * 1.05) / 2;
    const halfH = 23;
    const startY = blockBottom + halfH - 1;

    const leftTry = resolve({
      x: 200,
      y: startY,
      halfHeight: halfH,
      deltaX: -60,
      deltaY: 0,
      rowDeltaY: 0,
      rows,
    });
    expect(leftTry.isPinnedFromAbove).toBe(true);
    expect(leftTry.x).toBeLessThan(200);

    const rightTry = resolve({
      x: 200,
      y: startY,
      halfHeight: halfH,
      deltaX: 60,
      deltaY: 0,
      rowDeltaY: 0,
      rows,
    });
    expect(rightTry.isPinnedFromAbove).toBe(true);
    expect(rightTry.x).toBeGreaterThan(200);
  });
});
