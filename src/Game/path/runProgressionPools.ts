/**
 * Milestone pool resolution + dynamic weight builders (worklet-safe).
 */

import {
  CLIMAX_PREFERENCE_WEIGHTS,
  DEFAULT_CLIMAX_PREFERENCES,
  DEFAULT_CYCLE_PERSONALITIES,
  DEFAULT_OPENING_ARCHETYPES,
  DEFAULT_SIGNATURE_PATTERNS,
  runProgressionTuning,
} from '@/config/runProgression';
import type {
  ClimaxPreference,
  CyclePersonality,
  OpeningArchetype,
  SignaturePattern,
  UnlockedPools,
} from '@/Game/path/runBlueprint';

export const OPENING_WEIGHT_BY_ARCHETYPE: Record<OpeningArchetype, number> = {
  warmChute: 3,
  fastChicane: 2,
  leftBias: 2,
  rightBias: 2,
  earlyFork: 2,
  breather: 2,
};

export const PERSONALITY_WEIGHT_BY_TYPE: Record<CyclePersonality, number> = {
  flowHeavy: 1,
  tensionEarly: 1,
  climaxForward: 1,
  shortRelease: 1,
};

/** Resolve blueprint pools from persisted best score. Signatures stay pinballHop only. */
export function resolveUnlockedPools(bestScore: number): UnlockedPools {
  'worklet';
  const score = Math.max(0, Math.floor(bestScore));
  const t = runProgressionTuning;

  const openingArchetypes: OpeningArchetype[] = [...DEFAULT_OPENING_ARCHETYPES];
  if (score >= t.MILESTONE_EARLY_FORK_BEST_SCORE) {
    openingArchetypes.push('earlyFork');
  }
  if (score >= t.MILESTONE_BREATHER_BEST_SCORE) {
    openingArchetypes.push('breather');
  }

  const cyclePersonalities: CyclePersonality[] = [...DEFAULT_CYCLE_PERSONALITIES];
  if (score >= t.MILESTONE_TENSION_EARLY_BEST_SCORE) {
    cyclePersonalities.push('tensionEarly');
  }

  return {
    openingArchetypes,
    cyclePersonalities,
    signaturePatterns: [...DEFAULT_SIGNATURE_PATTERNS] as SignaturePattern[],
    climaxPreferences: [...DEFAULT_CLIMAX_PREFERENCES] as ClimaxPreference[],
  };
}

export function buildOpeningWeights(pool: readonly OpeningArchetype[]): number[] {
  'worklet';
  const weights: number[] = [];
  for (let i = 0; i < pool.length; i++) {
    weights.push(OPENING_WEIGHT_BY_ARCHETYPE[pool[i]!] ?? 1);
  }
  return weights;
}

export function buildPersonalityWeights(pool: readonly CyclePersonality[]): number[] {
  'worklet';
  const weights: number[] = [];
  for (let i = 0; i < pool.length; i++) {
    weights.push(PERSONALITY_WEIGHT_BY_TYPE[pool[i]!] ?? 1);
  }
  return weights;
}

export function buildClimaxPreferenceWeights(
  pool: readonly ClimaxPreference[]
): number[] {
  'worklet';
  const defaults = DEFAULT_CLIMAX_PREFERENCES;
  const defaultWeights = CLIMAX_PREFERENCE_WEIGHTS;
  const weights: number[] = [];
  for (let i = 0; i < pool.length; i++) {
    const pref = pool[i]!;
    const idx = defaults.indexOf(pref);
    weights.push(idx >= 0 ? (defaultWeights[idx] ?? 1) : 1);
  }
  return weights;
}
