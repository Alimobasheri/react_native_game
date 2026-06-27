/**
 * Layout constants for the swimmer game
 */

/**
 * Resting water surface Y: **fraction of container height measured up from the container bottom**.
 * Not defined relative to `centerY` as a reference point—only `centerY` + `height` are used to locate the bottom edge.
 * - `0` → surface on the bottom edge
 * - `1/3` → one third of a container height above the bottom
 * - `1/2` → mid container (same as old “surface at centerY” when center is geometric center)
 * - `1` → top edge
 */
export const WATER_SURFACE_FROM_CONTAINER_BOTTOM_FRACTION = 1 / 3;

export const getWaterSurfaceRestY = (
  containerCenterY: number,
  containerHeight: number
): number => {
  'worklet';
  const h = Math.max(1, containerHeight);
  const f = Math.max(0, Math.min(1, WATER_SURFACE_FROM_CONTAINER_BOTTOM_FRACTION));
  const bottomY = containerCenterY + h * 0.5;
  return bottomY - f * h;
};

export const LAYOUT_CONSTANTS = {
  // Grid layout constants
  COLUMNS: 8,

  // Get obstacle width based on container width


  // Screen height thresholds
  INITIAL_OBSTACLE_THRESHOLD: 0.3, // 30% of screen height - no obstacles below this

  // Removal threshold - remove when obstacle passes 100% of screen height
  REMOVAL_THRESHOLD_OFFSET: 100, // Extra buffer in pixels
} as const;

/**
 * Minimum cavern (wide open-band) rows before each false-wall squeeze row.
 * Intentionally uses `LAYOUT_CONSTANTS.COLUMNS` only — not runway `row_dup` / gap-shift spacing.
 */
export const FALSE_WALL_MIN_CAVERN_ROWS_BEFORE_SQUEEZE =
  LAYOUT_CONSTANTS.COLUMNS - 2;

/** Minimum obstacle rows for one false-wall micro-segment (cavern rows + one squeeze row). */
export const FALSE_WALL_MIN_PHASE_ROWS_SINGLE_SEGMENT =
  FALSE_WALL_MIN_CAVERN_ROWS_BEFORE_SQUEEZE + 1;

/**
 * Gap-shift runway duplicate row count is scaled at runtime from
 * `ObstaclesManager.totalRowsGenerated` — see `gapDifficultyRampTuning` in
 * `src/config/gapDifficultyRamp.ts`.
 */

export const getObstacleWidth = (containerWidth: number): number => {
  'worklet';
  return containerWidth / LAYOUT_CONSTANTS.COLUMNS;
}

// Get number of visible rows from container height and block row height (not column width).
export const getRows = (containerHeight: number, blockHeight: number): number => {
  'worklet';
  return Math.floor(containerHeight / blockHeight);
}

// Get center X of a column (for swimmer or any grid-aligned entity)
export const getColumnCenterX = (
  column: number,
  containerCenterX: number,
  containerWidth: number
): number => {
  'worklet';
  const columnWidth = containerWidth / LAYOUT_CONSTANTS.COLUMNS;
  return containerCenterX - containerWidth / 2 + columnWidth * column + columnWidth / 2;
};

// Get grid positions for obstacles
export const getGridPosition = (
  column: number,
  row: number,
  containerCenterX: number,
  containerCenterY: number,
  containerWidth: number,
  containerHeight: number,
  blockHeight?: number
): { x: number; y: number } => {
  'worklet';
  const obstacleWidth = getObstacleWidth(containerWidth);
  const rowHeight = blockHeight ?? obstacleWidth;
  const rows = getRows(containerHeight, rowHeight);

  // Calculate x position (centered in column)
  const columnWidth = containerWidth / LAYOUT_CONSTANTS.COLUMNS;
  const x = containerCenterX - containerWidth / 2 + columnWidth * column + columnWidth / 2;

  // Calculate y position (centered in row)
  const y = containerCenterY - containerHeight / 2 + rowHeight * row + rowHeight / 2;

  return { x, y };
}