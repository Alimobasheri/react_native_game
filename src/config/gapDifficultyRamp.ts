/**
 * Scales procedural gap widths, gap-shift runway row count, **macro pacing phase row counts**
 * (FLOW / TENSION / CLIMAX / RELEASE per cycle), and **path segment lengths** (funnel, pinball,
 * false wall, flow chute, cathartic release strip) with how many obstacle rows have been spawned
 * (`ObstaclesManager.totalRowsGenerated`, same basis as `proceduralStreamSalt`).
 * Safe for worklets: plain numbers + `Math` only.
 *
 * Several knobs use **min/max pairs** at ramp start (easy) and end (hard). Difficulty lerps
 * between the two endpoint ranges, then a deterministic `varianceU32` picks an inclusive value
 * inside the lerped range so layouts stay worklet-safe but less repetitive.
 */

import { intMod, mixU32, unitFloatFromU32 } from '@/Game/path/deterministicMix';
import { FALSE_WALL_MIN_PHASE_ROWS_SINGLE_SEGMENT } from '@/Layout';

export const gapDifficultyRampTuning = {
  /**
   * After this many total spawned rows (including runway duplicates), difficulty reaches 1
   * and stays at floor values. Larger = slower ramp (easier for longer).
   */
  ROWS_FOR_FULL_RAMP: 2400,
  /**
   * Shape of the ramp vs linear progress `p = clamp(totalRows / ROWS_FOR_FULL_RAMP, 0, 1)`:
   * - `1` — linear
   * - `> 1` — ramps slowly at first, accelerates late (stays forgiving longer)
   * - `< 1` — ramps quickly at first, eases toward the end
   */
  CURVE_EXPONENT: 0.55,

  /** Extra stacked rows after a lateral gap change (see `appendGapShiftRunwayRows`). Inclusive. */
  RUNWAY_DUP_ROWS_START_MIN: 5,
  RUNWAY_DUP_ROWS_START_MAX: 8,
  RUNWAY_DUP_ROWS_END_MIN: 0,
  RUNWAY_DUP_ROWS_END_MAX: 2,

  /**
   * Multipath contiguous gap width as **fractions** of `rowLength`, converted to integer columns.
   * This keeps FLOW readable on narrow grids (e.g. 9 columns) and preserves fork potential.
   */
  MULTIPATH_MIN_GAP_FRAC_START_MIN: 0.22,
  MULTIPATH_MIN_GAP_FRAC_START_MAX: 0.33,
  MULTIPATH_MIN_GAP_FRAC_END_MIN: 0.11,
  MULTIPATH_MIN_GAP_FRAC_END_MAX: 0.22,
  /**
   * Hard cap on span (as fraction of rowLength) before applying `rowLength * ROW_LENGTH_WIDTH_FRAC_*`.
   * Acts as a primary maximum corridor width for multipath.
   */
  MULTIPATH_MAX_GAP_FRAC_CAP_START_MIN: 0.44,
  MULTIPATH_MAX_GAP_FRAC_CAP_START_MAX: 0.55,
  MULTIPATH_MAX_GAP_FRAC_CAP_END_MIN: 0.22,
  MULTIPATH_MAX_GAP_FRAC_CAP_END_MAX: 0.33,
  ROW_LENGTH_WIDTH_FRAC_START_MIN: 0.66,
  ROW_LENGTH_WIDTH_FRAC_START_MAX: 0.76,
  ROW_LENGTH_WIDTH_FRAC_END_MIN: 0.45,
  ROW_LENGTH_WIDTH_FRAC_END_MAX: 0.55,

  /**
   * Single-corridor drift (`generateGapsDeterministic`): while difficulty01 is below this,
   * include adjacent columns (±1) when shifting; at/above, only the core column(s) from the
   * left/right pick (narrower corridor over time).
   */
  SINGLE_PATH_INCLUDE_ADJACENT_UNTIL_DIFFICULTY: 0.55,

  /**
   * First-row multipath seed: threshold below which a width of 3 columns is preferred over 2.
   * Rises with difficulty so early rows start narrower.
   */
  MULTIPATH_INITIAL_WIDE_WIDTH_THRESHOLD_START: 0.55,
  MULTIPATH_INITIAL_WIDE_WIDTH_THRESHOLD_END: 0.82,

  /**
   * Procedural **segment row counts** (funnel, pinball, …): same `gapDifficulty01FromTotalRows`
   * curve as gaps/runway. Start = early run (shorter segments), end = fully ramped (longer paths).
   * Keep funnel min ≥ `TENSION_FUNNEL_START_WIDTH` (5) in `tensionGenerators.ts` so the gap reaches width 1.
   */
  TENSION_FUNNEL_ROWS_START_MIN: 8,
  TENSION_FUNNEL_ROWS_START_MAX: 15,
  TENSION_FUNNEL_ROWS_END_MIN: 15,
  TENSION_FUNNEL_ROWS_END_MAX: 24,

  /** Pinball segment length in rows; min ≥ 4. One pinball **macro cycle** is `driftCount + 1` rows (2–6 drift + hop) from `createClimaxPinballRollState`. */
  CLIMAX_PINBALL_SEGMENT_ROWS_START_MIN: 9,
  CLIMAX_PINBALL_SEGMENT_ROWS_START_MAX: 15,
  CLIMAX_PINBALL_SEGMENT_ROWS_END_MIN: 15,
  CLIMAX_PINBALL_SEGMENT_ROWS_END_MAX: 24,

  /** False wall: multi-segment cavern→squeeze blocks + full-width gap rows between (`climaxFalseWallRow`). */
  CLIMAX_FALSE_WALL_ROWS_START_MIN: 8,
  CLIMAX_FALSE_WALL_ROWS_START_MAX: 12,
  CLIMAX_FALSE_WALL_ROWS_END_MIN: 15,
  CLIMAX_FALSE_WALL_ROWS_END_MAX: 24,

  /** `base` template FLOW: chute rows before switching to chicane. */
  FLOW_CHUTE_ROWS_BEFORE_CHICANE_START_MIN: 20,
  FLOW_CHUTE_ROWS_BEFORE_CHICANE_START_MAX: 32,
  FLOW_CHUTE_ROWS_BEFORE_CHICANE_END_MIN: 32,
  FLOW_CHUTE_ROWS_BEFORE_CHICANE_END_MAX: 48,

  /** Release cathartic full-width strip row count. */
  RELEASE_REST_ZONE_ROWS_START_MIN: 6,
  RELEASE_REST_ZONE_ROWS_START_MAX: 10,
  RELEASE_REST_ZONE_ROWS_END_MIN: 12,
  RELEASE_REST_ZONE_ROWS_END_MAX: 18,

  /**
   * Macro pacing: rows per **FLOW / TENSION / CLIMAX / RELEASE** phase within one cycle.
   * Same difficulty curve as gaps; lengths widen as `cycleStartTotalRows` approaches full ramp.
   * Inner path segments (funnel, pinball, …) clamp to the picked phase row budgets for that cycle.
   */
  FLOW_PHASE_ROWS_START_MIN: 34,
  FLOW_PHASE_ROWS_START_MAX: 50,
  FLOW_PHASE_ROWS_END_MIN: 52,
  FLOW_PHASE_ROWS_END_MAX: 80,
  FLOW_PHASE_ROWS_HARD_MIN: 25,

  TENSION_PHASE_ROWS_START_MIN: 25,
  TENSION_PHASE_ROWS_START_MAX: 36,
  TENSION_PHASE_ROWS_END_MIN: 38,
  TENSION_PHASE_ROWS_END_MAX: 60,
  TENSION_PHASE_ROWS_HARD_MIN: 15,

  CLIMAX_PHASE_ROWS_START_MIN: 32,
  CLIMAX_PHASE_ROWS_START_MAX: 50,
  CLIMAX_PHASE_ROWS_END_MIN: 52,
  CLIMAX_PHASE_ROWS_END_MAX: 80,
  CLIMAX_PHASE_ROWS_HARD_MIN: 10,

  RELEASE_PHASE_ROWS_START_MIN: 16,
  RELEASE_PHASE_ROWS_START_MAX: 22,
  RELEASE_PHASE_ROWS_END_MIN: 3,
  RELEASE_PHASE_ROWS_END_MAX: 8,
  RELEASE_PHASE_ROWS_HARD_MIN: 3,
} as const;

