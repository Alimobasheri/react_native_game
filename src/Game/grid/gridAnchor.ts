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

export const rowEntityMatchesBandBeat = (
  row: ObstacleRowComponentData,
  beat: number,
  shaftSegmentEpoch?: number
): boolean => {
  'worklet';
  if (row.beatRowIndex !== beat) {
    return false;
  }
  if (shaftSegmentEpoch != null && row.shaftSegmentEpoch !== shaftSegmentEpoch) {
    return false;
  }
  return true;
};

export const resolveRowEntityForBeat = (
  rowStore: ComponentStore<ObstacleRowComponentData>,
  beat: number,
  options?: ResolveRowEntitiesOptions
): Entity | undefined => {
  'worklet';
  const epoch = options?.shaftSegmentEpoch;
  let fallback: Entity | undefined;
  let chainPreferred: Entity | undefined;
  rowStore.forEach((entity, rowData) => {
    if (!rowEntityMatchesBandBeat(rowData, beat, epoch)) {
      return;
    }
    if (beat > 0) {
      const prev =
        rowData.prevRowEntity != null ? rowStore.get(rowData.prevRowEntity) : undefined;
      if (
        prev &&
        rowEntityMatchesBandBeat(prev, beat - 1, epoch) &&
        prev.beatRowIndex === beat - 1
      ) {
        chainPreferred = entity;
      }
    } else {
      const prev =
        rowData.prevRowEntity != null ? rowStore.get(rowData.prevRowEntity) : undefined;
      if (prev?.beatRowIndex != null && prev.beatRowIndex > beat) {
        chainPreferred = entity;
      }
    }
    fallback = entity;
  });
  return chainPreferred ?? fallback;
};

export const resolveRowEntitiesForBeatRange = (
  rowStore: ComponentStore<ObstacleRowComponentData>,
  beatRowStart: number,
  beatRowEnd: number,
  options?: ResolveRowEntitiesOptions
): Entity[] => {
  'worklet';
  const out: Entity[] = [];
  for (let beat = beatRowStart; beat <= beatRowEnd; beat++) {
    const found = resolveRowEntityForBeat(rowStore, beat, options);
    if (typeof found === 'number') {
      out.push(found);
    }
  }
  return out;
};

/** Drop recycled / stale entity IDs — row must still match band beat + epoch. */
export const healLiveMemberIdsForBand = (
  memberIds: readonly Entity[],
  rowStore: ComponentStore<ObstacleRowComponentData>,
  beatRowStart: number,
  beatRowEnd: number,
  shaftSegmentEpoch?: number
): Entity[] => {
  'worklet';
  const live: Entity[] = [];
  for (let i = 0; i < memberIds.length; i++) {
    const ent = memberIds[i];
    const row = rowStore.get(ent);
    if (!row || row.beatRowIndex == null) {
      continue;
    }
    if (row.beatRowIndex < beatRowStart || row.beatRowIndex > beatRowEnd) {
      continue;
    }
    if (!rowEntityMatchesBandBeat(row, row.beatRowIndex, shaftSegmentEpoch)) {
      continue;
    }
    live.push(ent);
  }
  live.sort((a, b) => {
    const beatA = rowStore.get(a)?.beatRowIndex ?? 0;
    const beatB = rowStore.get(b)?.beatRowIndex ?? 0;
    return beatA - beatB;
  });
  return live;
};

/** Heal stale members, then append any in-range beats not yet linked (never replace by re-resolve). */
export const growHazardBandMemberIds = (
  memberIds: readonly Entity[],
  rowStore: ComponentStore<ObstacleRowComponentData>,
  beatRowStart: number,
  beatRowEnd: number,
  shaftSegmentEpoch?: number
): Entity[] => {
  'worklet';
  const healed = healLiveMemberIdsForBand(
    memberIds,
    rowStore,
    beatRowStart,
    beatRowEnd,
    shaftSegmentEpoch
  );
  const beatsPresent = new Set<number>();
  for (let i = 0; i < healed.length; i++) {
    const beat = rowStore.get(healed[i])?.beatRowIndex;
    if (beat != null) {
      beatsPresent.add(beat);
    }
  }
  const out = healed.slice();
  for (let beat = beatRowStart; beat <= beatRowEnd; beat++) {
    if (beatsPresent.has(beat)) {
      continue;
    }
    const ent = resolveRowEntityForBeat(rowStore, beat, { shaftSegmentEpoch });
    if (typeof ent === 'number') {
      out.push(ent);
      beatsPresent.add(beat);
    }
  }
  out.sort((a, b) => {
    const beatA = rowStore.get(a)?.beatRowIndex ?? 0;
    const beatB = rowStore.get(b)?.beatRowIndex ?? 0;
    return beatA - beatB;
  });
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
