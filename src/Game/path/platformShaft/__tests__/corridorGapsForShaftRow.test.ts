import {
  corridorGapsForShaftRow,
  pressWallCol,
} from '@/Game/path/platformShaft/primitives';
import { TEST_COLS } from '@/Game/path/__tests__/testGrid';

describe('corridorGapsForShaftRow', () => {
  it('right center=1 width=3 fills pocket — no orphan block between corridor and steel', () => {
    const { gaps, blocks } = corridorGapsForShaftRow(TEST_COLS, 3, 1, 'right');
    const wall = pressWallCol(TEST_COLS, 'right');
    expect(wall).toBe(4);
    expect(gaps).toEqual([1, 2, 3, 4]);
    expect(gaps).toContain(wall);
    expect(blocks).toEqual([0, 5]);
    expect(blocks).not.toContain(3);
    expect(blocks).not.toContain(wall);
  });

  it('left center=3 width=3 keeps steel lane open and outer walls blocked', () => {
    const { gaps, blocks } = corridorGapsForShaftRow(TEST_COLS, 3, 3, 'left');
    const wall = pressWallCol(TEST_COLS, 'left');
    expect(wall).toBe(1);
    expect(gaps).toEqual([1, 2, 3, 4]);
    expect(gaps).toContain(wall);
    expect(blocks).toEqual([0, 5]);
    expect(blocks).not.toContain(wall);
  });

  it('never leaves outer cols 0 / columns-1 as playable gaps', () => {
    for (const side of ['left', 'right'] as const) {
      for (const center of [1, 3]) {
        const { gaps } = corridorGapsForShaftRow(TEST_COLS, 3, center, side);
        expect(gaps).not.toContain(0);
        expect(gaps).not.toContain(TEST_COLS - 1);
      }
    }
  });
});
