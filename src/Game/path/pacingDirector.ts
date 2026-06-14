/**
 * Macro Pacing Director — emotional cycle over obstacle row counts (worklet-safe).
 *
 * Phase lengths and cycle total: `src/config/obstaclePacing.ts` (`obstaclePacingTuning`).
 */

import {
  obstaclePacingTuning,
  OBSTACLE_PACING_CYCLE_ROW_COUNT,
} from '@/config/obstaclePacing';
import type { MacroPhase } from './macroPacing';
import { hasVerticalSeam, type SwimmerRow } from './swimmerGrid';

export type PacingDirectorPhase = 'FLOW' | 'TENSION' | 'CLIMAX' | 'RELEASE';

/** Row index within the macro cycle [0, cycleLength - 1]. */
export function pacingRowInCycle(totalRowsGenerated: number): number {
  'worklet';
  const t = Math.floor(totalRowsGenerated);
  const c = OBSTACLE_PACING_CYCLE_ROW_COUNT;
  const m = t % c;
  return m < 0 ? m + c : m;
}

/**
 * Phase for the row about to be generated at this `totalRowsGenerated` count
 * (0-based: first row uses count 0 → FLOW).
 */
export function pacingPhaseAtTotalRows(totalRowsGenerated: number): PacingDirectorPhase {
  'worklet';
  const r = pacingRowInCycle(totalRowsGenerated);
  const f = obstaclePacingTuning.FLOW_ROW_COUNT;
  const tensionEnd = f + obstaclePacingTuning.TENSION_ROW_COUNT;
  const climaxEnd = tensionEnd + obstaclePacingTuning.CLIMAX_ROW_COUNT;
  if (r < f) return 'FLOW';
  if (r < tensionEnd) return 'TENSION';
  if (r < climaxEnd) return 'CLIMAX';
  return 'RELEASE';
}

/** Maps director phase to existing procedural tension curve (lowercase). */
export function pacingPhaseToMacroPhase(p: PacingDirectorPhase): MacroPhase {
  'worklet';
  if (p === 'FLOW') return 'flow';
  if (p === 'TENSION') return 'tension';
  if (p === 'CLIMAX') return 'climax';
  return 'release';
}

/**
 * True iff ∃ i in [0, min(len)-1] with rowA[i] === 0 && rowB[i] === 0 (15-column game: 0..14).
 */
export function validateSeam(rowA: SwimmerRow, rowB: SwimmerRow): boolean {
  return hasVerticalSeam(rowA, rowB);
}

/** Immutable snapshot for tests / UI readouts. */
export type PacingDirectorState = {
  totalRowsGenerated: number;
  currentPhase: PacingDirectorPhase;
};

export function pacingDirectorSnapshot(totalRowsGenerated: number): PacingDirectorState {
  return {
    totalRowsGenerated,
    currentPhase: pacingPhaseAtTotalRows(totalRowsGenerated),
  };
}

/**
 * Orchestrator with mutable `totalRowsGenerated` (use from Jest / non-worklet tools).
 * ECS uses pure `pacingPhaseAtTotalRows(manager.totalRowsGenerated)` instead.
 */
export class PacingDirector {
  totalRowsGenerated = 0;

  get currentPhase(): PacingDirectorPhase {
    return pacingPhaseAtTotalRows(this.totalRowsGenerated);
  }

  /** Phase used for the next row; then advances the counter. */
  consumeRowForNextGeneration(): PacingDirectorPhase {
    const phase = pacingPhaseAtTotalRows(this.totalRowsGenerated);
    this.totalRowsGenerated += 1;
    return phase;
  }

  snapshot(): PacingDirectorState {
    return pacingDirectorSnapshot(this.totalRowsGenerated);
  }
}

/**
 * Lightweight invariant checks. Invoked once at module load so validation runs even
 * when Jest / Skia global setup is unavailable.
 */
export function runEmbeddedPacingValidations(): void {
  const fail = (msg: string) => {
    throw new Error(`[PacingDirector embedded validation] ${msg}`);
  };

  const allSolid = (): SwimmerRow => Array(15).fill(1) as SwimmerRow;
  const gapLeft = allSolid();
  gapLeft[2] = 0;
  const gapRight = allSolid();
  gapRight[10] = 0;
  if (validateSeam(gapLeft, gapRight)) {
    fail('validateSeam should reject disjoint gaps');
  }

  gapRight[2] = 0;
  if (!validateSeam(gapLeft, gapRight)) {
    fail('validateSeam should accept shared gap');
  }

  const f = obstaclePacingTuning.FLOW_ROW_COUNT;
  const t = obstaclePacingTuning.TENSION_ROW_COUNT;
  const x = obstaclePacingTuning.CLIMAX_ROW_COUNT;
  const lastClimaxRow = f + t + x - 1;
  const firstReleaseRow = f + t + x;

  if (pacingPhaseAtTotalRows(lastClimaxRow) !== 'CLIMAX') {
    fail(`row ${lastClimaxRow} must be CLIMAX`);
  }
  if (pacingPhaseAtTotalRows(firstReleaseRow) !== 'RELEASE') {
    fail(`row ${firstReleaseRow} must be RELEASE`);
  }
  if (pacingPhaseAtTotalRows(OBSTACLE_PACING_CYCLE_ROW_COUNT) !== 'FLOW') {
    fail(`row ${OBSTACLE_PACING_CYCLE_ROW_COUNT} must wrap to FLOW`);
  }

  const d = new PacingDirector();
  for (let i = 0; i < firstReleaseRow; i++) {
    d.consumeRowForNextGeneration();
  }
  if (d.currentPhase !== 'RELEASE') {
    fail(
      `after ${firstReleaseRow} generated rows, currentPhase must be RELEASE`
    );
  }
}

