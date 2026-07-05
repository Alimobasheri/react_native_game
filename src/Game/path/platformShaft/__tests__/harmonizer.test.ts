import { LAYOUT_CONSTANTS } from '@/Layout';
import {
  capPressCols,
  maxPressColsForCorridor,
  teachRecipeCappedPressCols,
  teachRecipeMaxPressCols,
} from '@/Game/path/platformShaft/harmonizer';
import { platformShaftTuning } from '@/config/platformShaftTuning';
import { TEST_COLS } from '@/Game/path/__tests__/testGrid';

describe('platformShaft harmonizer', () => {
  it('uses 6-column TEST_COLS from Layout.ts', () => {
    expect(TEST_COLS).toBe(LAYOUT_CONSTANTS.COLUMNS);
    expect(TEST_COLS).toBe(6);
  });

  it('caps pressCols 2 → 1 on gap width 2 with min residual 1', () => {
    expect(capPressCols(2, 2, 0, 1)).toBe(1);
  });

  it('allows pressCols 2 on gap width 3', () => {
    expect(capPressCols(3, 2, 0, 1)).toBe(2);
  });

  it('returns maxPressCols 0 when gap width 1 at rest', () => {
    expect(maxPressColsForCorridor(1, 0, 1)).toBe(0);
  });

  it('returns maxPressCols 0 when opposite inset eats corridor on width 2', () => {
    expect(maxPressColsForCorridor(2, 1, 1)).toBe(0);
  });

  it('mirrors teach recipe: default press 1 stays 1; request 2 caps to 1', () => {
    expect(teachRecipeMaxPressCols()).toBe(1);
    expect(teachRecipeCappedPressCols(platformShaftTuning.TEACH_PRESS_COLS)).toBe(1);
    expect(teachRecipeCappedPressCols(2)).toBe(1);
  });
});
