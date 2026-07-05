import { LAYOUT_CONSTANTS } from '@/Layout';
import { composePressIntroShaft } from '@/Game/path/platformShaft/composePressIntroShaft';
import {
  effectiveGapsAtFullPress,
  hazardForRowIndex,
  minGapWidthCols,
} from '@/Game/path/platformShaft/primitives';
import { TEST_COLS } from '@/Game/path/__tests__/testGrid';

describe('composePressIntroShaft', () => {
  const columns = TEST_COLS;

  it('uses 6-column grid', () => {
    expect(columns).toBe(LAYOUT_CONSTANTS.COLUMNS);
    expect(columns).toBe(6);
  });

  it('produces intro shaft with rows >= 33 at App difficulty and >= 34 at easy', () => {
    const appResult = composePressIntroShaft({
      seed: 42,
      difficulty01: 0.4,
      columns,
    });
    expect(appResult.rows.length).toBeGreaterThanOrEqual(33);
    expect(appResult.hazards.length).toBeGreaterThanOrEqual(5);
    expect(appResult.meta.recipeId).toBe('composePressIntroShaft');

    const easyResult = composePressIntroShaft({
      seed: 42,
      difficulty01: 0,
      columns,
    });
    expect(easyResult.rows.length).toBeGreaterThanOrEqual(34);
  });

  it('all hazards have finite animStartRow at App difficulty', () => {
    const result = composePressIntroShaft({ seed: 42, difficulty01: 0.4, columns: TEST_COLS });
    for (let i = 0; i < result.hazards.length; i++) {
      expect(Number.isFinite(result.hazards[i].params.animStartRow)).toBe(true);
    }
  });

  it('has 1-col minimum gap at full press on slab rows', () => {
    const result = composePressIntroShaft({
      seed: 42,
      difficulty01: 0.4,
      columns,
    });
    let minGap = Number.POSITIVE_INFINITY;
    for (let rowIndex = 0; rowIndex < result.rows.length; rowIndex++) {
      const hazard = hazardForRowIndex(result.hazards, rowIndex);
      if (!hazard) continue;
      const baseGaps = result.rows[rowIndex].gaps;
      const pressed = effectiveGapsAtFullPress(baseGaps, hazard, rowIndex, columns);
      const gapW = minGapWidthCols(pressed);
      if (gapW > 0 && gapW < minGap) minGap = gapW;
    }
    expect(minGap).toBe(1);
  });

  it('does not emit pressCols cap warnings on default seed/difficulty', () => {
    const result = composePressIntroShaft({
      seed: 42,
      difficulty01: 0.4,
      columns,
    });
    const capped = result.harmonizerWarnings.some((w) => w.startsWith('Capped'));
    expect(capped).toBe(false);
  });
});
