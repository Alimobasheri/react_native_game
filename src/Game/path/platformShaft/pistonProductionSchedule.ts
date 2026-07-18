/**
 * Deterministic production insertion of vertical piston shaft segments.
 * Eligible in FLOW / early TENSION after difficulty threshold; never RELEASE/CLIMAX.
 */

import { gapDifficulty01FromTotalRows } from '@/config/gapDifficultyRamp';
import { pistonHazardTuning } from '@/config/pistonHazardTuning';
import { mixU32, unitFloatFromU32 } from '@/Game/path/deterministicMix';
import {
  getPacingCycleState,
  pacingPhaseAtTotalRows,
  type PacingDirectorPhase,
} from '@/Game/path/pacingDirector';
import type { PacingRunContext } from '@/Game/path/cyclePersonality';
import { lerpPistonEscalation } from '@/Game/path/platformShaft/composePistonShaft';

export type PistonProductionRecipeId = 'pistonFloor' | 'pistonCeiling';

export type PistonProductionDecision = {
  insert: boolean;
  recipe?: PistonProductionRecipeId;
};

/** Early tension = first half of the tension phase within the current cycle. */
export const isPistonEligibleMacroPhase = (
  phase: PacingDirectorPhase,
  totalRowsGenerated: number,
  pacingCtx?: PacingRunContext
): boolean => {
  'worklet';
  if (phase === 'FLOW') {
    return true;
  }
  if (phase !== 'TENSION') {
    return false;
  }
  const st = getPacingCycleState(totalRowsGenerated, pacingCtx);
  const tensionStart = st.flowRows;
  const tensionMid = tensionStart + Math.floor(st.tensionRows * 0.5);
  return st.rowInCycle < tensionMid;
};

export const pistonInsertWeight01 = (difficulty01: number): number => {
  'worklet';
  const t = Math.max(0, Math.min(1, difficulty01));
  const d0 = pistonHazardTuning.MIN_DIFFICULTY_01;
  if (t < d0) {
    return 0;
  }
  const u = (t - d0) / Math.max(0.001, 1 - d0);
  return (
    pistonHazardTuning.PRODUCTION_INSERT_WEIGHT_AT_MIN +
    u *
      (pistonHazardTuning.PRODUCTION_INSERT_WEIGHT_AT_MAX -
        pistonHazardTuning.PRODUCTION_INSERT_WEIGHT_AT_MIN)
  );
};

/**
 * Decide whether to insert a one-shot piston shaft on template rollover.
 * @param lastInsertTotalRows — totalRows at previous piston insert (cooldown), or -1.
 */
export const decidePistonProductionInsert = (args: {
  totalRowsGenerated: number;
  runSeed: number;
  lastInsertTotalRows: number;
  /** Active run time; guarantees the first live-path piston after the tuning delay. */
  gameplayElapsedSeconds?: number;
  pacingCtx?: PacingRunContext;
  /** Minimum rows between production inserts. */
  minRowsBetweenInserts?: number;
}): PistonProductionDecision => {
  'worklet';
  const totalRows = Math.floor(Math.max(0, args.totalRowsGenerated));
  if (
    args.lastInsertTotalRows < 0 &&
    (args.gameplayElapsedSeconds ?? 0) >=
      pistonHazardTuning.FIRST_PRODUCTION_INSERT_DELAY_SEC
  ) {
    // Teach the simpler read first: wait for the floor piston, then cross.
    return { insert: true, recipe: 'pistonFloor' };
  }

  const difficulty01 = gapDifficulty01FromTotalRows(totalRows);
  if (difficulty01 < pistonHazardTuning.MIN_DIFFICULTY_01) {
    return { insert: false };
  }

  const phase = pacingPhaseAtTotalRows(totalRows, args.pacingCtx);
  if (!isPistonEligibleMacroPhase(phase, totalRows, args.pacingCtx)) {
    return { insert: false };
  }

  const minGap =
    args.minRowsBetweenInserts ??
    pistonHazardTuning.MIN_ROWS_BETWEEN_PRODUCTION_INSERTS;
  if (
    args.lastInsertTotalRows >= 0 &&
    totalRows - args.lastInsertTotalRows < minGap
  ) {
    return { insert: false };
  }

  const weight = pistonInsertWeight01(difficulty01);
  const roll = unitFloatFromU32(
    mixU32(args.runSeed >>> 0, totalRows >>> 0, 0x70697374)
  );
  if (roll > weight) {
    return { insert: false };
  }

  const esc = lerpPistonEscalation(difficulty01);
  const mountRoll = unitFloatFromU32(
    mixU32(args.runSeed >>> 0, totalRows >>> 0, 0x6d6e7431)
  );
  const recipe: PistonProductionRecipeId =
    mountRoll < esc.ceilingWeight ? 'pistonCeiling' : 'pistonFloor';

  return { insert: true, recipe };
};
