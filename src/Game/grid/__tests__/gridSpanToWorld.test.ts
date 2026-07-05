import { getObstacleRowPitch } from '@/assets/swimmerBlocks';
import { gridSpanToWorld } from '@/Game/grid/gridSpanToWorld';
import { TEST_COLS } from '@/Game/path/__tests__/testGrid';

describe('gridSpanToWorld', () => {
  const columnWidth = 60;
  const blockHeight = 60;
  const rowPitch = getObstacleRowPitch(blockHeight);
  const leftX = 0;

  it('centerY is mean of row Y values', () => {
    const rect = gridSpanToWorld({
      slabStart: 4,
      slabEnd: 5,
      rowYs: [200, 160, 120],
      leftX,
      columnWidth,
      blockHeight,
      rowPitch,
      columns: TEST_COLS,
    });
    expect(rect.centerY).toBeCloseTo((200 + 160 + 120) / 3, 5);
  });

  it('width scales with slab column span', () => {
    const rect = gridSpanToWorld({
      slabStart: 3,
      slabEnd: 5,
      rowYs: [100],
      leftX,
      columnWidth,
      blockHeight,
      rowPitch,
      columns: TEST_COLS,
    });
    expect(rect.width).toBeCloseTo(2 * columnWidth, 5);
  });

  it('1-col telegraph wall has exact column width (no 0.15 fudge)', () => {
    const rect = gridSpanToWorld({
      slabStart: 4,
      slabEnd: 5,
      rowYs: [100],
      leftX,
      columnWidth,
      blockHeight,
      rowPitch,
      columns: TEST_COLS,
    });
    expect(rect.width).toBeCloseTo(columnWidth, 5);
  });

  it('zero column span yields zero width', () => {
    const rect = gridSpanToWorld({
      slabStart: 4,
      slabEnd: 4,
      rowYs: [100],
      leftX,
      columnWidth,
      blockHeight,
      rowPitch,
      columns: TEST_COLS,
    });
    expect(rect.width).toBe(0);
  });

  it('height uses rowPitch for multi-row spans', () => {
    const rect = gridSpanToWorld({
      slabStart: 1,
      slabEnd: 2,
      rowYs: [200, 200 - rowPitch],
      leftX,
      columnWidth,
      blockHeight,
      rowPitch,
      columns: TEST_COLS,
    });
    expect(rect.height).toBeCloseTo(rowPitch + blockHeight, 5);
  });
});
