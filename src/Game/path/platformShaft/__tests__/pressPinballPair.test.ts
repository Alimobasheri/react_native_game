import { LAYOUT_CONSTANTS } from '@/Layout';
import { pressPinballPair } from '@/Game/path/platformShaft/recipes/pressPinballPair';
import {
  effectiveGapsAtFullPress,
  hazardForRowIndex,
  minGapWidthCols,
} from '@/Game/path/platformShaft/primitives';
import { TEST_COLS } from '@/Game/path/__tests__/testGrid';

describe('pressPinballPair', () => {
  const columns = TEST_COLS;

  it('uses 6-column grid', () => {
    expect(columns).toBe(LAYOUT_CONSTANTS.COLUMNS);
    expect(columns).toBe(6);
  });

  it('produces pinball segment with 2 hazards and rows in 18–28 band', () => {
    const result = pressPinballPair({
      seed: 42,
      difficulty01: 0.4,
      columns,
    });
    expect(result.rows.length).toBeGreaterThanOrEqual(18);
    expect(result.rows.length).toBeLessThanOrEqual(28);
    expect(result.hazards.length).toBe(2);
    expect(result.meta.recipeId).toBe('pressPinballPair');
  });

  it('alternates press sides on hazards[0] vs hazards[1]', () => {
    const result = pressPinballPair({ seed: 42, difficulty01: 0.4, columns });
    expect(result.hazards[0].side).not.toBe(result.hazards[1].side);
  });

  it('seed flips first press side', () => {
    const a = pressPinballPair({ seed: 41, difficulty01: 0.4, columns });
    const b = pressPinballPair({ seed: 42, difficulty01: 0.4, columns });
    expect(a.hazards[0].side).not.toBe(b.hazards[0].side);
  });

  it('all hazards have animStartRow before rowStart', () => {
    const result = pressPinballPair({ seed: 42, difficulty01: 0.4, columns: TEST_COLS });
    for (let i = 0; i < result.hazards.length; i++) {
      const hz = result.hazards[i];
      expect(Number.isFinite(hz.params.animStartRow)).toBe(true);
      expect(hz.params.animStartRow!).toBeLessThanOrEqual(hz.bounds.rowStart);
    }
  });

  it('has 1-col minimum gap at full press on slab rows', () => {
    const result = pressPinballPair({
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
    const result = pressPinballPair({
      seed: 42,
      difficulty01: 0.4,
      columns,
    });
    const capped = result.harmonizerWarnings.some((w) => w.startsWith('Capped'));
    expect(capped).toBe(false);
  });
});
