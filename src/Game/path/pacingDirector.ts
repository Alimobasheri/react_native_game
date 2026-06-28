/**
 * Macro Pacing Director — emotional cycle over obstacle row counts (worklet-safe).
 *
 * Phase lengths are **ranged** and grow with total rows spawned (same ramp as gaps); see
 * `pacingCycleLayoutFromCycleStart` in `src/config/gapDifficultyRamp.ts`.
 */

import { pacingCycleLayoutFromCycleStart, type PacingCyclePhaseRowCounts } from '@/config/gapDifficultyRamp';
import {
  resolveCycleLayout,
  type PacingRunContext,
} from '@/Game/path/cyclePersonality';
import type { MacroPhase } from './macroPacing';
import { hasVerticalSeam, type SwimmerRow } from './swimmerGrid';

export type { PacingRunContext } from '@/Game/path/cyclePersonality';

export type PacingDirectorPhase = 'FLOW' | 'TENSION' | 'CLIMAX' | 'RELEASE';

export type PacingCycleState = PacingCyclePhaseRowCounts & {
  cycleStartTotalRows: number;
  rowInCycle: number;
  cycleTotalRows: number;
};

function pacingFirstCycleTotalRows(pacingCtx?: PacingRunContext): number {
  'worklet';
  const l = resolveCycleLayout(0, pacingCtx);
  return l.flowRows + l.tensionRows + l.climaxRows + l.releaseRows;
}

function pacingPhaseFromLayoutAndRowInCycle(
  layout: PacingCyclePhaseRowCounts,
  rowInCycle: number
): PacingDirectorPhase {
  'worklet';
  const r = rowInCycle;
  if (r < layout.flowRows) return 'FLOW';
  if (r < layout.flowRows + layout.tensionRows) return 'TENSION';
  if (r < layout.flowRows + layout.tensionRows + layout.climaxRows) return 'CLIMAX';
  return 'RELEASE';
}

function layoutForCycleStart(
  cycleStartTotalRows: number,
  pacingCtx?: PacingRunContext
): PacingCyclePhaseRowCounts {
  'worklet';
  return resolveCycleLayout(cycleStartTotalRows, pacingCtx);
}

/**
 * Resolves which macro cycle `totalRowsGenerated` falls into and the per-phase row budgets
 * picked for that cycle (deterministic from cycle start).
 */
export function getPacingCycleState(
  totalRowsGenerated: number,
  pacingCtx?: PacingRunContext
): PacingCycleState {
  'worklet';
  const tr = Math.floor(Math.max(0, totalRowsGenerated));
  let cursor = 0;
  for (let guard = 0; guard < 500000; guard++) {
    const layout = layoutForCycleStart(cursor, pacingCtx);
    const L = layout.flowRows + layout.tensionRows + layout.climaxRows + layout.releaseRows;
    if (L <= 0) {
      const fb = layoutForCycleStart(0, pacingCtx);
      const L0 = fb.flowRows + fb.tensionRows + fb.climaxRows + fb.releaseRows;
      return {
        ...fb,
        cycleStartTotalRows: 0,
        rowInCycle: Math.min(tr, Math.max(0, L0 - 1)),
        cycleTotalRows: Math.max(1, L0),
      };
    }
    if (tr < cursor + L) {
      return {
        ...layout,
        cycleStartTotalRows: cursor,
        rowInCycle: tr - cursor,
        cycleTotalRows: L,
      };
    }
    cursor += L;
  }
  const fb = layoutForCycleStart(0, pacingCtx);
  const L0 = fb.flowRows + fb.tensionRows + fb.climaxRows + fb.releaseRows;
  return {
    ...fb,
    cycleStartTotalRows: 0,
    rowInCycle: 0,
    cycleTotalRows: Math.max(1, L0),
  };
}

/** Row index within the current macro cycle [0, cycleTotalRows - 1]. */
export function pacingRowInCycle(
  totalRowsGenerated: number,
  pacingCtx?: PacingRunContext
): number {
  'worklet';
  const t = Math.floor(totalRowsGenerated);
  if (t < 0) {
    const L0 = pacingFirstCycleTotalRows(pacingCtx);
    if (L0 <= 0) return 0;
    return ((t % L0) + L0) % L0;
  }
  return getPacingCycleState(t, pacingCtx).rowInCycle;
}

