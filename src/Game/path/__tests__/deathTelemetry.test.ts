import { runProgressionTuning } from '@/config/runProgression';
import {
  appendDeathHistory,
  applyAttemptMemoryToOpeningWeights,
  captureDeathContext,
  deathGeneratorTagFromBranchKey,
} from '@/Game/path/deathTelemetry';
import type { DeathContext } from '@/Game/path/runBlueprint';

describe('deathGeneratorTagFromBranchKey', () => {
  it('maps pinball branch keys', () => {
    expect(deathGeneratorTagFromBranchKey('directed|climax|pinball')).toBe('pinball');
  });

  it('maps multipath branch keys', () => {
    expect(deathGeneratorTagFromBranchKey('directed|flow|multipathProc')).toBe('multipath');
  });

  it('maps chicane branch keys', () => {
    expect(deathGeneratorTagFromBranchKey('base|flow|chicane')).toBe('chicane');
  });

  it('returns unknown for empty keys', () => {
    expect(deathGeneratorTagFromBranchKey('')).toBe('unknown');
  });
});

describe('appendDeathHistory', () => {
  const entry = (score: number): DeathContext => ({
    phase: 'flow',
    generator: 'chute',
    score,
  });

  it('caps history at DEATH_HISTORY_CAP', () => {
    let history: DeathContext[] = [];
    for (let i = 0; i < 5; i++) {
      history = appendDeathHistory(history, entry(i), runProgressionTuning.DEATH_HISTORY_CAP);
    }
    expect(history).toHaveLength(3);
    expect(history.map((d) => d.score)).toEqual([2, 3, 4]);
  });
});

describe('captureDeathContext', () => {
  it('derives phase from total rows at flow start', () => {
    const ctx = captureDeathContext({
      totalRowsGenerated: 0,
      spawnDiagBranchKey: 'directed|flow|multipathProc',
      finalScore: 42,
    });
    expect(ctx.phase).toBe('flow');
    expect(ctx.generator).toBe('multipath');
    expect(ctx.score).toBe(42);
  });
});

describe('applyAttemptMemoryToOpeningWeights', () => {
  const pool = [
    'warmChute',
    'fastChicane',
    'leftBias',
    'rightBias',
    'breather',
  ] as const;
  const base = [3, 2, 2, 2, 2];

  it('does nothing with fewer than cap deaths', () => {
    const history: DeathContext[] = [
      { phase: 'flow', generator: 'chute', score: 10 },
      { phase: 'flow', generator: 'chute', score: 20 },
    ];
    expect(
      applyAttemptMemoryToOpeningWeights(pool, base, history)
    ).toEqual(base);
  });

  it('boosts breather when all last 3 deaths are low score', () => {
    const history: DeathContext[] = [
      { phase: 'flow', generator: 'chute', score: 50 },
      { phase: 'flow', generator: 'chute', score: 80 },
      { phase: 'flow', generator: 'chute', score: 100 },
    ];
    const adjusted = applyAttemptMemoryToOpeningWeights(pool, base, history);
    const breatherIdx = pool.indexOf('breather');
    expect(adjusted[breatherIdx]).toBe(
      base[breatherIdx]! * runProgressionTuning.ATTEMPT_MEMORY_BREATHER_WEIGHT_MULTIPLIER
    );
    expect(adjusted[0]).toBe(base[0]);
  });

  it('does not boost breather when breather not in pool', () => {
    const smallPool = ['warmChute', 'leftBias'] as const;
    const smallBase = [3, 2];
    const history: DeathContext[] = [
      { phase: 'flow', generator: 'chute', score: 10 },
      { phase: 'flow', generator: 'chute', score: 20 },
      { phase: 'flow', generator: 'chute', score: 30 },
    ];
    expect(
      applyAttemptMemoryToOpeningWeights(smallPool, smallBase, history)
    ).toEqual(smallBase);
  });
});
