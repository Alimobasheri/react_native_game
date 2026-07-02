import {
  appendDiagRing,
  compactRowSnapshot,
  skillFeedbackDiagTuning,
  type SkillFeedbackDiagEntry,
} from '@/Game/debug/skillFeedbackDiag';
import {
  defaultRowCrossContact,
  type RowCrossSnapshot,
} from '@/Game/feedback/skillFeedbackTypes';
import { laneClusterTopology } from '@/Game/feedback/gapTopology';

const makeSnapshot = (overrides: Partial<RowCrossSnapshot> = {}): RowCrossSnapshot => {
  const gaps = [2, 5];
  return {
    rawGaps: gaps,
    topology: laneClusterTopology(gaps, 9),
    branchKey: 'directed|tension|funnel',
    crossedAtMs: 1000,
    swimmerCol: 3,
    swimmerColFrac: 3.2,
    cleanCross: true,
    contact: defaultRowCrossContact(),
    crossQualified: true,
    ...overrides,
  };
};

describe('appendDiagRing', () => {
  it('appends entries in order', () => {
    const ring = appendDiagRing([], {
      kind: 'fired',
      tMs: 1,
      copies: ['NICE!'],
      bonuses: [10],
      totalBonus: 10,
    });
    expect(ring.length).toBe(1);
    expect(ring[0]?.kind).toBe('fired');
  });

  it('drops oldest entries beyond RING_SIZE', () => {
    let ring: SkillFeedbackDiagEntry[] = [];
    for (let i = 0; i < skillFeedbackDiagTuning.RING_SIZE + 5; i++) {
      ring = appendDiagRing(ring, {
        kind: 'fired',
        tMs: i,
        copies: [`${i}`],
        bonuses: [i],
        totalBonus: i,
      });
    }
    expect(ring.length).toBe(skillFeedbackDiagTuning.RING_SIZE);
    expect(ring[0]?.kind).toBe('fired');
    if (ring[0]?.kind === 'fired') {
      expect(ring[0].copies[0]).toBe('5');
    }
  });
});

describe('compactRowSnapshot', () => {
  it('keeps path fields and omits topology object', () => {
    const compact = compactRowSnapshot(makeSnapshot());
    expect(compact.branchKey).toBe('directed|tension|funnel');
    expect(compact.gaps).toEqual([2, 5]);
    expect(compact.swimmerColFrac).toBe(3.2);
    expect(compact.crossQualified).toBe(true);
    expect((compact as { topology?: unknown }).topology).toBeUndefined();
  });
});