/**
 * Phase for the row about to be generated at this `totalRowsGenerated` count
 * (0-based: first row uses count 0 → FLOW).
 */
export function pacingPhaseAtTotalRows(
  totalRowsGenerated: number,
  pacingCtx?: PacingRunContext
): PacingDirectorPhase {
  'worklet';
  const t = Math.floor(totalRowsGenerated);
  if (t < 0) {
    const layout = layoutForCycleStart(0, pacingCtx);
    const r = pacingRowInCycle(t, pacingCtx);
    return pacingPhaseFromLayoutAndRowInCycle(layout, r);
  }
  const st = getPacingCycleState(t, pacingCtx);
  return pacingPhaseFromLayoutAndRowInCycle(st, st.rowInCycle);
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
 * True iff ∃ column index where both rows are passable (gap columns overlap vertically).
 */
export function validateSeam(rowA: SwimmerRow, rowB: SwimmerRow): boolean {
  return hasVerticalSeam(rowA, rowB);
}

/** Immutable snapshot for tests / UI readouts. */
export type PacingDirectorState = {
  totalRowsGenerated: number;
  currentPhase: PacingDirectorPhase;
};

export function pacingDirectorSnapshot(
  totalRowsGenerated: number,
  pacingCtx?: PacingRunContext
): PacingDirectorState {
  return {
    totalRowsGenerated,
    currentPhase: pacingPhaseAtTotalRows(totalRowsGenerated, pacingCtx),
  };
}

/**
 * Orchestrator with mutable `totalRowsGenerated` (use from Jest / non-worklet tools).
 * ECS uses pure `pacingPhaseAtTotalRows(manager.totalRowsGenerated)` instead.
 */
export class PacingDirector {
  totalRowsGenerated = 0;
  pacingCtx?: PacingRunContext;

  get currentPhase(): PacingDirectorPhase {
    return pacingPhaseAtTotalRows(this.totalRowsGenerated, this.pacingCtx);
  }

  /** Phase used for the next row; then advances the counter. */
  consumeRowForNextGeneration(): PacingDirectorPhase {
    const phase = pacingPhaseAtTotalRows(this.totalRowsGenerated, this.pacingCtx);
    this.totalRowsGenerated += 1;
    return phase;
  }

  snapshot(): PacingDirectorState {
    return pacingDirectorSnapshot(this.totalRowsGenerated, this.pacingCtx);
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

  const L0 = getPacingCycleState(0).cycleTotalRows;
  const layout0 = pacingCycleLayoutFromCycleStart(0);
  const f = layout0.flowRows;
  const t = layout0.tensionRows;
  const x = layout0.climaxRows;
  const lastClimaxRow = f + t + x - 1;
  const firstReleaseRow = f + t + x;

  if (pacingPhaseAtTotalRows(lastClimaxRow) !== 'CLIMAX') {
    fail(`row ${lastClimaxRow} must be CLIMAX`);
  }
  if (pacingPhaseAtTotalRows(firstReleaseRow) !== 'RELEASE') {
    fail(`row ${firstReleaseRow} must be RELEASE`);
  }
  if (pacingPhaseAtTotalRows(L0) !== 'FLOW') {
    fail(`row ${L0} must wrap to FLOW`);
  }

  const d = new PacingDirector();
  for (let i = 0; i < firstReleaseRow; i++) {
    d.consumeRowForNextGeneration();
  }
  if (d.currentPhase !== 'RELEASE') {
    fail(`after ${firstReleaseRow} generated rows, currentPhase must be RELEASE`);
  }

  const stMid = getPacingCycleState(Math.floor(L0 / 2));
  if (stMid.cycleStartTotalRows !== 0) {
    fail('mid first cycle must belong to cycle start 0');
  }
  if (stMid.rowInCycle !== Math.floor(L0 / 2)) {
    fail('rowInCycle must match offset from cycle start');
  }
}
