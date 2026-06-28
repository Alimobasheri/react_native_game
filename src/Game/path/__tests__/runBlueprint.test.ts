import {
  assignBlueprintForNewRun,
  createFixedFirstRunBlueprint,
  DEFAULT_UNLOCKED_POOLS,
  rollRunBlueprint,
} from '@/Game/path/runBlueprint';

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
    const a = rollRunBlueprint({ sessionSeed: 12345, runAttemptIndex: 2 });
    const b = rollRunBlueprint({ sessionSeed: 12345, runAttemptIndex: 2 });
    expect(a).toEqual(b);
  });

  it('embeds runAttemptIndex on blueprint', () => {
    const bp = rollRunBlueprint({ sessionSeed: 1, runAttemptIndex: 5 });
    expect(bp.runAttemptIndex).toBe(5);
  });

  it('rolls openingArchetype within default unlocked pool', () => {
    for (let attempt = 2; attempt <= 50; attempt++) {
      const bp = rollRunBlueprint({ sessionSeed: 777, runAttemptIndex: attempt });
      expect(DEFAULT_UNLOCKED_POOLS.openingArchetypes).toContain(bp.openingArchetype);
    }
  });

  it('produces different runSeeds for different attempt indices', () => {
    const bp2 = rollRunBlueprint({ sessionSeed: 555, runAttemptIndex: 2 });
    const bp3 = rollRunBlueprint({ sessionSeed: 555, runAttemptIndex: 3 });
    expect(bp2.runSeed).not.toBe(bp3.runSeed);
  });

  it('attempt 1 via roll differs from fixed first-run only when rolled fields diverge', () => {
    const fixed = createFixedFirstRunBlueprint(42, 1);
    const rolled = rollRunBlueprint({ sessionSeed: 42, runAttemptIndex: 1 });
    expect(rolled.runSeed).toBe(fixed.runSeed);
  });
});

describe('assignBlueprintForNewRun', () => {
  it('begin mode from attempt 0 assigns fixed first-run blueprint', () => {
    const result = assignBlueprintForNewRun({ sessionSeed: 42, runAttemptIndex: 0 }, 'begin');
    expect(result.runAttemptIndex).toBe(1);
    expect(result.runBlueprint).toEqual(createFixedFirstRunBlueprint(42, 1));
  });

  it('begin mode from attempt >= 1 increments and rolls', () => {
    const result = assignBlueprintForNewRun({ sessionSeed: 42, runAttemptIndex: 1 }, 'begin');
    expect(result.runAttemptIndex).toBe(2);
    expect(result.runBlueprint).toEqual(
      rollRunBlueprint({ sessionSeed: 42, runAttemptIndex: 2 })
    );
  });

  it('retry mode always increments and rolls', () => {
    const result = assignBlueprintForNewRun({ sessionSeed: 99, runAttemptIndex: 1 }, 'retry');
    expect(result.runAttemptIndex).toBe(2);
    expect(result.runBlueprint).toEqual(
      rollRunBlueprint({ sessionSeed: 99, runAttemptIndex: 2 })
    );
  });

  it('retry from attempt 2 goes to 3', () => {
    const result = assignBlueprintForNewRun({ sessionSeed: 99, runAttemptIndex: 2 }, 'retry');
    expect(result.runAttemptIndex).toBe(3);
  });
});

describe('first run regression', () => {
  it('attempt 1 fixed blueprint matches createFixedFirstRunBlueprint for same sessionSeed', () => {
    const sessionSeed = 0xdeadbeef;
    const viaAssign = assignBlueprintForNewRun(
      { sessionSeed, runAttemptIndex: 0 },
      'begin'
    );
    expect(viaAssign.runBlueprint).toEqual(createFixedFirstRunBlueprint(sessionSeed, 1));
  });
});
