import { getColumnCenterX } from '@/Layout';

/** Solid column world X centers from gap mask (worklet-safe). */
export const solidColumnCentersFromGaps = (
  gaps: readonly number[],
  rowLength: number,
  containerCenterX: number,
  columnGridWidth: number
): number[] => {
  'worklet';
  const gapSet = new Set(gaps);
  const centers: number[] = [];
  for (let col = 0; col < rowLength; col++) {
    if (!gapSet.has(col)) {
      centers.push(getColumnCenterX(col, containerCenterX, columnGridWidth));
    }
  }
  return centers;
};
