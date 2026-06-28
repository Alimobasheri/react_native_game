import {
  TENSION_FUNNEL_DURATION_ROWS,
  tensionFunnelRow,
  tensionFunnelWidthAtStep,
  tensionParadoxBaseGapColumns,
  tensionParadoxHasWallAtPriorCenter,
  tensionParadoxSplitRow,
} from '@/Game/path/tensionGenerators';
import { gapsFromRow, hasVerticalSeam } from '@/Game/path/swimmerGrid';
import { TEST_COLS } from '@/Game/path/__tests__/testGrid';

const CENTER = Math.floor(TEST_COLS / 2);

describe('tensionFunnelRow', () => {
  it('terminates at exactly width 1 on the last funnel row (step 5)', () => {
    const lastStep = TENSION_FUNNEL_DURATION_ROWS - 1;
    expect(tensionFunnelWidthAtStep(lastStep)).toBe(1);
    const row = tensionFunnelRow(lastStep, CENTER, TEST_COLS);
    expect(gapsFromRow(row).length).toBe(1);
  });

  it('decrements width across steps 0..4', () => {
    expect(tensionFunnelWidthAtStep(0)).toBe(5);
    expect(tensionFunnelWidthAtStep(1)).toBe(4);
    expect(tensionFunnelWidthAtStep(2)).toBe(3);
    expect(tensionFunnelWidthAtStep(3)).toBe(2);
    expect(tensionFunnelWidthAtStep(4)).toBe(1);
  });
});

describe('tensionParadoxSplitRow', () => {
  it('leaves a solid wall at the prior central column C between the two tracks', () => {
    expect(tensionParadoxHasWallAtPriorCenter(CENTER, TEST_COLS)).toBe(true);
    const row = tensionParadoxSplitRow(CENTER, TEST_COLS);
    expect(row[CENTER]).toBe(1);
    expect(gapsFromRow(row).length).toBeGreaterThan(0);
  });

  it('always has at least one passable column on very narrow grids', () => {
    for (let n = 3; n <= 6; n++) {
      for (let c = 0; c < n; c++) {
        const row = tensionParadoxSplitRow(c, n);
        expect(gapsFromRow(row).length).toBeGreaterThan(0);
      }
    }
  });

  it('shifts the fork so the funnel exit column stays passable vs the last funnel row', () => {
    const lastFunnel = tensionFunnelRow(TENSION_FUNNEL_DURATION_ROWS - 1, CENTER, TEST_COLS);
    const exitGaps = gapsFromRow(lastFunnel);
    expect(exitGaps).toEqual([CENTER]);
    const base = tensionParadoxBaseGapColumns(CENTER, TEST_COLS);
    expect(base.includes(CENTER)).toBe(false);
    const row = tensionParadoxSplitRow(CENTER, TEST_COLS, exitGaps);
    expect(hasVerticalSeam(lastFunnel, row)).toBe(true);
    expect(gapsFromRow(row).includes(CENTER)).toBe(true);
  });
});
