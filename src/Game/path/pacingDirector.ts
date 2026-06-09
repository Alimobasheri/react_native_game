/**
 * Macro Pacing Director — 55-row emotional cycle (worklet-safe: literals only inside worklets).
 *
 * Phases: FLOW (20) → TENSION (15) → CLIMAX (10) → RELEASE (10) → repeat.
 */

import type { MacroPhase } from './macroPacing';
import { hasVerticalSeam, type SwimmerRow } from './swimmerGrid';

export type PacingDirectorPhase = 'FLOW' | 'TENSION' | 'CLIMAX' | 'RELEASE';

/** Row index within the 55-row macro cycle [0, 54]. */
export function pacingRowInCycle(totalRowsGenerated: number): number {
  'worklet';
  const t = Math.floor(totalRowsGenerated);
  const m = t % 55;
  return m < 0 ? m + 55 : m;
}

/**
 * Phase for the row about to be generated at this `totalRowsGenerated` count
 * (0-based: first row uses count 0 → FLOW).
 */
export function pacingPhaseAtTotalRows(totalRowsGenerated: number): PacingDirectorPhase {
  'worklet';
  const r = pacingRowInCycle(totalRowsGenerated);
  if (r < 20) return 'FLOW';
  if (r < 35) return 'TENSION';
  if (r < 45) return 'CLIMAX';
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

  if (pacingPhaseAtTotalRows(44) !== 'CLIMAX') {
    fail('row 44 must be CLIMAX');
  }
  if (pacingPhaseAtTotalRows(45) !== 'RELEASE') {
    fail('row 45 must be RELEASE');
  }
  if (pacingPhaseAtTotalRows(55) !== 'FLOW') {
    fail('row 55 must wrap to FLOW');
  }

  const d = new PacingDirector();
  for (let i = 0; i < 45; i++) {
    d.consumeRowForNextGeneration();
  }
  if (d.currentPhase !== 'RELEASE') {
    fail('after 45 generated rows, currentPhase must be RELEASE');
  }
}

