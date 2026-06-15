/**
 * Macro obstacle row pacing: lengths of each phase within one cycle, then repeat.
 * Safe for worklets: plain numeric constants only.
 *
 * `totalRowsGenerated` in ObstacleSystem (including runway duplicate rows) indexes this cycle.
 */

export const obstaclePacingTuning = {
  /** Rows in FLOW (multipath / relaxed procedural). */
  FLOW_ROW_COUNT: 30,
  /** Rows in TENSION (funnel, paradox, then multipath in-tension). */
  TENSION_ROW_COUNT: 20,
  /** Rows in CLIMAX (pinball, false wall, multipath in-climax). */
  CLIMAX_ROW_COUNT: 15,
  /** Rows in RELEASE (cathartic strip + multipath in-release). */
  RELEASE_ROW_COUNT: 15,
} as const;

/** Sum of phase row counts; modulo base for `pacingRowInCycle`. */
export const OBSTACLE_PACING_CYCLE_ROW_COUNT =
  obstaclePacingTuning.FLOW_ROW_COUNT +
  obstaclePacingTuning.TENSION_ROW_COUNT +
  obstaclePacingTuning.CLIMAX_ROW_COUNT +
  obstaclePacingTuning.RELEASE_ROW_COUNT;

/**
 * Long-run procedural bias in `runDepthTensionBonus01`: scales with cycle length
 * (~10 full cycles before bonus approaches its cap).
 */
export const OBSTACLE_PACING_RUN_DEPTH_DIVISOR =
  OBSTACLE_PACING_CYCLE_ROW_COUNT * 10;

