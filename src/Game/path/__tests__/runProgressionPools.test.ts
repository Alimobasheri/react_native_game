import { runProgressionTuning } from '@/config/runProgression';
import {
  buildOpeningWeights,
  buildPersonalityWeights,
  resolveUnlockedPools,
} from '@/Game/path/runProgressionPools';

describe('resolveUnlockedPools', () => {
  it('returns default openings and flowHeavy at score 0', () => {
    const pools = resolveUnlockedPools(0);
    expect(pools.openingArchetypes).toEqual([
      'warmChute',
      'fastChicane',
      'leftBias',
      'rightBias',
    ]);
    expect(pools.cyclePersonalities).toEqual(['flowHeavy']);
    expect(pools.signaturePatterns).toEqual(['pinballHop']);
  });

  it('unlocks earlyFork at milestone score', () => {
    const pools = resolveUnlockedPools(runProgressionTuning.MILESTONE_EARLY_FORK_BEST_SCORE);
    expect(pools.openingArchetypes).toContain('earlyFork');
    expect(pools.openingArchetypes).not.toContain('breather');
  });

  it('unlocks breather at 700+ but not below', () => {
    expect(resolveUnlockedPools(699).openingArchetypes).not.toContain('breather');
    expect(resolveUnlockedPools(700).openingArchetypes).toContain('breather');
  });

  it('unlocks tensionEarly at 1000+', () => {
    expect(resolveUnlockedPools(999).cyclePersonalities).toEqual(['flowHeavy']);
    expect(resolveUnlockedPools(1000).cyclePersonalities).toContain('tensionEarly');
  });

  it('keeps signature pool pinballHop only', () => {
    const pools = resolveUnlockedPools(10000);
    expect(pools.signaturePatterns).toEqual(['pinballHop']);
  });
});

describe('buildOpeningWeights', () => {
  it('aligns weight count with pool length', () => {
    const pool = resolveUnlockedPools(700).openingArchetypes;
    expect(buildOpeningWeights(pool)).toHaveLength(pool.length);
  });
});

describe('buildPersonalityWeights', () => {
  it('aligns weight count with pool length', () => {
    const pool = resolveUnlockedPools(1000).cyclePersonalities;
    expect(buildPersonalityWeights(pool)).toHaveLength(pool.length);
  });
});
