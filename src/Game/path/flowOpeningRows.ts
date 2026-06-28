/**
 * Shared FLOW opening row generator — chute → chicane with blueprint archetype routing.
 */

import { pathSegmentFlowChuteRowsBeforeChicane } from '@/config/gapDifficultyRamp';
import { mixU32 } from '@/Game/path/deterministicMix';
import {
  CHICANE_DEFAULT_BLOCK_N,
  createChicaneStateFromEntryCenter,
  extractTripleGapCenter,
  flowChicaneNextRow,
  flowChuteNextRow,
  type ChicaneState,
} from '@/Game/path/flowGenerators';
import { resolveOpeningFlowParams } from '@/Game/path/openingArchetype';
import { getPacingCycleState } from '@/Game/path/pacingDirector';
import type { OpeningArchetype } from '@/Game/path/runBlueprint';
import { gapsFromRow, type SwimmerRow } from '@/Game/path/swimmerGrid';

export function generateFlowOpeningRowGaps(
  ctx: Record<string, unknown>,
  lastSw: SwimmerRow | null,
  rowLength: number,
  stream: number,
  pathRunId: number,
  openingArchetype: OpeningArchetype,
  runSeed: number
): number[] {
  'worklet';

  if (ctx.flowMode === 'chicane' && ctx.chicaneState) {
    const st = ctx.chicaneState as ChicaneState;
    const { row, state } = flowChicaneNextRow(
      lastSw,
      st,
      rowLength,
      CHICANE_DEFAULT_BLOCK_N
    );
    ctx.chicaneState = state;
    return gapsFromRow(row);
  }

  if (ctx.flowChuteRowsTarget === undefined) {
    const params = resolveOpeningFlowParams(openingArchetype, runSeed, rowLength);
    if (params.seedCenter !== undefined) {
      ctx.flowChuteSeedCenter = params.seedCenter;
    }
    if (params.chuteRowsTargetOverride !== undefined) {
      ctx.flowChuteRowsTarget = params.chuteRowsTargetOverride;
    } else {
      const pacingSnap = getPacingCycleState(stream);
      ctx.flowChuteRowsTarget = pathSegmentFlowChuteRowsBeforeChicane(
        stream,
        mixU32(pathRunId >>> 0, stream >>> 0, 0x666c6f77),
        pacingSnap.flowRows
      );
    }
  }

  let seedCenter: number | undefined;
  if (
    ctx.flowChuteSeedCenter !== undefined &&
    ((ctx.flowChuteRowCount as number) ?? 0) === 0
  ) {
    seedCenter = ctx.flowChuteSeedCenter as number;
  }

  const chuteRow = flowChuteNextRow(lastSw, rowLength, seedCenter);
  if (seedCenter !== undefined) {
    ctx.flowChuteSeedCenter = undefined;
  }

  const gaps = gapsFromRow(chuteRow);
  const n = ((ctx.flowChuteRowCount as number) ?? 0) + 1;
  ctx.flowChuteRowCount = n;
  const chuteCap = (ctx.flowChuteRowsTarget as number) ?? 20;
  if (n >= chuteCap) {
    ctx.flowMode = 'chicane';
    ctx.chicaneState = createChicaneStateFromEntryCenter(
      extractTripleGapCenter(chuteRow, rowLength) ?? Math.floor(rowLength / 2),
      rowLength
    );
  }
  return gaps;
}

export function clearFlowOpeningCtx(ctx: Record<string, unknown>): void {
  'worklet';
  ctx.flowMode = undefined;
  ctx.flowChuteRowCount = undefined;
  ctx.flowChuteRowsTarget = undefined;
  ctx.flowChuteSeedCenter = undefined;
  ctx.chicaneState = undefined;
}