/** ~10 full difficulty ramps for `runDepthTensionBonus01` long-run bias (was fixed cycle×10). */
export const OBSTACLE_PACING_RUN_DEPTH_DIVISOR = Math.max(
  1,
  gapDifficultyRampTuning.ROWS_FOR_FULL_RAMP
) * 10;

/** Keep in sync with `TENSION_FUNNEL_START_WIDTH` in `tensionGenerators.ts`. */
const TENSION_FUNNEL_MIN_DURATION_ROWS = 5;

function clamp01(x: number): number {
  'worklet';
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return x;
}

function lerpNum(a: number, b: number, d: number): number {
  'worklet';
  return a + (b - a) * d;
}

function intInclusiveFromU32(u: number, lo: number, hi: number): number {
  'worklet';
  const a = Math.min(lo, hi);
  const b = Math.max(lo, hi);
  const span = b - a + 1;
  if (span <= 1) return a;
  return a + intMod(u, span);
}

/**
 * Difficulty lerps each endpoint (start min/max toward end min/max), then picks one inclusive
 * integer in the resulting band using `pickU32` (deterministic).
 */
function intFromRampedRange(
  d: number,
  startMin: number,
  startMax: number,
  endMin: number,
  endMax: number,
  pickU32: number
): number {
  'worklet';
  const loRounded = Math.round(lerpNum(startMin, endMin, d));
  const hiRounded = Math.round(lerpNum(startMax, endMax, d));
  const lo = Math.min(loRounded, hiRounded);
  const hi = Math.max(loRounded, hiRounded);
  return intInclusiveFromU32(pickU32 >>> 0, lo, hi);
}

