import type { ComponentStore } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/component';
import type { Entity } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/entity';
import type { ObstacleRowComponentData } from '@/Game/ecs-components/ObstacleRowComponent';
import type { GridAnchor } from '@/Game/grid/types';
import { rowSpanOf } from '@/Game/grid/gridSpan';

export type BuildGridAnchorArgs = {
  beatRowStart: number;
  beatRowEnd: number;
  rowEntityIds: Entity[];
  shaftSegmentEpoch?: number;
};

export const buildGridAnchor = (
  beatRowStart: number,
  beatRowEnd: number,
  rowEntityIds: Entity[],
  shaftSegmentEpoch?: number
): GridAnchor => {
  'worklet';
  return {
    beatRowStart,
    beatRowEnd,
    rowEntityIds: rowEntityIds.slice(),
    shaftSegmentEpoch,
  };
};

export type ResolveRowEntitiesOptions = {
  shaftSegmentEpoch?: number;
};

export const resolveRowEntitiesForBeatRange = (
  rowStore: ComponentStore<ObstacleRowComponentData>,
  beatRowStart: number,
  beatRowEnd: number,
  options?: ResolveRowEntitiesOptions
): Entity[] => {
  'worklet';
  const epoch = options?.shaftSegmentEpoch;
  const out: Entity[] = [];
  for (let beat = beatRowStart; beat <= beatRowEnd; beat++) {
    let found: Entity | undefined;
    rowStore.forEach((entity, rowData) => {
      if (found !== undefined) {
        return;
      }
      if (rowData.beatRowIndex !== beat) {
        return;
      }
      if (epoch != null && rowData.shaftSegmentEpoch !== epoch) {
        return;
      }
      found = entity;
    });
    if (typeof found === 'number') {
      out.push(found);
    }
  }
  return out;
};

export const anchorRowYs = (
  anchor: GridAnchor,
  rowStore: ComponentStore<ObstacleRowComponentData>
): number[] => {
  'worklet';
  const ys: number[] = [];
  for (let i = 0; i < anchor.rowEntityIds.length; i++) {
    const row = rowStore.get(anchor.rowEntityIds[i]);
    if (row) {
      ys.push(row.y);
    }
  }
  return ys;
};

export const anchorCenterY = (
  anchor: GridAnchor,
  rowStore: ComponentStore<ObstacleRowComponentData>
): number | null => {
  'worklet';
  const ys = anchorRowYs(anchor, rowStore);
  if (ys.length === 0) {
    return null;
  }
  let sum = 0;
  for (let i = 0; i < ys.length; i++) {
    sum += ys[i];
  }
  return sum / ys.length;
};

export const anchorIsComplete = (
  anchor: GridAnchor,
  rowStore: ComponentStore<ObstacleRowComponentData>
): boolean => {
  'worklet';
  const expected = rowSpanOf({
    rowStart: anchor.beatRowStart,
    rowEnd: anchor.beatRowEnd,
    colStart: 0,
    colEnd: 0,
  });
  if (anchor.rowEntityIds.length < expected) {
    return false;
  }
  for (let i = 0; i < anchor.rowEntityIds.length; i++) {
    if (!rowStore.get(anchor.rowEntityIds[i])) {
      return false;
    }
  }
  return true;
};

export const anchorAllRowsDead = (
  anchor: GridAnchor,
  rowStore: ComponentStore<ObstacleRowComponentData>
): boolean => {
  'worklet';
  if (anchor.rowEntityIds.length === 0) {
    return true;
  }
  for (let i = 0; i < anchor.rowEntityIds.length; i++) {
    if (rowStore.get(anchor.rowEntityIds[i])) {
      return false;
    }
  }
  return true;
};

/** Drop dead entity IDs only — never re-resolve by beatRowIndex. */
export const healAnchorRowIds = (
  anchor: GridAnchor,
  rowStore: ComponentStore<ObstacleRowComponentData>
): GridAnchor => {
  'worklet';
  const live: Entity[] = [];
  for (let i = 0; i < anchor.rowEntityIds.length; i++) {
    const ent = anchor.rowEntityIds[i];
    if (rowStore.get(ent)) {
      live.push(ent);
    }
  }
  return {
    beatRowStart: anchor.beatRowStart,
    beatRowEnd: anchor.beatRowEnd,
    rowEntityIds: live,
    shaftSegmentEpoch: anchor.shaftSegmentEpoch,
  };
};

/** @deprecated Use healAnchorRowIds — beat re-resolve causes segment overlap bugs. */
export const tryRefreshAnchorRowIds = healAnchorRowIds;

export const rowEntityBeatIndex = (
  anchor: GridAnchor,
  rowEntity: Entity,
  rowStore: ComponentStore<ObstacleRowComponentData>
): number | null => {
  'worklet';
  const row = rowStore.get(rowEntity);
  return row?.beatRowIndex ?? null;
};
