import { getObstacleRowPitch } from '@/assets/swimmerBlocks';
import { gridSpanToWorld } from '@/Game/grid/gridSpanToWorld';
import { gapColsClosedByPressForCollision, simPlatformPress } from '@/Game/hazards/platformPressMotion';
import { composePressIntroShaft } from '@/Game/path/platformShaft/composePressIntroShaft';
import { TEST_COLS } from '@/Game/path/__tests__/testGrid';

describe('visibilityCollisionParity', () => {
  const columnWidth = 60;
  const blockHeight = 60;
  const rowPitch = getObstacleRowPitch(blockHeight);
  const beat = composePressIntroShaft({ seed: 42, difficulty01: 0.4, columns: TEST_COLS });
  const hazard = beat.hazards[0];
  const rowStart = hazard.bounds.rowStart;

  it('fractional slab width grows smoothly during partial press (not column-snapped)', () => {
    const sim = simPlatformPress(hazard, TEST_COLS, 0.5, rowStart);
    expect(sim).not.toBeNull();
    const fractionalRect = gridSpanToWorld({
      slabStart: sim!.slabStart,
      slabEnd: sim!.slabEnd,
      rowYs: [200],
      leftX: 0,
      columnWidth,
      blockHeight,
      rowPitch,
      columns: TEST_COLS,
    });
    const snappedRect = gridSpanToWorld({
      slabStart: Math.min(...sim!.blockCols),
      slabEnd: Math.max(...sim!.blockCols) + 1,
      rowYs: [200],
      leftX: 0,
      columnWidth,
      blockHeight,
      rowPitch,
      columns: TEST_COLS,
    });
    expect(fractionalRect.width).toBeLessThan(snappedRect.width);
    expect(fractionalRect.width).toBeGreaterThan(columnWidth);
  });

  it('collision gap closure stays empty at telegraph while render shows 1-col steel', () => {
    const baseGaps = beat.rows[rowStart].gaps.slice();
    const sim = simPlatformPress(hazard, TEST_COLS, 0, rowStart)!;
    expect(gapColsClosedByPressForCollision(baseGaps, sim)).toEqual([]);
    const rect = gridSpanToWorld({
      slabStart: sim.slabStart,
      slabEnd: sim.slabEnd,
      rowYs: [200],
      leftX: 0,
      columnWidth,
      blockHeight,
      rowPitch,
      columns: TEST_COLS,
    });
    expect(rect.width).toBeCloseTo(columnWidth, 5);
  });
});