function rowParamSubmix(rowStreamSeed: number, tag: number): number {
  'worklet';
  return mixU32(rowStreamSeed >>> 0, tag >>> 0, 0xb5297a4d);
}

/** 0 = start of run (widest gaps / most runway), 1 = fully ramped (hardest floor). */
export function gapDifficulty01FromTotalRows(totalRowsGenerated: number): number {
  'worklet';
  const span = gapDifficultyRampTuning.ROWS_FOR_FULL_RAMP;
  if (span <= 0) return 1;
  const p = clamp01(totalRowsGenerated / span);
  const e = gapDifficultyRampTuning.CURVE_EXPONENT as number;
  return Math.pow(p, e);
}

export type PacingCyclePhaseRowCounts = {
  flowRows: number;
  tensionRows: number;
  climaxRows: number;
  releaseRows: number;
};

/** Row counts for one macro cycle that **starts** at `cycleStartTotalRows` (spawn counter basis). */
export function pacingCycleLayoutFromCycleStart(
  cycleStartTotalRows: number
): PacingCyclePhaseRowCounts {
  'worklet';
  const d = gapDifficulty01FromTotalRows(cycleStartTotalRows);
  const t = gapDifficultyRampTuning;
  const s = Math.floor(Math.max(0, cycleStartTotalRows));

  const flowRows = Math.max(
    t.FLOW_PHASE_ROWS_HARD_MIN,
    intFromRampedRange(
      d,
      t.FLOW_PHASE_ROWS_START_MIN,
      t.FLOW_PHASE_ROWS_START_MAX,
      t.FLOW_PHASE_ROWS_END_MIN,
      t.FLOW_PHASE_ROWS_END_MAX,
      mixU32(s >>> 0, 0x50414301, 0xf00d)
    )
  );

  const tensionRows = Math.max(
    t.TENSION_PHASE_ROWS_HARD_MIN,
    intFromRampedRange(
      d,
      t.TENSION_PHASE_ROWS_START_MIN,
      t.TENSION_PHASE_ROWS_START_MAX,
      t.TENSION_PHASE_ROWS_END_MIN,
      t.TENSION_PHASE_ROWS_END_MAX,
      mixU32(s >>> 0, 0x50414302, 0xf00d)
    )
  );

  const climaxRows = Math.max(
    t.CLIMAX_PHASE_ROWS_HARD_MIN,
    intFromRampedRange(
      d,
      t.CLIMAX_PHASE_ROWS_START_MIN,
      t.CLIMAX_PHASE_ROWS_START_MAX,
      t.CLIMAX_PHASE_ROWS_END_MIN,
      t.CLIMAX_PHASE_ROWS_END_MAX,
      mixU32(s >>> 0, 0x50414303, 0xf00d)
    )
  );

  const releaseRows = Math.max(
    t.RELEASE_PHASE_ROWS_HARD_MIN,
    intFromRampedRange(
      d,
      t.RELEASE_PHASE_ROWS_START_MIN,
      t.RELEASE_PHASE_ROWS_START_MAX,
      t.RELEASE_PHASE_ROWS_END_MIN,
      t.RELEASE_PHASE_ROWS_END_MAX,
      mixU32(s >>> 0, 0x50414304, 0xf00d)
    )
  );

  return { flowRows, tensionRows, climaxRows, releaseRows };
}

