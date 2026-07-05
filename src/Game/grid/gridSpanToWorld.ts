import type { AABB } from '@/Game/collision/swimmerBlockCollision';
import type { GridSpanWorldRect } from '@/Game/grid/types';

export const slabAabbFromWorldRect = (rect: GridSpanWorldRect): AABB => {
  'worklet';
  const slabCenterX = rect.centerX + rect.localSlabX;
  const halfW = rect.width / 2;
  const halfH = rect.height / 2;
  return {
    minX: slabCenterX - halfW,
    maxX: slabCenterX + halfW,
    minY: rect.centerY - halfH,
    maxY: rect.centerY + halfH,
  };
};

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
