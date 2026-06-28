/**
 * Run Blueprint — deterministic per-run identity rolls (worklet-safe).
 *
 * Phase 1: storage + lifecycle only. Generators consume blueprint in Phase 2+.
 */

import {
  DEFAULT_CLIMAX_PREFERENCES,
  DEFAULT_CYCLE_PERSONALITIES,
  DEFAULT_OPENING_ARCHETYPES,
  DEFAULT_SIGNATURE_PATTERNS,
  runProgressionTuning,
} from '@/config/runProgression';
import { applyAttemptMemoryToOpeningWeights } from '@/Game/path/deathTelemetry';
import { intMod, mixU32, unitFloatFromU32 } from '@/Game/path/deterministicMix';
import {
  buildClimaxPreferenceWeights,
  buildOpeningWeights,
  buildPersonalityWeights,
  resolveUnlockedPools,
} from '@/Game/path/runProgressionPools';

export type OpeningArchetype =
  | 'warmChute'
  | 'fastChicane'
  | 'earlyFork'
  | 'leftBias'
  | 'rightBias'
  | 'breather';

export type CyclePersonality =
  | 'flowHeavy'
  | 'tensionEarly'
  | 'climaxForward'
  | 'shortRelease';

export type ClimaxPreference = 'pinball' | 'falseWall' | 'mixed';

export type SignaturePattern =
  | 'pinballHop'
  | 'falseWallFakeout'
  | 'paradoxNoRunway'
  | 'mirrorChicane';

export type RunBlueprint = {
  runSeed: number;
  runAttemptIndex: number;
  openingArchetype: OpeningArchetype;
  cyclePersonality: CyclePersonality;
  climaxPreference: ClimaxPreference;
  signaturePatternPool: SignaturePattern[];
  firstSignatureAtCycle: number;
  signatureEveryNCycles: number;
};

export type DeathContext = {
  phase: 'flow' | 'tension' | 'climax' | 'release';
  generator: string;
  score: number;
};

export type UnlockedPools = {
  openingArchetypes: OpeningArchetype[];
  cyclePersonalities: CyclePersonality[];
  signaturePatterns: SignaturePattern[];
  climaxPreferences: ClimaxPreference[];
};

export const DEFAULT_UNLOCKED_POOLS: UnlockedPools = {
  openingArchetypes: [...DEFAULT_OPENING_ARCHETYPES],
  cyclePersonalities: [...DEFAULT_CYCLE_PERSONALITIES],
  signaturePatterns: [...DEFAULT_SIGNATURE_PATTERNS],
  climaxPreferences: [...DEFAULT_CLIMAX_PREFERENCES],
};

const SALT_RUN_SEED = 0x52554e53;
const SALT_OPENING = 0x4f50454e;
const SALT_PERSONALITY = 0x50455253;
const SALT_CLIMAX = 0x434c4958;

function runSeedFromSession(sessionSeed: number, runAttemptIndex: number): number {
  'worklet';
  return mixU32(sessionSeed >>> 0, runAttemptIndex >>> 0, SALT_RUN_SEED);
}

function weightedPickIndex(weights: readonly number[], rollU32: number): number {
  'worklet';
  if (weights.length === 0) return 0;
  let total = 0;
  for (let i = 0; i < weights.length; i++) {
    total += Math.max(0, weights[i] ?? 0);
  }
  if (total <= 0) return 0;
  const target = unitFloatFromU32(rollU32) * total;
  let acc = 0;
  for (let i = 0; i < weights.length; i++) {
    acc += Math.max(0, weights[i] ?? 0);
    if (target < acc) return i;
  }
  return weights.length - 1;
}

function pickFromPool<T extends string>(
  pool: readonly T[],
  weights: readonly number[],
  sessionSeed: number,
  runAttemptIndex: number,
  salt: number
): T {
  'worklet';
  if (pool.length === 0) {
    return 'warmChute' as T;
  }
  const roll = mixU32(sessionSeed >>> 0, runAttemptIndex >>> 0, salt >>> 0);
  const idx = weightedPickIndex(weights, roll);
  return pool[intMod(idx, pool.length)] ?? pool[0];
}

