/**
 * Layout constants for the swimmer game
 */

export const LAYOUT_CONSTANTS = {
  // Grid layout constants
  COLUMNS: 8,

  // Get obstacle width based on container width


  // Screen height thresholds
  INITIAL_OBSTACLE_THRESHOLD: 0.3, // 30% of screen height - no obstacles below this

  // Removal threshold - remove when obstacle passes 100% of screen height
  REMOVAL_THRESHOLD_OFFSET: 100, // Extra buffer in pixels
} as const;

export const getObstacleWidth = (containerWidth: number): number => {
  'worklet';
  return containerWidth / LAYOUT_CONSTANTS.COLUMNS;
}

// Get number of rows based on container height and obstacle width
export const getRows = (containerHeight: number, obstacleWidth: number): number => {
  'worklet';
  return Math.floor(containerHeight / obstacleWidth);
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
  containerHeight: number
): { x: number; y: number } => {
  'worklet';
  const obstacleWidth = getObstacleWidth(containerWidth);
  const rows = getRows(containerHeight, obstacleWidth);

  // Calculate x position (centered in column)
  const columnWidth = containerWidth / LAYOUT_CONSTANTS.COLUMNS;
  const x = containerCenterX - containerWidth / 2 + columnWidth * column + columnWidth / 2;

  // Calculate y position (centered in row)
  const rowHeight = containerHeight / rows;
  const y = containerCenterY - containerHeight / 2 + rowHeight * row + rowHeight / 2;

  return { x, y };
}