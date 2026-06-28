import {
  assignBlueprintForNewRun,
  createFixedFirstRunBlueprint,
  DEFAULT_UNLOCKED_POOLS,
  rollRunBlueprint,
} from '@/Game/path/runBlueprint';
import { runProgressionTuning } from '@/config/runProgression';
import { resolveUnlockedPools } from '@/Game/path/runProgressionPools';
import type { DeathContext } from '@/Game/path/runBlueprint';

describe('createFixedFirstRunBlueprint', () => {
  it('returns warmChute, flowHeavy, mixed for any session seed', () => {
    const bp = createFixedFirstRunBlueprint(42);
    expect(bp.runAttemptIndex).toBe(1);
    expect(bp.openingArchetype).toBe('warmChute');
    expect(bp.cyclePersonality).toBe('flowHeavy');
    expect(bp.climaxPreference).toBe('mixed');
    expect(bp.signaturePatternPool).toEqual(['pinballHop']);
    expect(bp.firstSignatureAtCycle).toBe(2);
    expect(bp.signatureEveryNCycles).toBe(2);
  });

  it('derives runSeed deterministically from session seed and attempt', () => {
    const a = createFixedFirstRunBlueprint(99, 1);
    const b = createFixedFirstRunBlueprint(99, 1);
    const c = createFixedFirstRunBlueprint(100, 1);
    expect(a.runSeed).toBe(b.runSeed);
    expect(a.runSeed).not.toBe(c.runSeed);
  });
});

describe('rollRunBlueprint', () => {
  it('is deterministic for same sessionSeed and attemptIndex', () => {
    const a = rollRunBlueprint({ sessionSeed: 12345, runAttemptIndex: 2, bestScore: 500 });
    const b = rollRunBlueprint({ sessionSeed: 12345, runAttemptIndex: 2, bestScore: 500 });
    expect(a).toEqual(b);
  });

  it('embeds runAttemptIndex on blueprint', () => {
    const bp = rollRunBlueprint({ sessionSeed: 1, runAttemptIndex: 5, bestScore: 0 });
    expect(bp.runAttemptIndex).toBe(5);
  });

  it('rolls openingArchetype within default unlocked pool at score 0', () => {
    for (let attempt = 2; attempt <= 50; attempt++) {
      const bp = rollRunBlueprint({ sessionSeed: 777, runAttemptIndex: attempt, bestScore: 0 });
      expect(DEFAULT_UNLOCKED_POOLS.openingArchetypes).toContain(bp.openingArchetype);
    }
  });

  it('can roll milestone openings when best score unlocks them', () => {
    const unlocked = resolveUnlockedPools(1000);
    let sawBreather = false;
    let sawTensionEarly = false;
    for (let attempt = 2; attempt <= 200; attempt++) {
      const bp = rollRunBlueprint({
        sessionSeed: 0xabc,
        runAttemptIndex: attempt,
        bestScore: 1000,
        unlockedPools: unlocked,
      });
      if (bp.openingArchetype === 'breather') sawBreather = true;
      if (bp.cyclePersonality === 'tensionEarly') sawTensionEarly = true;
    }
    expect(sawBreather).toBe(true);
    expect(sawTensionEarly).toBe(true);
  });

  it('produces different runSeeds for different attempt indices', () => {
    const bp2 = rollRunBlueprint({ sessionSeed: 555, runAttemptIndex: 2, bestScore: 0 });
    const bp3 = rollRunBlueprint({ sessionSeed: 555, runAttemptIndex: 3, bestScore: 0 });
    expect(bp2.runSeed).not.toBe(bp3.runSeed);
  });

  it('attempt memory breather boost changes roll vs base weights', () => {
    const unlocked = resolveUnlockedPools(700);
    const lowDeaths: DeathContext[] = [
      { phase: 'flow', generator: 'chute', score: 50 },
      { phase: 'flow', generator: 'chute', score: 60 },
      { phase: 'flow', generator: 'chute', score: 70 },
    ];
    let withMemory = 0;
    let without = 0;
    for (let attempt = 2; attempt <= 80; attempt++) {
      const boosted = rollRunBlueprint({
        sessionSeed: 999,
        runAttemptIndex: attempt,
        bestScore: 700,
        deathHistory: lowDeaths,
        unlockedPools: unlocked,
      });
      const plain = rollRunBlueprint({
        sessionSeed: 999,
        runAttemptIndex: attempt,
        bestScore: 700,
        unlockedPools: unlocked,
      });
      if (boosted.openingArchetype === 'breather') withMemory++;
      if (plain.openingArchetype === 'breather') without++;
    }
    expect(withMemory).toBeGreaterThan(without);
  });

  it('attempt 1 via roll differs from fixed first-run only when rolled fields diverge', () => {
    const fixed = createFixedFirstRunBlueprint(42, 1);
    const rolled = rollRunBlueprint({ sessionSeed: 42, runAttemptIndex: 1, bestScore: 0 });
    expect(rolled.runSeed).toBe(fixed.runSeed);
  });
});

