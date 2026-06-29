import { skillFeedbackTuning } from '@/config/skillFeedback';
import { topologyFromGaps } from '../gapTopology';
import {
  appendRowCrossSnapshot,
  shouldSkipSteerOnIdenticalGaps,
} from '../rowCrossHistory';
import type { RowCrossSnapshot } from '../skillFeedbackTypes';

const COLS = 8;

const row = (gaps: number[]): RowCrossSnapshot => ({
  topology: topologyFromGaps(gaps, COLS),
  branchKey: '',
  crossedAtMs: 0,
  swimmerCol: gaps[0],
  cleanCross: true,
});

describe('appendRowCrossSnapshot', () => {
  it('dedupes identical consecutive gaps (runway dup)', () => {
    const h = appendRowCrossSnapshot([], row([2, 3, 4]), 8);
    const h2 = appendRowCrossSnapshot(h, row([2, 3, 4]), 8);
    expect(h2.length).toBe(1);
  });

  it('appends when gaps change', () => {
    const h = appendRowCrossSnapshot([], row([2]), 8);
    const h2 = appendRowCrossSnapshot(h, row([4, 5]), 8);
    expect(h2.length).toBe(2);
  });

  it('evicts oldest past max size', () => {
    let h: RowCrossSnapshot[] = [];
    for (let i = 0; i < 10; i++) {
      h = appendRowCrossSnapshot(h, row([i % 8]), 8);
    }
    expect(h.length).toBe(8);
  });
});

describe('shouldSkipSteerOnIdenticalGaps', () => {
  it('returns true for runway dup cross', () => {
    const history = [row([2, 3, 4])];
    expect(
      shouldSkipSteerOnIdenticalGaps(history, [2, 3, 4], true)
    ).toBe(true);
  });
});
