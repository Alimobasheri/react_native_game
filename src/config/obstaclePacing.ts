/**
 * Reference **midpoint** macro phase row counts (legacy ~80-row cycle shape).
 *
 * Live pacing uses **ranged** phase lengths that grow with total spawned rows; see
 * `pacingCycleLayoutFromCycleStart` / `getPacingCycleState` in `gapDifficultyRamp.ts` and
 * `pacingDirector.ts`. `totalRowsGenerated` in ObstacleSystem indexes those dynamic cycles.
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

/** Sum of reference phase row counts (documentation / rough scale only). */
export const OBSTACLE_PACING_CYCLE_ROW_COUNT =
  obstaclePacingTuning.FLOW_ROW_COUNT +
  obstaclePacingTuning.TENSION_ROW_COUNT +
  obstaclePacingTuning.CLIMAX_ROW_COUNT +
  obstaclePacingTuning.RELEASE_ROW_COUNT;

export { OBSTACLE_PACING_RUN_DEPTH_DIVISOR } from '@/config/gapDifficultyRamp';
