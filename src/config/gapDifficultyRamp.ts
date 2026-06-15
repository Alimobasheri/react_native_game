/**
 * Scales procedural gap widths and gap-shift runway row count with how many obstacle rows
 * have been spawned (`ObstaclesManager.totalRowsGenerated`, same basis as `proceduralStreamSalt`).
 * Safe for worklets: plain numbers + `Math` only.
 */

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

  /** Extra stacked rows after a lateral gap change (see `appendGapShiftRunwayRows`). */
  RUNWAY_DUP_ROWS_START: 7,
  RUNWAY_DUP_ROWS_END: 0,

  /** Multipath contiguous gap width (columns), clamped to row and seam logic. */
  MULTIPATH_MIN_GAP_COLS_START: 5,
  MULTIPATH_MIN_GAP_COLS_END: 2,
  /** Hard cap on span before `rowLength * fraction` clamp. */
  MULTIPATH_MAX_GAP_COLS_CAP_START: 9,
  MULTIPATH_MAX_GAP_COLS_CAP_END: 6,
  ROW_LENGTH_WIDTH_FRAC_START: 0.9,
  ROW_LENGTH_WIDTH_FRAC_END: 0.5,

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
} as const;

function clamp01(x: number): number {
  'worklet';
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return x;
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

export function gapShiftRunwayDupRowsFromTotalRows(totalRowsGenerated: number): number {
  'worklet';
  const d = gapDifficulty01FromTotalRows(totalRowsGenerated);
  const a = gapDifficultyRampTuning.RUNWAY_DUP_ROWS_START;
  const b = gapDifficultyRampTuning.RUNWAY_DUP_ROWS_END;
  const lerped = a + (b - a) * d;
  return Math.max(0, Math.round(lerped));
}

export function multipathGapWidthParamsFromTotalRows(
  totalRowsGenerated: number,
  rowLength: number
): { minW: number; maxW: number; initialWideThreshold: number } {
  'worklet';
  const d = gapDifficulty01FromTotalRows(totalRowsGenerated);
  const t = gapDifficultyRampTuning;

  const minW = Math.max(
    1,
    Math.round(
      t.MULTIPATH_MIN_GAP_COLS_START +
      (t.MULTIPATH_MIN_GAP_COLS_END - t.MULTIPATH_MIN_GAP_COLS_START) * d
    )
  );

  const maxCap = Math.max(
    minW,
    Math.round(
      t.MULTIPATH_MAX_GAP_COLS_CAP_START +
      (t.MULTIPATH_MAX_GAP_COLS_CAP_END - t.MULTIPATH_MAX_GAP_COLS_CAP_START) * d
    )
  );

  const frac =
    t.ROW_LENGTH_WIDTH_FRAC_START +
    (t.ROW_LENGTH_WIDTH_FRAC_END - t.ROW_LENGTH_WIDTH_FRAC_START) * d;

  const maxW = Math.max(minW, Math.min(maxCap, Math.floor(rowLength * frac)));

  const initialWideThreshold =
    t.MULTIPATH_INITIAL_WIDE_WIDTH_THRESHOLD_START +
    (t.MULTIPATH_INITIAL_WIDE_WIDTH_THRESHOLD_END - t.MULTIPATH_INITIAL_WIDE_WIDTH_THRESHOLD_START) *
    d;

  return { minW, maxW, initialWideThreshold };
}
