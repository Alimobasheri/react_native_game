import { swimmerVisualTuning } from '@/config/swimmerVisualTuning';
import { LAYOUT_CONSTANTS } from '@/Layout';
import type {
  BlockSize,
  CollisionRow,
  ContainerLayout,
} from '@/Game/collision/swimmerBlockCollision';

const clamp01 = (value: number): number => {
  'worklet';
  return Math.max(0, Math.min(1, value));
};

/** Gap width in pixels that contains `swimmerX` on a single obstacle row. */
export const gapWidthAtSwimmerX = (
  row: CollisionRow,
  swimmerX: number,
  container: ContainerLayout
): number => {
  'worklet';
  const columnCount = container.columnCount ?? LAYOUT_CONSTANTS.COLUMNS;
  const columnWidth = container.width / columnCount;
  const containerLeft = container.centerX - container.width / 2;
  const col = Math.floor((swimmerX - containerLeft) / columnWidth);

  if (col < 0 || col >= columnCount) {
    return 0;
  }

  const gapSet = new Set<number>();
  for (let g = 0; g < row.gaps.length; g++) {
    gapSet.add(row.gaps[g]);
  }

  if (!gapSet.has(col)) {
    return 0;
  }

  let leftCol = col;
  let rightCol = col;
  while (leftCol > 0 && gapSet.has(leftCol - 1)) {
    leftCol -= 1;
  }
  while (rightCol < columnCount - 1 && gapSet.has(rightCol + 1)) {
    rightCol += 1;
  }

  return (rightCol - leftCol + 1) * columnWidth;
};

/**
 * Estimate horizontal clearance near the swimmer from nearby obstacle rows.
 * Returns the minimum contiguous gap width across sampled rows, or open-water
 * default when no rows are present.
 */
export const sampleHorizontalClearancePx = (
  swimmerX: number,
  rows: readonly CollisionRow[],
  container: ContainerLayout,
  _blockSize: BlockSize
): number => {
  'worklet';
  if (rows.length === 0) {
    return swimmerVisualTuning.OPEN_WATER_CLEARANCE_PX;
  }

  let minGap = Number.POSITIVE_INFINITY;
  for (let i = 0; i < rows.length; i++) {
    const gapWidth = gapWidthAtSwimmerX(rows[i], swimmerX, container);
    if (gapWidth > 0 && gapWidth < minGap) {
      minGap = gapWidth;
    }
  }

  if (!Number.isFinite(minGap)) {
    return swimmerVisualTuning.OPEN_WATER_CLEARANCE_PX;
  }
  return minGap;
};

export const clearance01FromPx = (clearancePx: number): number => {
  'worklet';
  const narrow = swimmerVisualTuning.NARROW_GAP_CLEARANCE_PX;
  const open = swimmerVisualTuning.OPEN_WATER_CLEARANCE_PX;
  const range = Math.max(1, open - narrow);
  return clamp01((clearancePx - narrow) / range);
};
