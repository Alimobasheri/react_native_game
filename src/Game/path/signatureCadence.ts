/**
 * Signature cadence — cycle-based boss beat scheduling (worklet-safe).
 */

import { runProgressionTuning } from '@/config/runProgression';
import { intMod, mixU32, unitFloatFromU32 } from '@/Game/path/deterministicMix';
import { getPacingCycleState, type PacingRunContext } from '@/Game/path/pacingDirector';
import type { RunBlueprint, SignaturePattern } from '@/Game/path/runBlueprint';

const SALT_SIGNATURE_PATTERN = 0x5349474e;

export type SignatureBlueprintSlice = Pick<
  RunBlueprint,
  | 'runSeed'
  | 'signaturePatternPool'
  | 'firstSignatureAtCycle'
  | 'signatureEveryNCycles'
>;

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

/** 1-based macro cycle index for `totalRowsGenerated` (first cycle = 1). */
export function macroCycleIndex1Based(
  totalRowsGenerated: number,
  pacingCtx?: PacingRunContext
): number {
  'worklet';
  const tr = Math.floor(Math.max(0, totalRowsGenerated));
  let cursor = 0;
  let index = 1;
  for (let guard = 0; guard < 500000; guard++) {
    const st = getPacingCycleState(cursor, pacingCtx);
    const L = st.cycleTotalRows;
    if (L <= 0) return index;
    if (tr < cursor + L) return index;
    cursor += L;
    index++;
  }
  return index;
}

export function isSignatureBeatCycle(
  blueprint: SignatureBlueprintSlice,
  cycleIndex1Based: number
): boolean {
  'worklet';
  const first = Math.max(0, Math.floor(blueprint.firstSignatureAtCycle));
  const everyN = Math.max(1, Math.floor(blueprint.signatureEveryNCycles));
  const cycle = Math.max(1, Math.floor(cycleIndex1Based));
  if (first <= 0) return false;
  if (cycle < first) return false;
  return (cycle - first) % everyN === 0;
}

export function resolveSignaturePattern(
  blueprint: SignatureBlueprintSlice,
  cycleIndex1Based: number,
  patternWeights?: readonly number[]
): SignaturePattern | null {
  'worklet';
  if (!isSignatureBeatCycle(blueprint, cycleIndex1Based)) return null;
  const pool = blueprint.signaturePatternPool;
  if (!pool || pool.length === 0) return null;
  const weights =
    patternWeights && patternWeights.length >= pool.length
      ? patternWeights.slice(0, pool.length)
      : pool.map(() => 1);
  const roll = mixU32(
    blueprint.runSeed >>> 0,
    cycleIndex1Based >>> 0,
    SALT_SIGNATURE_PATTERN
  );
  const idx = weightedPickIndex(weights, roll);
  return pool[intMod(idx, pool.length)] ?? pool[0];
}

/** Generator rows for one pinballHop signature block. */
export function signaturePinballRowBudget(): number {
  'worklet';
  const drift = Math.max(1, runProgressionTuning.SIGNATURE_PINBALL_DRIFT_ROWS);
  const bridge = Math.max(0, runProgressionTuning.SIGNATURE_PINBALL_BRIDGE_ROWS);
  const cycles = Math.max(1, runProgressionTuning.SIGNATURE_PINBALL_HOP_CYCLES);
  return cycles * (drift + bridge + 1);
}

/** Rows in one signature rhythm cycle: drift × N, bridge, SNAP hop. */
export function signaturePinballCycleRowCount(): number {
  'worklet';
  const drift = Math.max(1, runProgressionTuning.SIGNATURE_PINBALL_DRIFT_ROWS);
  const bridge = Math.max(0, runProgressionTuning.SIGNATURE_PINBALL_BRIDGE_ROWS);
  return drift + bridge + 1;
}

export function resolveSignatureBeat(
  blueprint: SignatureBlueprintSlice,
  cycleIndex1Based: number,
  phase: 'flow' | 'tension' | 'climax' | 'release'
): { pattern: SignaturePattern; targetPhase: 'climax' } | null {
  'worklet';
  const pattern = resolveSignaturePattern(blueprint, cycleIndex1Based);
  if (!pattern) return null;
  if (phase !== 'climax') return null;
  return { pattern, targetPhase: 'climax' };
}

export function signatureBlueprintSliceFromRunBlueprint(
  blueprint: RunBlueprint | undefined
): SignatureBlueprintSlice | undefined {
  'worklet';
  if (!blueprint) return undefined;
  return {
    runSeed: blueprint.runSeed >>> 0,
    signaturePatternPool: blueprint.signaturePatternPool,
    firstSignatureAtCycle: blueprint.firstSignatureAtCycle,
    signatureEveryNCycles: blueprint.signatureEveryNCycles,
  };
}
