import {
  pickSwimmerBlockImageStable,
  SWIMMER_BLOCK_VARIANT_WEIGHTS,
} from '../swimmerBlocks';
import { intMod, mixU32 } from '@/Game/path/deterministicMix';

function rollForPosition(x: number, y: number): number {
  return intMod(mixU32(Math.round(x * 1000), Math.round(y * 1000), 713), 100);
}

describe('pickSwimmerBlockImageStable', () => {
  it('uses configured variant weights', () => {
    expect(SWIMMER_BLOCK_VARIANT_WEIGHTS).toEqual([58, 6, 12, 24]);
  });

  it('respects cumulative thresholds', () => {
    const cases: Array<[number, string]> = [
      [0, 'block_var_0'],
      [57, 'block_var_0'],
      [58, 'block_var_1'],
      [63, 'block_var_1'],
      [64, 'block_var_2'],
      [75, 'block_var_2'],
      [76, 'block_var_3'],
      [99, 'block_var_3'],
    ];

    for (const [roll, expected] of cases) {
      let found = false;
      for (let x = 0; x < 500 && !found; x++) {
        for (let y = 0; y < 500 && !found; y++) {
          if (rollForPosition(x, y) !== roll) continue;
          expect(pickSwimmerBlockImageStable(x, y)).toBe(expected);
          found = true;
        }
      }
      expect(found).toBe(true);
    }
  });
});
