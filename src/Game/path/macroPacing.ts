/**
 * Procedural gap tension curve keyed by lowercase phase (used inside worklets).
 * Macro cycle / director lives in `pacingDirector.ts`.
 */

import { OBSTACLE_PACING_RUN_DEPTH_DIVISOR } from '@/config/gapDifficultyRamp';

export type MacroPhase = 'flow' | 'tension' | 'climax' | 'release';

/** Bias values in [0,1] for tuning archetype thresholds per phase. */
export function macroPhaseTension01(phase: MacroPhase): number {
  'worklet';
  switch (phase) {
    case 'flow':
      return 0.2;
    case 'tension':
      return 0.55;
    case 'climax':
      return 0.85;
    case 'release':
      return 0.35;
    default:
      return 0.4;
  }
}

/**
 * Rows already spawned before this row (`proceduralStreamSalt`): slow ramp of layout complexity.
 */
export function runDepthTensionBonus01(rowsSpawnedBeforeThis: number): number {
  'worklet';
  const r = rowsSpawnedBeforeThis >>> 0;
  const denom = Math.max(1, OBSTACLE_PACING_RUN_DEPTH_DIVISOR);
  const raw = r / denom;
  return raw > 0.34 ? 0.34 : raw;
}

/** Phase curve + long-run drift (still deterministic from stream salt). */
export function effectiveGapTension01(phase: MacroPhase, rowsSpawnedBeforeThis: number): number {
  'worklet';
  const base = macroPhaseTension01(phase);
  const bonus = runDepthTensionBonus01(rowsSpawnedBeforeThis);
  const sum = base + bonus;
  return sum > 1 ? 1 : sum;
}
