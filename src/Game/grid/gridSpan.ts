import type { PlatformShaftHazard } from '@/Game/path/platformShaft/types';
import type { GridSpan } from '@/Game/grid/types';

export const gridSpanFromHazard = (hazard: PlatformShaftHazard): GridSpan => {
  'worklet';
  const b = hazard.bounds;
  return {
    rowStart: b.rowStart,
    rowEnd: b.rowEnd,
    colStart: b.colStart,
    colEnd: b.colEnd,
  };
};

/** @deprecated Use gridSpanFromHazard */
export const gridSpanFromPlatformSlab = gridSpanFromHazard;

export const rowSpanOf = (span: GridSpan): number => {
  'worklet';
  return span.rowEnd - span.rowStart + 1;
};

export const validateGridSpan = (span: GridSpan, columns: number): string | null => {
  'worklet';
  if (span.rowEnd < span.rowStart) {
    return 'rowEnd < rowStart';
  }
  if (span.colEnd < span.colStart) {
    return 'colEnd < colStart';
  }
  if (span.colStart < 0 || span.colEnd >= columns) {
    return 'column out of bounds';
  }
  return null;
};
