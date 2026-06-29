import {
  centerDeltaCols,
  gapsEqual,
  gapsOverlap,
  laneClusterTopology,
  topologyFromGaps,
} from '../gapTopology';

const COLS = 8;

describe('topologyFromGaps', () => {
  it('computes pinhole [2]', () => {
    const t = topologyFromGaps([2], COLS);
    expect(t.width).toBe(1);
    expect(t.center).toBe(2);
    expect(t.left).toBe(2);
    expect(t.right).toBe(2);
  });

  it('computes flare [2,3,4]', () => {
    const t = topologyFromGaps([2, 3, 4], COLS);
    expect(t.width).toBe(3);
    expect(t.center).toBe(3);
    expect(t.left).toBe(2);
    expect(t.right).toBe(4);
  });

  it('computes snap [4,5]', () => {
    const t = topologyFromGaps([4, 5], COLS);
    expect(t.width).toBe(2);
    expect(t.center).toBe(4.5);
  });
});

describe('gapsOverlap', () => {
  it('detects overlap between pinhole and flare', () => {
    expect(gapsOverlap([2], [2, 3, 4])).toBe(true);
  });

  it('detects no overlap between disjoint gaps', () => {
    expect(gapsOverlap([2], [5, 6])).toBe(false);
  });
});

describe('centerDeltaCols', () => {
  it('measures snap shift from flare to [4,5]', () => {
    const flare = topologyFromGaps([2, 3, 4], COLS);
    const snap = topologyFromGaps([4, 5], COLS);
    expect(centerDeltaCols(snap, flare)).toBeCloseTo(1.5, 5);
  });
});

describe('gapsEqual', () => {
  it('treats identical runway dup gaps as equal', () => {
    expect(gapsEqual([2, 3, 4], [2, 3, 4])).toBe(true);
  });
});

describe('laneClusterTopology', () => {
  it('picks cluster nearest swimmer on paradox fork when outside gap', () => {
    const t = laneClusterTopology([1, 5, 6, 7], COLS, 4);
    expect(t.gaps).toEqual([5, 6, 7]);
  });

  it('returns full cluster when swimmer is inside gap', () => {
    const t = laneClusterTopology([1, 5, 6, 7], COLS, 6);
    expect(t.gaps).toEqual([5, 6, 7]);
    expect(t.width).toBe(3);
    expect(t.center).toBe(6);
  });

  it('keeps stable center when swimmer moves within wide chute', () => {
    const wide = [2, 3, 4, 5, 6];
    const left = laneClusterTopology(wide, COLS, 2);
    const right = laneClusterTopology(wide, COLS, 5);
    expect(left.center).toBe(right.center);
    expect(left.gaps).toEqual(wide);
  });
});
