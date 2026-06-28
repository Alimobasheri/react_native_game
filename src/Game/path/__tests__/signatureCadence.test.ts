import { getPacingCycleState } from '@/Game/path/pacingDirector';
import { resolvePacingRunContext } from '@/Game/path/cyclePersonality';
import {
  createFixedFirstRunBlueprint,
  rollRunBlueprint,
} from '@/Game/path/runBlueprint';
import {
  isSignatureBeatCycle,
  macroCycleIndex1Based,
  resolveSignaturePattern,
  signaturePinballRowBudget,
} from '@/Game/path/signatureCadence';

describe('macroCycleIndex1Based', () => {
  it('returns 1 at run start', () => {
    expect(macroCycleIndex1Based(0)).toBe(1);
  });

  it('increments after first full cycle', () => {
    const L = getPacingCycleState(0).cycleTotalRows;
    expect(macroCycleIndex1Based(L)).toBe(2);
    expect(macroCycleIndex1Based(L + 1)).toBe(2);
  });
});

describe('isSignatureBeatCycle', () => {
  const bp = createFixedFirstRunBlueprint(42, 1);

  it('cycle 1 is not a beat', () => {
    expect(isSignatureBeatCycle(bp, 1)).toBe(false);
  });

  it('cycles 2 and 4 are beats with defaults', () => {
    expect(isSignatureBeatCycle(bp, 2)).toBe(true);
    expect(isSignatureBeatCycle(bp, 3)).toBe(false);
    expect(isSignatureBeatCycle(bp, 4)).toBe(true);
  });
});

describe('resolveSignaturePattern', () => {
  it('returns pinballHop on beat cycles for fixed first-run blueprint', () => {
    const bp = createFixedFirstRunBlueprint(42, 1);
    expect(resolveSignaturePattern(bp, 2)).toBe('pinballHop');
    expect(resolveSignaturePattern(bp, 1)).toBeNull();
  });

  it('is deterministic for same runSeed and cycle', () => {
    const bp = rollRunBlueprint({ sessionSeed: 12345, runAttemptIndex: 3 });
    const a = resolveSignaturePattern(bp, 2);
    const b = resolveSignaturePattern(bp, 2);
    expect(a).toBe(b);
  });

  it('uses blueprint runSeed on attempt #1 pacing context', () => {
    const bp = createFixedFirstRunBlueprint(99, 1);
    const ctx = resolvePacingRunContext(bp, 1);
    expect(ctx?.runSeed).toBe(0);
    expect(ctx?.blueprintRunSeed).toBe(bp.runSeed);
    const fromCtx = resolveSignaturePattern(
      {
        runSeed: ctx!.blueprintRunSeed,
        signaturePatternPool: ctx!.signaturePatternPool,
        firstSignatureAtCycle: ctx!.firstSignatureAtCycle,
        signatureEveryNCycles: ctx!.signatureEveryNCycles,
      },
      2
    );
    expect(fromCtx).toBe('pinballHop');
  });
});

describe('signaturePinballRowBudget', () => {
  it('is 4 cycles × (2 drift + 2 chute + 1 hop) = 20', () => {
    expect(signaturePinballRowBudget()).toBe(20);
  });
});
