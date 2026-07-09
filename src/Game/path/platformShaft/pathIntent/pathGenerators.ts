/**
 * Path generators — wide-gap chicane using directed-path chicane rhythm (v2 P1).
 * Worklet-safe.
 */

import { platformShaftTuning } from '@/config/platformShaftTuning';
import {
  CHICANE_DEFAULT_BLOCK_N,
  clampGapCenter,
  createChicaneStateFromEntryCenter,
  flowChicaneNextRow,
} from '@/Game/path/flowGenerators';
import {
  applyCeilingPinPolicy,
  narrowGapsAtCenter,
} from '@/Game/path/platformShaft/pathIntent/ceilingPinPolicy';
import type {
  ComposePathChicaneParams,
  PathRowIntent,
  PathSegmentOutput,
} from '@/Game/path/platformShaft/pathIntent/types';
import { gapColsFromWidth, lerpNum } from '@/Game/path/platformShaft/primitives';
import type { PlatformSide } from '@/Game/path/platformShaft/types';

export const wideGapColsForDifficulty = (difficulty01: number): number => {
  'worklet';
  const d = Math.max(0, Math.min(1, difficulty01));
  const t = platformShaftTuning;
  return Math.round(lerpNum(t.WIDE_GAP_COLS_EASY, t.WIDE_GAP_COLS_HARD, d));
};

const pathRowFromChicane = (
  globalRow: number,
  columns: number,
  center: number,
  wideGapCols: number,
  narrowGapCols: number,
  macroPhase: PathRowIntent['macroPhase'],
  sectionId: number
): PathRowIntent => {
  'worklet';
  const pathCenterCol = center;
  const shaftSide: PlatformSide =
    pathCenterCol >= (columns - 1) / 2 ? 'left' : 'right';
  return {
    row: globalRow,
    wideGaps: gapColsFromWidth(columns, wideGapCols, pathCenterCol),
    narrowGaps: narrowGapsAtCenter(columns, pathCenterCol, narrowGapCols),
    shaftSide,
    pathCenterCol,
    macroPhase,
    sectionId,
  };
};

/**
 * 40-row (default) wide chicane path — zero hazards.
 * Path center drifts ±2; wide gaps give room before shafts close (P3).
 */
export const composePathChicane = (
  params: ComposePathChicaneParams = {}
): PathSegmentOutput => {
  'worklet';
  const seed = params.seed ?? 0;
  const difficulty01 = Math.max(0, Math.min(1, params.difficulty01 ?? 0.2));
  const columns = params.columns ?? 6;
  const rowCount =
    params.rowCount ?? platformShaftTuning.PATH_CHICANE_PREVIEW_ROWS;
  const startGlobalRow = params.startGlobalRow ?? 0;
  const macroPhase = params.macroPhase ?? 'flow';
  const wideGapCols = params.wideGapCols ?? wideGapColsForDifficulty(difficulty01);
  const narrowGapCols = platformShaftTuning.NARROW_GAP_COLS;
  const chicaneBlockRows = params.chicaneBlockRows ?? CHICANE_DEFAULT_BLOCK_N;
  const applyPins = params.applyCeilingPins !== false;

  const entryCenter = clampGapCenter(Math.floor(columns / 2), columns);
  const initialDirection = seed % 2 === 0 ? (1 as const) : (-1 as const);
  let chicaneState = createChicaneStateFromEntryCenter(
    entryCenter,
    columns,
    initialDirection
  );

  const pathRows: PathRowIntent[] = [];
  let sectionId = 0;

  for (let i = 0; i < rowCount; i++) {
    const globalRow = startGlobalRow + i;
    const prevCenter = chicaneState.center;
    const { state: nextState } = flowChicaneNextRow(
      null,
      chicaneState,
      columns,
      chicaneBlockRows
    );
    let pushDirection: -1 | 0 | 1 = 0;
    if (nextState.center > prevCenter) pushDirection = 1;
    else if (nextState.center < prevCenter) pushDirection = -1;
    chicaneState = nextState;

    let pathRow = pathRowFromChicane(
      globalRow,
      columns,
      chicaneState.center,
      wideGapCols,
      narrowGapCols,
      macroPhase,
      sectionId
    );

    if (applyPins && pushDirection !== 0) {
      const pinResult = applyCeilingPinPolicy(pathRow, {
        seed,
        columns,
        pushDirection,
        sectionId,
        pinChance: platformShaftTuning.CEILING_PIN_CHANCE,
        leadRows: platformShaftTuning.CEILING_PIN_LEAD_ROWS,
      });
      pathRow = pinResult.row;
      sectionId = pinResult.sectionId;
    }

    pathRows.push(pathRow);
  }

  return {
    pathRows,
    meta: {
      recipeId: 'pathChicanePreview',
      seed,
      difficulty01,
      rowCount: pathRows.length,
    },
  };
};

/** Convert path rows to static PlatformShaftRowDef-compatible rest geometry (P1 lab / preview). */
export const pathRowsToRestRowDefs = (
  pathRows: readonly PathRowIntent[],
  columns: number
): { gaps: number[]; blocks: number[]; macroPhase: PathRowIntent['macroPhase'] }[] => {
  'worklet';
  const out: { gaps: number[]; blocks: number[]; macroPhase: PathRowIntent['macroPhase'] }[] =
    [];
  for (let i = 0; i < pathRows.length; i++) {
    const pr = pathRows[i];
    const blockSet = new Set<number>();
    if (pr.staticBlocks?.length) {
      for (let j = 0; j < pr.staticBlocks.length; j++) {
        blockSet.add(pr.staticBlocks[j]!);
      }
    } else {
      const wideSet = new Set(pr.wideGaps);
      for (let c = 0; c < columns; c++) {
        if (!wideSet.has(c)) blockSet.add(c);
      }
    }
    const blocks: number[] = [];
    blockSet.forEach((c) => blocks.push(c));
    blocks.sort((a, b) => a - b);
    const gapSet = new Set<number>();
    for (let c = 0; c < columns; c++) {
      if (!blockSet.has(c)) gapSet.add(c);
    }
    const gaps: number[] = [];
    gapSet.forEach((c) => gaps.push(c));
    gaps.sort((a, b) => a - b);
    out.push({ gaps, blocks, macroPhase: pr.macroPhase });
  }
  return out;
};
