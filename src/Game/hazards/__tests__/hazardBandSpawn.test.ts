import { composePressIntroShaft } from '@/Game/path/platformShaft/composePressIntroShaft';
import { maybeSpawnHazardBandsForRow } from '@/Game/hazards/hazardBandSpawn';
import {
  HazardBandLeadComponentName,
  type HazardBandLeadComponentData,
  createHazardBandLeadComponent,
} from '@/Game/ecs-components/HazardBandLead';
import {
  HazardBandMemberComponentName,
  type HazardBandMemberComponentData,
} from '@/Game/ecs-components/HazardBandMember';
import {
  ObstacleRowComponentData,
  ObstacleRowComponentName,
} from '@/Game/ecs-components/ObstacleRowComponent';
import type { PlatformShaftTemplateCtx } from '@/Game/path/platformShaft/platformShaftRowPathTemplate';
import { TEST_COLS } from '@/Game/path/__tests__/testGrid';
import type { ECS } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/ecs';
import type { ComponentStore } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/component';

function createBandMockEcs(rows: Map<number, ObstacleRowComponentData>): ECS {
  const leadStore = new Map<number, HazardBandLeadComponentData>();
  const memberStore = new Map<number, HazardBandMemberComponentData>();

  const rowStore = {
    get: (id: number) => rows.get(id),
    forEach: (fn: (entity: number, data: ObstacleRowComponentData) => void) => {
      rows.forEach((data, entity) => fn(entity, data));
    },
    count: () => rows.size,
  } as ComponentStore<ObstacleRowComponentData>;

  const ecs = {
    components: {
      [ObstacleRowComponentName]: rowStore,
      [HazardBandLeadComponentName]: {
        get: (id: number) => leadStore.get(id),
        forEach: (fn: (id: number) => void) => {
          leadStore.forEach((_, id) => fn(id));
        },
      },
      [HazardBandMemberComponentName]: {
        get: (id: number) => memberStore.get(id),
        forEach: (fn: (id: number) => void) => {
          memberStore.forEach((_, id) => fn(id));
        },
      },
    },
    addComponent: (entity: number, comp: { name: string; data: unknown }) => {
      if (comp.name === HazardBandLeadComponentName) {
        leadStore.set(entity, comp.data as HazardBandLeadComponentData);
      }
      if (comp.name === HazardBandMemberComponentName) {
        memberStore.set(entity, comp.data as HazardBandMemberComponentData);
      }
    },
    getEntitiesWithComponents: (names: string[]) => {
      if (names.includes(HazardBandLeadComponentName)) {
        return Array.from(leadStore.keys());
      }
      if (names.includes(HazardBandMemberComponentName)) {
        return Array.from(memberStore.keys());
      }
      return [];
    },
    updateComponent: (entity: number, name: string, fn: (d: unknown) => void) => {
      if (name === HazardBandLeadComponentName) {
        const d = leadStore.get(entity);
        if (d) {
          fn(d);
          leadStore.set(entity, d as HazardBandLeadComponentData);
        }
      }
    },
  } as unknown as ECS;

  return ecs;
}

function seedRowsForBeatRange(
  beat: ReturnType<typeof composePressIntroShaft>,
  rowStart: number,
  rowEnd: number,
  shaftSegmentEpoch = 1
): Map<number, ObstacleRowComponentData> {
  const rows = new Map<number, ObstacleRowComponentData>();
  let entity = 1;
  for (let beatIdx = rowStart; beatIdx <= rowEnd; beatIdx++) {
    rows.set(entity, {
      y: 200 - beatIdx * 50,
      gaps: beat.rows[beatIdx].gaps.slice(),
      solidColumnCentersX: [],
      prevRowEntity: entity > 1 ? entity - 1 : null,
      beatRowIndex: beatIdx,
      shaftSegmentEpoch,
    });
    entity++;
  }
  return rows;
}

