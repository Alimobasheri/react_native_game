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
import { rowFromGaps } from '@/Game/path/swimmerGrid';
import { validateSeam } from '@/Game/path/pacingDirector';
import type { SwimmerRow } from '@/Game/path/swimmerGrid';

const COLS = 15;

describe('flowChuteNextRow', () => {
  it('produces zero horizontal shift across 20 iterations when chained', () => {
    let row = flowChuteNextRow(null, COLS);
    const centers: number[] = [];
    for (let i = 0; i < 20; i++) {
      centers.push(extractTripleGapCenter(row, COLS)!);
      row = flowChuteNextRow(row, COLS);
    }
    expect(new Set(centers).size).toBe(1);
  });
});

describe('flowChicaneNextRow', () => {
  it('keeps gap center within [1, 13] for 15 columns over many shifts', () => {
    const { lo, hi } = flowGapCenterBounds(COLS);
    let state = createChicaneStateFromEntryCenter(7, COLS, 1);
    for (let i = 0; i < 200; i++) {
      const { row, state: next } = flowChicaneNextRow(null, state, COLS, CHICANE_DEFAULT_BLOCK_N);
      state = next;
      const c = extractTripleGapCenter(row, COLS);
      expect(c).not.toBeNull();
      expect(c!).toBeGreaterThanOrEqual(lo);
      expect(c!).toBeLessThanOrEqual(hi);
    }
  });
});

describe('Chute → Chicane seam', () => {
  it('each generated row validates seam vs previous row', () => {
    let prev = flowChuteNextRow(null, COLS);
    for (let i = 0; i < FLOW_CHUTE_ROWS_BEFORE_CHICANE - 1; i++) {
      const row = flowChuteNextRow(prev, COLS);
      expect(validateSeam(prev, row)).toBe(true);
      prev = row;
    }

    const entry = extractTripleGapCenter(prev, COLS)!;
    let state = createChicaneStateFromEntryCenter(entry, COLS, 1);
    for (let j = 0; j < 40; j++) {
      const { row: r2, state: s2 } = flowChicaneNextRow(prev, state, COLS, CHICANE_DEFAULT_BLOCK_N);
      state = s2;
      expect(validateSeam(prev, r2)).toBe(true);
      prev = r2;
    }
  });
});

describe('extractTripleGapCenter', () => {
  it('reads center of a 3-wide run', () => {
    const r = rowFromGaps([4, 5, 6], COLS);
    expect(extractTripleGapCenter(r, COLS)).toBe(5);
  });
});

describe('clampGapCenter', () => {
  it('clamps to playable bounds', () => {
    expect(clampGapCenter(0, COLS)).toBe(1);
    expect(clampGapCenter(20, COLS)).toBe(13);
  });
});