/** First run of session — fixed warm opening, no weighted rolls. */
export function createFixedFirstRunBlueprint(
  sessionSeed: number,
  runAttemptIndex = 1
): RunBlueprint {
  'worklet';
  return {
    runSeed: runSeedFromSession(sessionSeed, runAttemptIndex),
    runAttemptIndex,
    openingArchetype: 'warmChute',
    cyclePersonality: 'flowHeavy',
    climaxPreference: 'mixed',
    signaturePatternPool: [...DEFAULT_SIGNATURE_PATTERNS],
    firstSignatureAtCycle: runProgressionTuning.FIRST_SIGNATURE_AT_CYCLE,
    signatureEveryNCycles: runProgressionTuning.SIGNATURE_EVERY_N_CYCLES,
  };
}

export type RollRunBlueprintArgs = {
  sessionSeed: number;
  runAttemptIndex: number;
  bestScore?: number;
  deathHistory?: DeathContext[];
  unlockedPools?: UnlockedPools;
};

/** Weighted blueprint roll for attempt >= 2. */
export function rollRunBlueprint(args: RollRunBlueprintArgs): RunBlueprint {
  'worklet';
  const sessionSeed = args.sessionSeed >>> 0;
  const runAttemptIndex = Math.max(1, Math.floor(args.runAttemptIndex));
  const pools =
    args.unlockedPools ?? resolveUnlockedPools(args.bestScore ?? 0);

  const baseOpeningWeights = buildOpeningWeights(pools.openingArchetypes);
  const openingWeights = applyAttemptMemoryToOpeningWeights(
    pools.openingArchetypes,
    baseOpeningWeights,
    args.deathHistory
  );

  const openingArchetype = pickFromPool(
    pools.openingArchetypes,
    openingWeights,
    sessionSeed,
    runAttemptIndex,
    SALT_OPENING
  );

  const cyclePersonality = pickFromPool(
    pools.cyclePersonalities,
    buildPersonalityWeights(pools.cyclePersonalities),
    sessionSeed,
    runAttemptIndex,
    SALT_PERSONALITY
  );

  const climaxPreference = pickFromPool(
    pools.climaxPreferences,
    buildClimaxPreferenceWeights(pools.climaxPreferences),
    sessionSeed,
    runAttemptIndex,
    SALT_CLIMAX
  );

  const signaturePatternPool = [...pools.signaturePatterns];

  return {
    runSeed: runSeedFromSession(sessionSeed, runAttemptIndex),
    runAttemptIndex,
    openingArchetype,
    cyclePersonality,
    climaxPreference,
    signaturePatternPool,
    firstSignatureAtCycle: runProgressionTuning.FIRST_SIGNATURE_AT_CYCLE,
    signatureEveryNCycles: runProgressionTuning.SIGNATURE_EVERY_N_CYCLES,
  };
}

export type RunBlueprintSessionSlice = {
  sessionSeed: number;
  runAttemptIndex: number;
  bestScore?: number;
  deathHistory?: DeathContext[];
};

export type AssignBlueprintResult = {
  runAttemptIndex: number;
  runSeed: number;
  runBlueprint: RunBlueprint;
};

/**
 * Shared lifecycle entry for beginGameplay and RestartGameplaySystem.
 * - begin + attempt 0 → attempt 1, fixed blueprint
 * - begin + attempt >= 1 → increment, roll
 * - retry → increment, roll
 */
export function assignBlueprintForNewRun(
  session: RunBlueprintSessionSlice,
  mode: 'begin' | 'retry'
): AssignBlueprintResult {
  'worklet';
  const sessionSeed = session.sessionSeed >>> 0;
  const currentAttempt = Math.max(0, Math.floor(session.runAttemptIndex));
  const bestScore = session.bestScore ?? 0;
  const deathHistory = session.deathHistory ?? [];
  const unlockedPools = resolveUnlockedPools(bestScore);

  if (mode === 'begin' && currentAttempt === 0) {
    const runAttemptIndex = 1;
    const runBlueprint = createFixedFirstRunBlueprint(sessionSeed, runAttemptIndex);
    return {
      runAttemptIndex,
      runSeed: runBlueprint.runSeed,
      runBlueprint,
    };
  }

  const runAttemptIndex = currentAttempt + 1;
  const runBlueprint = rollRunBlueprint({
    sessionSeed,
    runAttemptIndex,
    bestScore,
    deathHistory,
    unlockedPools,
  });
  return {
    runAttemptIndex,
    runSeed: runBlueprint.runSeed,
    runBlueprint,
  };
}