describe('hazardBandSpawn', () => {
  const beat = composePressIntroShaft({ seed: 42, difficulty01: 0.4, columns: TEST_COLS });
  const ctx: PlatformShaftTemplateCtx = {
    beat,
    spawnedHazardIds: [],
    shaftSegmentEpoch: 1,
  };

  it('spawns partial band at rowStart when rowSpan > 1', () => {
    const hazard = beat.hazards.find((h) => h.bounds.rowEnd - h.bounds.rowStart > 0);
    expect(hazard).toBeDefined();
    if (!hazard) return;

    const rows = seedRowsForBeatRange(beat, hazard.bounds.rowStart, hazard.bounds.rowStart);
    const ecs = createBandMockEcs(rows);

    maybeSpawnHazardBandsForRow({
      ecs,
      sceneEntity: 0,
      ctx: { ...ctx, spawnedHazardIds: [] },
      rowIndex: hazard.bounds.rowStart,
      rowEntity: 1,
      rowData: rows.get(1)!,
      leftX: 0,
      rowLength: TEST_COLS,
      obstacleDimension: { width: 60, height: 60 },
    });

    expect(ecs.getEntitiesWithComponents([HazardBandLeadComponentName]).length).toBe(1);
  });

  it('spawns partial band at rowStart and grows members through rowEnd', () => {
    const hazard = beat.hazards[0];
    const rows = seedRowsForBeatRange(beat, hazard.bounds.rowStart, hazard.bounds.rowStart);
    const ecs = createBandMockEcs(rows);

    maybeSpawnHazardBandsForRow({
      ecs,
      sceneEntity: 0,
      ctx: { ...ctx, spawnedHazardIds: [] },
      rowIndex: hazard.bounds.rowStart,
      rowEntity: 1,
      rowData: rows.get(1)!,
      leftX: 0,
      rowLength: TEST_COLS,
      obstacleDimension: { width: 60, height: 60 },
    });

    const leadStore = ecs.components[HazardBandLeadComponentName] as {
      get: (id: number) => HazardBandLeadComponentData | undefined;
    };
    expect(leadStore.get(1)?.memberRowEntityIds).toEqual([1]);
  });

  it('spawns lead on rowEnd (top) entity when band is complete', () => {
    const hazard = beat.hazards[0];
    const rowSpan = hazard.bounds.rowEnd - hazard.bounds.rowStart + 1;
    const rows = seedRowsForBeatRange(
      beat,
      hazard.bounds.rowStart,
      hazard.bounds.rowEnd
    );
    const ecs = createBandMockEcs(rows);

    maybeSpawnHazardBandsForRow({
      ecs,
      sceneEntity: 0,
      ctx: { ...ctx, spawnedHazardIds: [] },
      rowIndex: hazard.bounds.rowEnd,
      rowEntity: rowSpan,
      rowData: rows.get(rowSpan)!,
      leftX: 0,
      rowLength: TEST_COLS,
      obstacleDimension: { width: 60, height: 60 },
    });

    expect(ecs.getEntitiesWithComponents([HazardBandLeadComponentName]).length).toBe(1);
    expect(ecs.getEntitiesWithComponents([HazardBandMemberComponentName]).length).toBe(
      rowSpan - 1
    );
    const leadEntity = ecs.getEntitiesWithComponents([HazardBandLeadComponentName])[0];
    expect(leadEntity).toBe(rowSpan);
  });

  it('retroactive spawn catches hazards when rowIndex passes rowEnd', () => {
    const freshCtx: PlatformShaftTemplateCtx = { beat, spawnedHazardIds: [], shaftSegmentEpoch: 1 };
    const hazard = beat.hazards[0];
    const rows = seedRowsForBeatRange(
      beat,
      hazard.bounds.rowStart,
      hazard.bounds.rowEnd
    );
    const ecs = createBandMockEcs(rows);
    const lastEntity = hazard.bounds.rowEnd - hazard.bounds.rowStart + 1;

    maybeSpawnHazardBandsForRow({
      ecs,
      sceneEntity: 0,
      ctx: freshCtx,
      rowIndex: hazard.bounds.rowEnd + 5,
      rowEntity: lastEntity,
      rowData: rows.get(lastEntity)!,
      leftX: 0,
      rowLength: TEST_COLS,
      obstacleDimension: { width: 60, height: 60 },
    });

    expect(freshCtx.spawnedHazardIds?.length).toBeGreaterThanOrEqual(1);
    expect(ecs.getEntitiesWithComponents([HazardBandLeadComponentName]).length).toBeGreaterThanOrEqual(
      1
    );
  });

  it('spawns all intro shaft hazards after streaming through row count', () => {
    const freshCtx: PlatformShaftTemplateCtx = { beat, spawnedHazardIds: [], shaftSegmentEpoch: 1 };
    const maxRow = beat.rows.length - 1;
    const allRows = seedRowsForBeatRange(beat, 0, maxRow);
    const ecs = createBandMockEcs(allRows);

    maybeSpawnHazardBandsForRow({
      ecs,
      sceneEntity: 0,
      ctx: freshCtx,
      rowIndex: maxRow,
      rowEntity: maxRow + 1,
      rowData: allRows.get(maxRow + 1)!,
      leftX: 0,
      rowLength: TEST_COLS,
      obstacleDimension: { width: 60, height: 60 },
    });

    expect(freshCtx.spawnedHazardIds?.length).toBe(beat.hazards.length);
  });

  it('re-spawns after strip left stale spawnedHazardIds entry', () => {
    const hazard = beat.hazards[0];
    const rows = seedRowsForBeatRange(
      beat,
      hazard.bounds.rowStart,
      hazard.bounds.rowEnd
    );
    const ecs = createBandMockEcs(rows);
    const freshCtx: PlatformShaftTemplateCtx = {
      beat,
      spawnedHazardIds: [hazard.id],
      shaftSegmentEpoch: 1,
    };

    maybeSpawnHazardBandsForRow({
      ecs,
      sceneEntity: 0,
      ctx: freshCtx,
      rowIndex: hazard.bounds.rowEnd,
      rowEntity: hazard.bounds.rowEnd - hazard.bounds.rowStart + 1,
      rowData: rows.get(hazard.bounds.rowEnd - hazard.bounds.rowStart + 1)!,
      leftX: 0,
      rowLength: TEST_COLS,
      obstacleDimension: { width: 60, height: 60 },
    });

    expect(ecs.getEntitiesWithComponents([HazardBandLeadComponentName]).length).toBe(1);
    expect(freshCtx.spawnedHazardIds).toContain(hazard.id);
  });

  it('epoch filter picks current segment rows only', () => {
    const hazard = beat.hazards[0];
    const rows = seedRowsForBeatRange(
      beat,
      hazard.bounds.rowStart,
      hazard.bounds.rowEnd,
      1
    );
    for (let beatIdx = hazard.bounds.rowStart; beatIdx <= hazard.bounds.rowEnd; beatIdx++) {
      const dupEntity = 100 + beatIdx;
      rows.set(dupEntity, {
        y: 800,
        gaps: beat.rows[beatIdx].gaps.slice(),
        solidColumnCentersX: [],
        prevRowEntity: null,
        beatRowIndex: beatIdx,
        shaftSegmentEpoch: 2,
      });
    }
    const ecs = createBandMockEcs(rows);
    const freshCtx: PlatformShaftTemplateCtx = {
      beat,
      spawnedHazardIds: [],
      shaftSegmentEpoch: 1,
    };

    maybeSpawnHazardBandsForRow({
      ecs,
      sceneEntity: 0,
      ctx: freshCtx,
      rowIndex: hazard.bounds.rowEnd,
      rowEntity: hazard.bounds.rowEnd - hazard.bounds.rowStart + 1,
      rowData: rows.get(hazard.bounds.rowEnd - hazard.bounds.rowStart + 1)!,
      leftX: 0,
      rowLength: TEST_COLS,
      obstacleDimension: { width: 60, height: 60 },
    });

    const leadEntity = ecs.getEntitiesWithComponents([HazardBandLeadComponentName])[0];
    expect(leadEntity).toBeLessThan(100);
  });

  it('spawns a fresh band for a new shaft segment epoch', () => {
    const hazard = beat.hazards[0];
    const rows = seedRowsForBeatRange(
      beat,
      hazard.bounds.rowStart,
      hazard.bounds.rowEnd,
      1
    );
    for (let beatIdx = hazard.bounds.rowStart; beatIdx <= hazard.bounds.rowEnd; beatIdx++) {
      const dupEntity = 100 + beatIdx;
      rows.set(dupEntity, {
        y: 800,
        gaps: beat.rows[beatIdx].gaps.slice(),
        solidColumnCentersX: [],
        prevRowEntity: null,
        beatRowIndex: beatIdx,
        shaftSegmentEpoch: 2,
      });
    }
    const ecs = createBandMockEcs(rows);
    const epoch1Lead = hazard.bounds.rowEnd - hazard.bounds.rowStart + 1;
    ecs.addComponent(
      epoch1Lead,
      createHazardBandLeadComponent({
        modifierId: hazard.id,
        hazardId: hazard.id,
        side: hazard.side,
        bounds: hazard.bounds,
        params: hazard.params,
        memberRowEntityIds: [epoch1Lead],
        shaftSegmentEpoch: 1,
      })
    );

    const freshCtx: PlatformShaftTemplateCtx = {
      beat,
      spawnedHazardIds: [],
      shaftSegmentEpoch: 2,
    };

    maybeSpawnHazardBandsForRow({
      ecs,
      sceneEntity: 0,
      ctx: freshCtx,
      rowIndex: hazard.bounds.rowEnd,
      rowEntity: 100 + hazard.bounds.rowEnd,
      rowData: rows.get(100 + hazard.bounds.rowEnd)!,
      leftX: 0,
      rowLength: TEST_COLS,
      obstacleDimension: { width: 60, height: 60 },
    });

    const leads = ecs.getEntitiesWithComponents([HazardBandLeadComponentName]);
    expect(leads).toContain(epoch1Lead);
    expect(leads).toContain(100 + hazard.bounds.rowEnd);
    expect(leads.length).toBe(2);
  });
});