/**
 * @param varianceU32 — e.g. `mixU32(totalRows, rowIndex, salt)` so duplicate runway depth varies
 * per spawn while staying deterministic in worklets.
 */
export function gapShiftRunwayDupRowsFromTotalRows(
  totalRowsGenerated: number,
  varianceU32: number
): number {
  'worklet';
  const d = gapDifficulty01FromTotalRows(totalRowsGenerated);
  const t = gapDifficultyRampTuning;
  return Math.max(
    0,
    intFromRampedRange(
      d,
      t.RUNWAY_DUP_ROWS_START_MIN,
      t.RUNWAY_DUP_ROWS_START_MAX,
      t.RUNWAY_DUP_ROWS_END_MIN,
      t.RUNWAY_DUP_ROWS_END_MAX,
      varianceU32
    )
  );
}

/**
 * @param rowStreamSeed — fold path row identity, e.g. `mixPathRowStreamSalt(..., 705)`, so
 * min/max gap columns and width fraction vary per row but stay replay-stable.
 */
export function multipathGapWidthParamsFromTotalRows(
  totalRowsGenerated: number,
  rowLength: number,
  rowStreamSeed: number
): { minW: number; maxW: number; initialWideThreshold: number } {
  'worklet';
  const d = gapDifficulty01FromTotalRows(totalRowsGenerated);
  const t = gapDifficultyRampTuning;

  const colsFromRampedFrac = (
    startMinF: number,
    startMaxF: number,
    endMinF: number,
    endMaxF: number,
    pickU32: number
  ): number => {
    'worklet';
    if (!Number.isFinite(rowLength) || rowLength <= 0) return 1;
    const lo = lerpNum(startMinF, endMinF, d);
    const hi = lerpNum(startMaxF, endMaxF, d);
    const fa = Math.min(lo, hi);
    const fb = Math.max(lo, hi);
    const frac = fa + unitFloatFromU32(pickU32) * (fb - fa);
    const cols = Math.round(rowLength * frac);
    return Math.max(1, Math.min(rowLength, cols));
  };

  const minW = colsFromRampedFrac(
    t.MULTIPATH_MIN_GAP_FRAC_START_MIN,
    t.MULTIPATH_MIN_GAP_FRAC_START_MAX,
    t.MULTIPATH_MIN_GAP_FRAC_END_MIN,
    t.MULTIPATH_MIN_GAP_FRAC_END_MAX,
    rowParamSubmix(rowStreamSeed, 1)
  );

  const maxCap = Math.max(
    minW,
    colsFromRampedFrac(
      t.MULTIPATH_MAX_GAP_FRAC_CAP_START_MIN,
      t.MULTIPATH_MAX_GAP_FRAC_CAP_START_MAX,
      t.MULTIPATH_MAX_GAP_FRAC_CAP_END_MIN,
      t.MULTIPATH_MAX_GAP_FRAC_CAP_END_MAX,
      rowParamSubmix(rowStreamSeed, 2)
    )
  );

  const fracLo = lerpNum(t.ROW_LENGTH_WIDTH_FRAC_START_MIN, t.ROW_LENGTH_WIDTH_FRAC_END_MIN, d);
  const fracHi = lerpNum(t.ROW_LENGTH_WIDTH_FRAC_START_MAX, t.ROW_LENGTH_WIDTH_FRAC_END_MAX, d);
  const fa = Math.min(fracLo, fracHi);
  const fb = Math.max(fracLo, fracHi);
  const frac = fa + unitFloatFromU32(rowParamSubmix(rowStreamSeed, 3)) * (fb - fa);

  const maxW = Math.max(minW, Math.min(maxCap, Math.floor(rowLength * frac)));

  const initialWideThreshold =
    t.MULTIPATH_INITIAL_WIDE_WIDTH_THRESHOLD_START +
    (t.MULTIPATH_INITIAL_WIDE_WIDTH_THRESHOLD_END - t.MULTIPATH_INITIAL_WIDE_WIDTH_THRESHOLD_START) *
    d;

  return { minW, maxW, initialWideThreshold };
}

