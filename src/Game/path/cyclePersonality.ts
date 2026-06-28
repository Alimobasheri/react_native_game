/**
 * Cycle personality — first-macro-cycle phase budget shifts from Run Blueprint.
 * Worklet-safe; routing only (no new generators).
 */

import {
  gapDifficultyRampTuning,
  pacingCycleLayoutFromCycleStart,
  type PacingCyclePhaseRowCounts,
} from '@/config/gapDifficultyRamp';
import { runProgressionTuning } from '@/config/runProgression';
import { intMod, mixU32, unitFloatFromU32 } from '@/Game/path/deterministicMix';
import type {
  ClimaxPreference,
  CyclePersonality,
  RunBlueprint,
  SignaturePattern,
} from '@/Game/path/runBlueprint';

export type PacingRunContext = {
  /** Cycle-1 layout picks only; 0 on attempt #1. */
  runSeed: number;
  /** Blueprint master seed — signature pattern pick always uses this. */
  blueprintRunSeed: number;
  cyclePersonality: CyclePersonality;
  climaxPreference: ClimaxPreference;
  signaturePatternPool: SignaturePattern[];
  firstSignatureAtCycle: number;
  signatureEveryNCycles: number;
};

function pctBoost(base: number, minPct: number, maxPct: number, rollU32: number): number {
  'worklet';
  const span = Math.max(0, maxPct - minPct);
  const pct = minPct + unitFloatFromU32(rollU32) * span;
  return Math.round(base * (1 + pct / 100));
}

function pctCut(base: number, pct: number): number {
  'worklet';
  return Math.round(base * (1 - pct / 100));
}

function intInclusiveFromRunSeed(runSeed: number, salt: number, lo: number, hi: number): number {
  'worklet';
  const a = Math.min(lo, hi);
  const b = Math.max(lo, hi);
  const span = b - a + 1;
  if (span <= 1) return a;
  return a + intMod(mixU32(runSeed >>> 0, salt >>> 0, 0x6379636c), span);
}

function clampLayout(layout: PacingCyclePhaseRowCounts): PacingCyclePhaseRowCounts {
  'worklet';
  const t = gapDifficultyRampTuning;
  return {
    flowRows: Math.max(t.FLOW_PHASE_ROWS_HARD_MIN, layout.flowRows),
    tensionRows: Math.max(t.TENSION_PHASE_ROWS_HARD_MIN, layout.tensionRows),
    climaxRows: Math.max(t.CLIMAX_PHASE_ROWS_HARD_MIN, layout.climaxRows),
    releaseRows: Math.max(t.RELEASE_PHASE_ROWS_HARD_MIN, layout.releaseRows),
  };
}

/**
 * Build pacing context from session blueprint.
 * Attempt #1 uses `runSeed: 0` for cycle-1 layout picks (identical first chapter).
 * Opening archetype still uses `runBlueprint.runSeed` elsewhere — unchanged.
 */
export function resolvePacingRunContext(
  runBlueprint: RunBlueprint | undefined,
  runAttemptIndex: number
): PacingRunContext | undefined {
  'worklet';
  if (!runBlueprint) return undefined;
  const attempt = Math.max(1, Math.floor(runAttemptIndex));
  const pacingRunSeed = attempt === 1 ? 0 : runBlueprint.runSeed >>> 0;
  return {
    runSeed: pacingRunSeed,
    blueprintRunSeed: runBlueprint.runSeed >>> 0,
    cyclePersonality: runBlueprint.cyclePersonality,
    climaxPreference: runBlueprint.climaxPreference,
    signaturePatternPool: [...runBlueprint.signaturePatternPool],
    firstSignatureAtCycle: runBlueprint.firstSignatureAtCycle,
    signatureEveryNCycles: runBlueprint.signatureEveryNCycles,
  };
}

/**
 * Adjust phase row budgets for cycle 1 only (`cycleStartTotalRows === 0`).
 * Later cycles return the base layout unchanged.
 */
export function applyCyclePersonality(
  layout: PacingCyclePhaseRowCounts,
  personality: CyclePersonality,
  cycleStartTotalRows: number,
  runSeed: number
): PacingCyclePhaseRowCounts {
  'worklet';
  if (cycleStartTotalRows !== 0) {
    return layout;
  }

  const t = runProgressionTuning;
  const seed = runSeed >>> 0;
  let { flowRows, tensionRows, climaxRows, releaseRows } = layout;

  switch (personality) {
    case 'flowHeavy': {
      const flowRoll = mixU32(seed, t.SALT_CYCLE_PERSONALITY_FLOW >>> 0, 0x666c6f77);
      flowRows = pctBoost(
        flowRows,
        t.FLOW_HEAVY_FLOW_BOOST_MIN_PCT,
        t.FLOW_HEAVY_FLOW_BOOST_MAX_PCT,
        flowRoll
      );
      tensionRows = pctCut(tensionRows, t.FLOW_HEAVY_TENSION_CUT_PCT);
      break;
    }
    case 'tensionEarly': {
      flowRows = pctCut(flowRows, t.TENSION_EARLY_FLOW_CUT_PCT);
      const sooner = intInclusiveFromRunSeed(
        seed,
        t.SALT_CYCLE_PERSONALITY_TENSION,
        t.TENSION_EARLY_ROWS_SOONER_MIN,
        t.TENSION_EARLY_ROWS_SOONER_MAX
      );
      flowRows = Math.max(gapDifficultyRampTuning.FLOW_PHASE_ROWS_HARD_MIN, flowRows - sooner);
      break;
    }
    case 'climaxForward':
      break;
    case 'shortRelease':
      releaseRows = gapDifficultyRampTuning.RELEASE_PHASE_ROWS_HARD_MIN;
      break;
    default:
      break;
  }

  return clampLayout({ flowRows, tensionRows, climaxRows, releaseRows });
}

export function resolveCycleLayout(
  cycleStartTotalRows: number,
  pacingCtx?: PacingRunContext
): PacingCyclePhaseRowCounts {
  'worklet';
  const cursor = Math.floor(Math.max(0, cycleStartTotalRows));
  const runSeed = cursor === 0 ? (pacingCtx?.runSeed ?? 0) : 0;
  const base = pacingCycleLayoutFromCycleStart(cursor, runSeed);
  if (!pacingCtx || cursor !== 0) {
    return base;
  }
  return applyCyclePersonality(
    base,
    pacingCtx.cyclePersonality,
    cursor,
    pacingCtx.runSeed
  );
}
