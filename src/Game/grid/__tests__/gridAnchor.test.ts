import {
  anchorAllRowsDead,
  anchorCenterY,
  anchorIsComplete,
  buildGridAnchor,
  growHazardBandMemberIds,
  healAnchorRowIds,
  healLiveMemberIdsForBand,
  resolveRowEntitiesForBeatRange,
  resolveRowEntityForBeat,
} from '@/Game/grid/gridAnchor';
import type { ComponentStore } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/component';
import type { ObstacleRowComponentData } from '@/Game/ecs-components/ObstacleRowComponent';

function mockRowStore(
  rows: {
    entity: number;
    beatRowIndex?: number;
    y: number;
    shaftSegmentEpoch?: number;
    prevRowEntity?: number | null;
  }[]
): ComponentStore<ObstacleRowComponentData> {
  const map = new Map<number, ObstacleRowComponentData>();
  for (const r of rows) {
    map.set(r.entity, {
      y: r.y,
      gaps: [],
      solidColumnCentersX: [],
      prevRowEntity: r.prevRowEntity ?? null,
      beatRowIndex: r.beatRowIndex,
      shaftSegmentEpoch: r.shaftSegmentEpoch,
    });
  }
  return {
    get: (entity: number) => map.get(entity),
    forEach: (fn) => {
      map.forEach((data, entity) => fn(entity, data));
    },
    count: () => map.size,
  } as ComponentStore<ObstacleRowComponentData>;
}

describe('gridAnchor', () => {
  it('resolveRowEntitiesForBeatRange returns entities in beat order', () => {
    const store = mockRowStore([
      { entity: 10, beatRowIndex: 8, y: 200 },
      { entity: 20, beatRowIndex: 9, y: 160 },
      { entity: 30, beatRowIndex: 10, y: 120 },
    ]);
    const ids = resolveRowEntitiesForBeatRange(store, 8, 10);
    expect(ids).toEqual([10, 20, 30]);
  });

  it('resolveRowEntitiesForBeatRange filters by shaftSegmentEpoch', () => {
    const store = mockRowStore([
      { entity: 10, beatRowIndex: 8, y: 200, shaftSegmentEpoch: 1 },
      { entity: 11, beatRowIndex: 8, y: 400, shaftSegmentEpoch: 2 },
      { entity: 20, beatRowIndex: 9, y: 160, shaftSegmentEpoch: 2 },
    ]);
    const ids = resolveRowEntitiesForBeatRange(store, 8, 9, { shaftSegmentEpoch: 2 });
    expect(ids).toEqual([11, 20]);
  });

  it('skips rows without beatRowIndex', () => {
    const store = mockRowStore([
      { entity: 10, beatRowIndex: 8, y: 200 },
      { entity: 99, y: 180 },
      { entity: 20, beatRowIndex: 9, y: 160 },
    ]);
    const ids = resolveRowEntitiesForBeatRange(store, 8, 9);
    expect(ids).toEqual([10, 20]);
  });

  it('anchorCenterY averages live row Y', () => {
    const anchor = buildGridAnchor(8, 9, [10, 20]);
    const store = mockRowStore([
      { entity: 10, beatRowIndex: 8, y: 100 },
      { entity: 20, beatRowIndex: 9, y: 200 },
    ]);
    expect(anchorCenterY(anchor, store)).toBe(150);
  });

  it('anchorIsComplete requires all band rows live', () => {
    const anchor = buildGridAnchor(8, 10, [10, 20, 30]);
    const full = mockRowStore([
      { entity: 10, beatRowIndex: 8, y: 100 },
      { entity: 20, beatRowIndex: 9, y: 150 },
      { entity: 30, beatRowIndex: 10, y: 200 },
    ]);
    expect(anchorIsComplete(anchor, full)).toBe(true);

    const partial = mockRowStore([
      { entity: 10, beatRowIndex: 8, y: 100 },
      { entity: 20, beatRowIndex: 9, y: 150 },
    ]);
    expect(anchorIsComplete(anchor, partial)).toBe(false);
  });

  it('anchorAllRowsDead when every linked entity is gone', () => {
    const anchor = buildGridAnchor(8, 9, [10, 20]);
    const empty = mockRowStore([]);
    expect(anchorAllRowsDead(anchor, empty)).toBe(true);
  });

  it('healAnchorRowIds keeps spawn order and drops dead entities only', () => {
    const store = mockRowStore([
      { entity: 10, beatRowIndex: 8, y: 100 },
      { entity: 20, beatRowIndex: 9, y: 150 },
    ]);
    const anchor = buildGridAnchor(8, 9, [10, 20], 1);
    const healed = healAnchorRowIds(anchor, store);
    expect(healed.rowEntityIds).toEqual([10, 20]);
    expect(healed.shaftSegmentEpoch).toBe(1);
  });

  it('healAnchorRowIds does not swap to duplicate beatRowIndex rows', () => {
    const store = mockRowStore([
      { entity: 10, beatRowIndex: 8, y: 100, shaftSegmentEpoch: 1 },
      { entity: 99, beatRowIndex: 8, y: 500, shaftSegmentEpoch: 2 },
    ]);
    const anchor = buildGridAnchor(8, 8, [10], 1);
    const healed = healAnchorRowIds(anchor, store);
    expect(healed.rowEntityIds).toEqual([10]);
  });

  it('healAnchorRowIds removes dead entity ids', () => {
    const store = mockRowStore([{ entity: 20, beatRowIndex: 9, y: 150 }]);
    const anchor = buildGridAnchor(8, 9, [10, 20], 1);
    const healed = healAnchorRowIds(anchor, store);
    expect(healed.rowEntityIds).toEqual([20]);
  });

  it('healLiveMemberIdsForBand drops recycled entity id with wrong beat', () => {
    const store = mockRowStore([
      { entity: 10, beatRowIndex: 35, y: 100, shaftSegmentEpoch: 1 },
      { entity: 50, beatRowIndex: 12, y: 200, shaftSegmentEpoch: 1 },
    ]);
    const healed = healLiveMemberIdsForBand([50], store, 35, 35, 1);
    expect(healed).toEqual([]);
    const grown = growHazardBandMemberIds([50], store, 35, 35, 1);
    expect(grown).toEqual([10]);
  });

  it('growHazardBandMemberIds appends missing beats without replacing healed ids', () => {
    const store = mockRowStore([
      { entity: 10, beatRowIndex: 8, y: 200, shaftSegmentEpoch: 1 },
      { entity: 20, beatRowIndex: 10, y: 120, shaftSegmentEpoch: 1 },
    ]);
    const grown = growHazardBandMemberIds([10], store, 8, 10, 1);
    expect(grown).toEqual([10, 20]);
  });

  it('resolveRowEntityForBeat prefers loop-seam chain row when beat 0 is duplicated', () => {
    const store = mockRowStore([
      { entity: 30, beatRowIndex: 39, y: 569, shaftSegmentEpoch: 1, prevRowEntity: null },
      { entity: 90, beatRowIndex: 0, y: 518, shaftSegmentEpoch: 2, prevRowEntity: 30 },
      { entity: 127, beatRowIndex: 0, y: 466, shaftSegmentEpoch: 2, prevRowEntity: 90 },
      { entity: 83, beatRowIndex: 1, y: 415, shaftSegmentEpoch: 2, prevRowEntity: 127 },
    ]);
    const ent = resolveRowEntityForBeat(store, 0, { shaftSegmentEpoch: 2 });
    expect(ent).toBe(90);
  });
});
