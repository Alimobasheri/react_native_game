import {
  CHICANE_DEFAULT_BLOCK_N,
  FLOW_CHUTE_ROWS_BEFORE_CHICANE,
  clampGapCenter,
  createChicaneStateFromEntryCenter,
  extractTripleGapCenter,
  flowChicaneNextRow,
  flowChuteNextRow,
  flowGapCenterBounds,
} from '@/Game/path/flowGenerators';
import { validateSeam } from '@/Game/path/pacingDirector';
import { rowFromGaps } from '@/Game/path/swimmerGrid';
import { TEST_COLS } from '@/Game/path/__tests__/testGrid';

describe('flowChuteNextRow', () => {
  it('seeds at optional seedCenter on first row', () => {
    const row = flowChuteNextRow(null, TEST_COLS, 2);
    expect(extractTripleGapCenter(row, TEST_COLS)).toBe(2);
  });

  it('produces zero horizontal shift across 20 iterations when chained', () => {
    let row = flowChuteNextRow(null, TEST_COLS);
    const centers: number[] = [];
    for (let i = 0; i < 20; i++) {
      centers.push(extractTripleGapCenter(row, TEST_COLS)!);
      row = flowChuteNextRow(row, TEST_COLS);
    }
    expect(new Set(centers).size).toBe(1);
  });
});

describe('flowChicaneNextRow', () => {
  it('keeps gap center within flowGapCenterBounds over many shifts', () => {
    const { lo, hi } = flowGapCenterBounds(TEST_COLS);
    let state = createChicaneStateFromEntryCenter(Math.floor((lo + hi) / 2), TEST_COLS, 1);
    for (let i = 0; i < 200; i++) {
      const { row, state: next } = flowChicaneNextRow(null, state, TEST_COLS, CHICANE_DEFAULT_BLOCK_N);
      state = next;
      const c = extractTripleGapCenter(row, TEST_COLS);
      expect(c).not.toBeNull();
      expect(c!).toBeGreaterThanOrEqual(lo);
      expect(c!).toBeLessThanOrEqual(hi);
    }
  });
});

describe('Chute → Chicane seam', () => {
  it('each generated row validates seam vs previous row', () => {
    let prev = flowChuteNextRow(null, TEST_COLS);
    for (let i = 0; i < FLOW_CHUTE_ROWS_BEFORE_CHICANE - 1; i++) {
      const row = flowChuteNextRow(prev, TEST_COLS);
      expect(validateSeam(prev, row)).toBe(true);
      prev = row;
    }

    const entry = extractTripleGapCenter(prev, TEST_COLS)!;
    let state = createChicaneStateFromEntryCenter(entry, TEST_COLS, 1);
    for (let j = 0; j < 40; j++) {
      const { row: r2, state: s2 } = flowChicaneNextRow(prev, state, TEST_COLS, CHICANE_DEFAULT_BLOCK_N);
      state = s2;
      expect(validateSeam(prev, r2)).toBe(true);
      prev = r2;
    }
  });
});

describe('extractTripleGapCenter', () => {
  it('reads center of a 3-wide run', () => {
    const r = rowFromGaps([3, 4, 5], TEST_COLS);
    expect(extractTripleGapCenter(r, TEST_COLS)).toBe(4);
  });
});

describe('clampGapCenter', () => {
  it('clamps to playable bounds', () => {
    const { lo, hi } = flowGapCenterBounds(TEST_COLS);
    expect(clampGapCenter(0, TEST_COLS)).toBe(lo);
    expect(clampGapCenter(20, TEST_COLS)).toBe(hi);
  });
});
