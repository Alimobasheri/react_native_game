import {
  TENSION_FUNNEL_DURATION_ROWS,
  tensionFunnelRow,
  tensionFunnelWidthAtStep,
  tensionParadoxBaseGapColumns,
  tensionParadoxHasWallAtPriorCenter,
  tensionParadoxSplitRow,
} from '@/Game/path/tensionGenerators';
import { gapsFromRow, hasVerticalSeam } from '@/Game/path/swimmerGrid';

const COLS = 15;

describe('tensionFunnelRow', () => {
  it('terminates at exactly width 1 on the last funnel row (step 5)', () => {
    const lastStep = TENSION_FUNNEL_DURATION_ROWS - 1;
    expect(tensionFunnelWidthAtStep(lastStep)).toBe(1);
    const row = tensionFunnelRow(lastStep, 7, COLS);
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
  it('leaves a solid wall (1) at the prior central column C between the two tracks', () => {
    expect(tensionParadoxHasWallAtPriorCenter(7, COLS)).toBe(true);
    const row = tensionParadoxSplitRow(7, COLS);
    expect(row[7]).toBe(1);
    expect(row[4]).toBe(0);
    expect(row[9]).toBe(0);
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
    const center = 7;
    const lastFunnel = tensionFunnelRow(TENSION_FUNNEL_DURATION_ROWS - 1, center, COLS);
    const exitGaps = gapsFromRow(lastFunnel);
    expect(exitGaps).toEqual([center]);
    const base = tensionParadoxBaseGapColumns(center, COLS);
    expect(base.includes(center)).toBe(false);
    const row = tensionParadoxSplitRow(center, COLS, exitGaps);
    expect(hasVerticalSeam(lastFunnel, row)).toBe(true);
    expect(gapsFromRow(row).includes(center)).toBe(true);
  });
});
