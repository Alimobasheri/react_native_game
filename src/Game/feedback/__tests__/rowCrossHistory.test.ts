import { topologyFromGaps } from '../gapTopology';
import {
  appendRowCrossSnapshot,
  shouldSkipSteerOnIdenticalGaps,
} from '../rowCrossHistory';
import type { RowCrossSnapshot } from '../skillFeedbackTypes';
import { defaultRowCrossContact } from '../skillFeedbackTypes';

const COLS = 8;

const row = (
  gaps: number[],
  swimmerCol = gaps[Math.floor(gaps.length / 2)] ?? 0
): RowCrossSnapshot => ({
  rawGaps: gaps,
  topology: topologyFromGaps(gaps, COLS),
  branchKey: '',
  crossedAtMs: 0,
  swimmerCol,
  swimmerColFrac: swimmerCol,
  cleanCross: true,
  crossQualified: true,
  contact: defaultRowCrossContact(),
});

describe('appendRowCrossSnapshot', () => {
  it('dedupes identical consecutive raw gaps (runway dup)', () => {
    const h = appendRowCrossSnapshot([], row([2, 3, 4]), 8);
    const h2 = appendRowCrossSnapshot(h, row([2, 3, 4], 6), 8);
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

  it('returns true when raw gaps match but swimmer column moved', () => {
    const history = [row([2, 3, 4, 5, 6], 2)];
    expect(
      shouldSkipSteerOnIdenticalGaps(history, [2, 3, 4, 5, 6], true)
    ).toBe(true);
  });
});
