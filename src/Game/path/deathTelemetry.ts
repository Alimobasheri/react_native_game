/**
 * Death telemetry + attempt-memory helpers (worklet-safe).
 */

import { runProgressionTuning } from '@/config/runProgression';
import type { PacingRunContext } from '@/Game/path/cyclePersonality';
import {
  pacingPhaseAtTotalRows,
  pacingPhaseToMacroPhase,
} from '@/Game/path/pacingDirector';
import type { DeathContext, OpeningArchetype } from '@/Game/path/runBlueprint';

/** Map spawnDiagBranchKey → coarse generator tag for attempt memory. */
export function deathGeneratorTagFromBranchKey(branchKey: string): string {
  'worklet';
  const key = branchKey.toLowerCase();
  if (key.includes('signature') || key.includes('pinballhop')) return 'signature';
  if (key.includes('pinball')) return 'pinball';
  if (key.includes('falsewall') || key.includes('falsewall')) return 'falseWall';
  if (key.includes('funnel')) return 'funnel';
  if (key.includes('paradox')) return 'paradox';
  if (key.includes('chicane')) return 'chicane';
  if (key.includes('chute')) return 'chute';
  if (key.includes('catharticrest') || key.includes('release')) return 'release';
  if (key.includes('multipath')) return 'multipath';
  if (key.includes('jsonlevel')) return 'jsonLevel';
  return 'unknown';
}

export function appendDeathHistory(
  history: DeathContext[],
  entry: DeathContext,
  cap: number
): DeathContext[] {
  'worklet';
  const limit = Math.max(1, Math.floor(cap));
  const next = [...(history ?? []), entry];
  if (next.length <= limit) return next;
  return next.slice(next.length - limit);
}

export function captureDeathContext(args: {
  totalRowsGenerated: number;
  pacingCtx?: PacingRunContext;
  spawnDiagBranchKey?: string;
  finalScore: number;
}): DeathContext {
  'worklet';
  const tr = Math.floor(Math.max(0, args.totalRowsGenerated));
  const directorPhase = pacingPhaseAtTotalRows(tr, args.pacingCtx);
  const macroPhase = pacingPhaseToMacroPhase(directorPhase);
  const branchKey = args.spawnDiagBranchKey ?? 'unknown';
  return {
    phase: macroPhase,
    generator: deathGeneratorTagFromBranchKey(branchKey),
    score: Math.max(0, Math.floor(args.finalScore)),
  };
}

export function applyAttemptMemoryToOpeningWeights(
  pool: readonly OpeningArchetype[],
  baseWeights: number[],
  deathHistory: DeathContext[] | undefined
): number[] {
  'worklet';
  const weights = baseWeights.slice();
  const t = runProgressionTuning;
  const history = deathHistory ?? [];
  const cap = t.DEATH_HISTORY_CAP;
  if (history.length < cap) return weights;

  const recent = history.slice(-cap);
  const allLow = recent.every(
    (d) => d.score < t.ATTEMPT_MEMORY_LOW_SCORE_THRESHOLD
  );
  if (!allLow) return weights;

  const breatherIdx = pool.indexOf('breather');
  if (breatherIdx < 0) return weights;

  weights[breatherIdx] =
    (weights[breatherIdx] ?? 1) * t.ATTEMPT_MEMORY_BREATHER_WEIGHT_MULTIPLIER;
  return weights;
}