describe('assignBlueprintForNewRun', () => {
  it('begin mode from attempt 0 assigns fixed first-run blueprint', () => {
    const result = assignBlueprintForNewRun(
      { sessionSeed: 42, runAttemptIndex: 0, bestScore: 5000 },
      'begin'
    );
    expect(result.runAttemptIndex).toBe(1);
    expect(result.runBlueprint).toEqual(createFixedFirstRunBlueprint(42, 1));
  });

  it('begin mode from attempt >= 1 increments and rolls with milestones', () => {
    const result = assignBlueprintForNewRun(
      { sessionSeed: 42, runAttemptIndex: 1, bestScore: 1000 },
      'begin'
    );
    expect(result.runAttemptIndex).toBe(2);
    expect(result.runBlueprint).toEqual(
      rollRunBlueprint({
        sessionSeed: 42,
        runAttemptIndex: 2,
        bestScore: 1000,
        deathHistory: [],
        unlockedPools: resolveUnlockedPools(1000),
      })
    );
  });

  it('retry mode always increments and rolls', () => {
    const result = assignBlueprintForNewRun(
      { sessionSeed: 99, runAttemptIndex: 1, bestScore: 0 },
      'retry'
    );
    expect(result.runAttemptIndex).toBe(2);
    expect(result.runBlueprint).toEqual(
      rollRunBlueprint({
        sessionSeed: 99,
        runAttemptIndex: 2,
        bestScore: 0,
        deathHistory: [],
        unlockedPools: resolveUnlockedPools(0),
      })
    );
  });

  it('retry passes death history into roll', () => {
    const deathHistory: DeathContext[] = [
      { phase: 'flow', generator: 'chute', score: 10 },
    ];
    const result = assignBlueprintForNewRun(
      { sessionSeed: 1, runAttemptIndex: 2, bestScore: 700, deathHistory },
      'retry'
    );
    expect(result.runBlueprint).toEqual(
      rollRunBlueprint({
        sessionSeed: 1,
        runAttemptIndex: 3,
        bestScore: 700,
        deathHistory,
        unlockedPools: resolveUnlockedPools(700),
      })
    );
  });

  it('retry from attempt 2 goes to 3', () => {
    const result = assignBlueprintForNewRun(
      { sessionSeed: 99, runAttemptIndex: 2, bestScore: 0 },
      'retry'
    );
    expect(result.runAttemptIndex).toBe(3);
  });
});

describe('first run regression', () => {
  it('attempt 1 fixed blueprint matches createFixedFirstRunBlueprint for same sessionSeed', () => {
    const sessionSeed = 0xdeadbeef;
    const viaAssign = assignBlueprintForNewRun(
      { sessionSeed, runAttemptIndex: 0, bestScore: 9999 },
      'begin'
    );
    expect(viaAssign.runBlueprint).toEqual(createFixedFirstRunBlueprint(sessionSeed, 1));
  });
});

describe('milestone thresholds are configurable', () => {
  it('uses runProgressionTuning constants', () => {
    expect(runProgressionTuning.MILESTONE_EARLY_FORK_BEST_SCORE).toBe(300);
    expect(runProgressionTuning.MILESTONE_BREATHER_BEST_SCORE).toBe(700);
    expect(runProgressionTuning.MILESTONE_TENSION_EARLY_BEST_SCORE).toBe(1000);
  });
});
