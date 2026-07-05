import type { GridSpanWorldRect } from '@/Game/grid/types';

export const gridSpanToWorld = (args: {
  slabStart: number;
  slabEnd: number;
  rowYs: number[];
  leftX: number;
  columnWidth: number;
  blockHeight: number;
  rowPitch: number;
  columns: number;
}): GridSpanWorldRect => {
  'worklet';
  const { slabStart, slabEnd, rowYs, leftX, columnWidth, blockHeight, rowPitch, columns } =
    args;
  const rowCount = rowYs.length;
  let centerY = 0;
  for (let i = 0; i < rowCount; i++) {
    centerY += rowYs[i];
  }
  centerY = rowCount > 0 ? centerY / rowCount : 0;

  const slabWidthCols = Math.max(0, slabEnd - slabStart);
  const width = slabWidthCols * columnWidth;
  const height = rowCount > 0 ? (rowCount - 1) * rowPitch + blockHeight : blockHeight;

  const columnGridWidth = columnWidth * columns;
  const rowCenterX = leftX + columnGridWidth / 2;
  const slabCenterCol = (slabStart + slabEnd) * 0.5;
  const slabWorldX =
    leftX + (slabCenterCol + 0.5) * columnWidth - columnWidth * 0.5;
  const localSlabX = slabWorldX - rowCenterX;

  return {
    centerX: rowCenterX,
    centerY,
    width,
    height,
    localSlabX,
    rowCenterX,
  };
};