function pathSegmentIntClamped(
  d: number,
  startMin: number,
  startMax: number,
  endMin: number,
  endMax: number,
  pickU32: number,
  hardMin: number,
  hardMax: number
): number {
  'worklet';
  const v = intFromRampedRange(d, startMin, startMax, endMin, endMax, pickU32);
  return Math.max(hardMin, Math.min(hardMax, v));
}

/** Funnel rows for this tension visit (≥ width ramp so gap reaches 1-wide). */
export function pathSegmentTensionFunnelDurationRows(
  totalRowsGenerated: number,
  varianceU32: number,
  tensionPhaseRowBudget?: number
): number {
  'worklet';
  const d = gapDifficulty01FromTotalRows(totalRowsGenerated);
  const t = gapDifficultyRampTuning;
  let v = pathSegmentIntClamped(
    d,
    t.TENSION_FUNNEL_ROWS_START_MIN,
    t.TENSION_FUNNEL_ROWS_START_MAX,
    t.TENSION_FUNNEL_ROWS_END_MIN,
    t.TENSION_FUNNEL_ROWS_END_MAX,
    varianceU32,
    TENSION_FUNNEL_MIN_DURATION_ROWS,
    24
  );
  if (tensionPhaseRowBudget != null && Number.isFinite(tensionPhaseRowBudget)) {
    const cap = Math.max(
      TENSION_FUNNEL_MIN_DURATION_ROWS,
      Math.floor(tensionPhaseRowBudget) - 6
    );
    v = Math.min(v, cap);
  }
  return v;
}

export function pathSegmentClimaxPinballSegmentRows(
  totalRowsGenerated: number,
  varianceU32: number,
  climaxPhaseRowBudget?: number
): number {
  'worklet';
  const d = gapDifficulty01FromTotalRows(totalRowsGenerated);
  const t = gapDifficultyRampTuning;
  let v = pathSegmentIntClamped(
    d,
    t.CLIMAX_PINBALL_SEGMENT_ROWS_START_MIN,
    t.CLIMAX_PINBALL_SEGMENT_ROWS_START_MAX,
    t.CLIMAX_PINBALL_SEGMENT_ROWS_END_MIN,
    t.CLIMAX_PINBALL_SEGMENT_ROWS_END_MAX,
    varianceU32,
    4,
    32
  );
  if (climaxPhaseRowBudget != null && Number.isFinite(climaxPhaseRowBudget)) {
    const cap = Math.max(4, Math.floor(climaxPhaseRowBudget) - 4);
    v = Math.min(v, cap);
  }
  return v;
}

export function pathSegmentClimaxFalseWallTotalRows(
  totalRowsGenerated: number,
  varianceU32: number,
  climaxPhaseRowBudget?: number,
  pinballSegmentRows?: number
): number {
  'worklet';
  const d = gapDifficulty01FromTotalRows(totalRowsGenerated);
  const t = gapDifficultyRampTuning;
  let v = pathSegmentIntClamped(
    d,
    t.CLIMAX_FALSE_WALL_ROWS_START_MIN,
    t.CLIMAX_FALSE_WALL_ROWS_START_MAX,
    t.CLIMAX_FALSE_WALL_ROWS_END_MIN,
    t.CLIMAX_FALSE_WALL_ROWS_END_MAX,
    varianceU32,
    FALSE_WALL_MIN_PHASE_ROWS_SINGLE_SEGMENT,
    28
  );
  if (climaxPhaseRowBudget != null && Number.isFinite(climaxPhaseRowBudget)) {
    const bud = Math.floor(climaxPhaseRowBudget);
    const minFw = FALSE_WALL_MIN_PHASE_ROWS_SINGLE_SEGMENT;
    const maxByBudget =
      pinballSegmentRows != null && Number.isFinite(pinballSegmentRows)
        ? Math.max(minFw, bud - Math.max(0, Math.floor(pinballSegmentRows)))
        : Math.max(minFw, bud);
    v = Math.min(v, maxByBudget);
  }
  return Math.max(FALSE_WALL_MIN_PHASE_ROWS_SINGLE_SEGMENT, v);
}

export function pathSegmentFlowChuteRowsBeforeChicane(
  totalRowsGenerated: number,
  varianceU32: number,
  flowPhaseRowBudget?: number
): number {
  'worklet';
  const d = gapDifficulty01FromTotalRows(totalRowsGenerated);
  const t = gapDifficultyRampTuning;
  let v = pathSegmentIntClamped(
    d,
    t.FLOW_CHUTE_ROWS_BEFORE_CHICANE_START_MIN,
    t.FLOW_CHUTE_ROWS_BEFORE_CHICANE_START_MAX,
    t.FLOW_CHUTE_ROWS_BEFORE_CHICANE_END_MIN,
    t.FLOW_CHUTE_ROWS_BEFORE_CHICANE_END_MAX,
    varianceU32,
    8,
    48
  );
  if (flowPhaseRowBudget != null && Number.isFinite(flowPhaseRowBudget)) {
    const cap = Math.max(8, Math.floor(flowPhaseRowBudget) - 4);
    v = Math.min(v, cap);
  }
  return v;
}

export function pathSegmentReleaseRestZoneRows(
  totalRowsGenerated: number,
  varianceU32: number,
  releasePhaseRowBudget?: number
): number {
  'worklet';
  const d = gapDifficulty01FromTotalRows(totalRowsGenerated);
  const t = gapDifficultyRampTuning;
  let v = pathSegmentIntClamped(
    d,
    t.RELEASE_REST_ZONE_ROWS_START_MIN,
    t.RELEASE_REST_ZONE_ROWS_START_MAX,
    t.RELEASE_REST_ZONE_ROWS_END_MIN,
    t.RELEASE_REST_ZONE_ROWS_END_MAX,
    varianceU32,
    3,
    30
  );
  if (releasePhaseRowBudget != null && Number.isFinite(releasePhaseRowBudget)) {
    const cap = Math.max(3, Math.floor(releasePhaseRowBudget) - 1);
    v = Math.min(v, cap);
  }
  return v;
}
