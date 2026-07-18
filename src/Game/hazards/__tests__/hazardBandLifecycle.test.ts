import { getObstacleRowPitch } from '@/assets/swimmerBlocks';
import { composePathChicaneShaft } from '@/Game/path/platformShaft/composePathChicaneShaft';
import { composePressIntroShaft } from '@/Game/path/platformShaft/composePressIntroShaft';
import { mergeRowHazardPass } from '@/Game/grid/mergeRowHazardPass';
import {
  createHazardBandLeadComponent,
  HazardBandLeadComponentData,
  HazardBandLeadComponentName,
} from '@/Game/ecs-components/HazardBandLead';
import { HazardBandMemberComponentName } from '@/Game/ecs-components/HazardBandMember';
import {
  ObstacleRowComponentData,
  ObstacleRowComponentName,
} from '@/Game/ecs-components/ObstacleRowComponent';
import { ContainerComponentName } from '@/Game/ecs-components/Container';
import { WaterComponentName } from '@/Game/ecs-components/Water';
import { ObstaclesManagerComponentName } from '@/Game/ecs-components/ObstaclesManager';
import { GameSessionComponentName } from '@/Game/ecs-components/GameSession';
import { RenderComponentName } from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { purgePlatformShaftHazardsAndEffectiveGaps } from '@/Game/hazards/purgePlatformShaftHazardState';
import { TEST_COLS, asPlatformSlabHazard } from '@/Game/path/__tests__/testGrid';
import type { ECS } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/ecs';
import type { ComponentStore } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/component';

describe('hazardBandLifecycle', () => {
  const blockHeight = 60;
  const rowPitch = getObstacleRowPitch(blockHeight);
  const beat = composePressIntroShaft({ seed: 42, difficulty01: 0.4, columns: TEST_COLS });
  const hazard = beat.hazards[0];
  const rowStart = hazard.bounds.rowStart;
  const rowEnd = hazard.bounds.rowEnd;

  function buildEcs(liveEntityIds: number[]) {
    const rows = new Map<number, ObstacleRowComponentData>();
    for (let i = 0; i < liveEntityIds.length; i++) {
      const ent = liveEntityIds[i];
      rows.set(ent, {
        y: 300 - i * rowPitch,
        gaps: beat.rows[rowStart + i].gaps.slice(),
        solidColumnCentersX: [],
        prevRowEntity: i > 0 ? liveEntityIds[i - 1] : null,
        beatRowIndex: rowStart + i,
      });
    }

    const allMemberIds = [1, 2, 3].slice(0, rowEnd - rowStart + 1);
    const leadEntity = allMemberIds[0];
    const leadData: HazardBandLeadComponentData = createHazardBandLeadComponent({
      modifierId: hazard.id,
      hazardId: hazard.id,
      side: hazard.side,
      bounds: hazard.bounds,
      params: hazard.params,
      memberRowEntityIds: allMemberIds,
    }).data;

    const leadStore = new Map<number, HazardBandLeadComponentData>([[leadEntity, leadData]]);
    const memberStore = new Map<number, { modifierId: string; leadEntityId: number }>();
    for (let i = 1; i < allMemberIds.length; i++) {
      memberStore.set(allMemberIds[i], { modifierId: hazard.id, leadEntityId: leadEntity });
    }

    const renderStore = new Map<number, { position: { x: number; y: number }; renderLayers: unknown[]; isDirty?: boolean }>([
      [leadEntity, { position: { x: 200, y: 300 }, renderLayers: [{ image: 'block', position: { x: 0, y: 0 } }] }],
    ]);

    const rowStore = {
      get: (id: number) => rows.get(id),
      forEach: (fn: (entity: number, data: ObstacleRowComponentData) => void) => {
        rows.forEach((data, entity) => fn(entity, data));
      },
      count: () => rows.size,
    } as ComponentStore<ObstacleRowComponentData>;

    const containerWidth = TEST_COLS * blockHeight;
    const mkStore = <T,>(data: T, entityId = 0): ComponentStore<T> =>
      ({
        get: (id: number) => (id === entityId ? data : undefined),
        forEach: (fn: (entity: number, d: T) => void) => {
          fn(entityId, data);
        },
        count: () => 1,
      }) as ComponentStore<T>;

    const components: Record<string, ComponentStore<unknown>> = {
      [ObstacleRowComponentName]: rowStore,
      [HazardBandLeadComponentName]: {
        get: (id: number) => leadStore.get(id),
        forEach: (fn: (id: number) => void) => {
          leadStore.forEach((_, id) => fn(id));
        },
        count: () => leadStore.size,
      } as ComponentStore<HazardBandLeadComponentData>,
      [HazardBandMemberComponentName]: {
        get: (id: number) => memberStore.get(id),
        forEach: (fn: (id: number) => void) => {
          memberStore.forEach((_, id) => fn(id));
        },
        count: () => memberStore.size,
      } as ComponentStore<unknown>,
      [RenderComponentName]: {
        get: (id: number) => renderStore.get(id),
        forEach: (fn: (id: number) => void) => {
          renderStore.forEach((_, id) => fn(id));
        },
        count: () => renderStore.size,
      } as ComponentStore<unknown>,
      [ContainerComponentName]: mkStore({
        centerX: containerWidth / 2,
        centerY: 400,
        width: containerWidth,
        height: 800,
        waterSurfaceY: 500,
      }),
      [WaterComponentName]: mkStore({
        raisingSpeed: 200,
        baseSpeed: 200,
        containerEntityId: 0,
        centerRowEntity: leadEntity,
      }),
      [ObstaclesManagerComponentName]: mkStore({ sceneKey: 'swimmerGame' }),
      [GameSessionComponentName]: mkStore({ phase: 'playing' }),
    };

    const removed: string[] = [];
    const ecs = {
      components,
      getEntitiesWithComponents: (names: string[]) => {
        if (names.includes(HazardBandLeadComponentName)) {
          return leadStore.size > 0 ? [leadEntity] : [];
        }
        return [];
      },
      updateComponent: (entity: number, name: string, fn: (d: unknown) => void) => {
        if (name === HazardBandLeadComponentName) {
          const d = leadStore.get(entity);
          if (d) {
            fn(d);
            leadStore.set(entity, d);
          }
        }
        if (name === RenderComponentName) {
          const d = renderStore.get(entity);
          if (d) fn(d);
        }
        if (name === ObstacleRowComponentName) {
          const d = rows.get(entity);
          if (d) fn(d);
        }
        if (name === WaterComponentName) {
          fn({});
        }
      },
      removeComponent: (entity: number, name: string) => {
        removed.push(`${entity}:${name}`);
        if (name === HazardBandLeadComponentName) {
          leadStore.delete(entity);
        }
        if (name === HazardBandMemberComponentName) {
          memberStore.delete(entity);
        }
      },
    } as unknown as ECS;

    return { ecs, components, leadStore, leadEntity, rows, removed, renderStore };
  }

  it('shrinks memberRowEntityIds when a bottom member row is gone', () => {
    const { ecs, components, leadStore, leadEntity } = buildEcs([1, 2]);

    mergeRowHazardPass({
      ecs,
      components,
      deltaTime: 16,
      eventQueue: { addEvent: () => { } } as never,
    });

    const lead = leadStore.get(leadEntity);
    expect(lead?.memberRowEntityIds).toEqual([1, 2]);
    expect(leadStore.has(leadEntity)).toBe(true);
  });

  it('strips lead and members when all member rows are gone', () => {
    const { ecs, components, leadStore, leadEntity, removed } = buildEcs([]);

    mergeRowHazardPass({
      ecs,
      components,
      deltaTime: 16,
      eventQueue: { addEvent: () => { } } as never,
    });

    expect(leadStore.has(leadEntity)).toBe(false);
    expect(removed.some((r) => r.endsWith(HazardBandLeadComponentName))).toBe(true);
  });

  it('keeps steel collision when entity id was recycled to a different beat', () => {
    const beat = composePathChicaneShaft({ seed: 42, difficulty01: 0.2, columns: TEST_COLS });
    const found = beat.hazards.find((h) => h.bounds.rowStart >= 30);
    expect(found).toBeDefined();
    if (!found) return;
    const hazard = asPlatformSlabHazard(found);
    const beatRow = hazard.bounds.rowStart;
    const rows = new Map<number, ObstacleRowComponentData>();
    rows.set(5, {
      y: 300,
      gaps: beat.rows[beatRow].gaps.slice(),
      solidColumnCentersX: [],
      prevRowEntity: null,
      beatRowIndex: beatRow,
      shaftSegmentEpoch: 1,
    });
    rows.set(99, {
      y: 400,
      gaps: [],
      solidColumnCentersX: [],
      prevRowEntity: null,
      beatRowIndex: beatRow + 3,
      shaftSegmentEpoch: 1,
    });
    const leadData = createHazardBandLeadComponent({
      modifierId: hazard.id,
      hazardId: hazard.id,
      side: hazard.side,
      bounds: hazard.bounds,
      params: hazard.params,
      memberRowEntityIds: [99],
      shaftSegmentEpoch: 1,
    }).data;
    const leadStore = new Map<number, HazardBandLeadComponentData>([[5, leadData]]);
    const rowStore = {
      get: (id: number) => rows.get(id),
      forEach: (fn: (entity: number, data: ObstacleRowComponentData) => void) => {
        rows.forEach((data, entity) => fn(entity, data));
      },
      count: () => rows.size,
    } as ComponentStore<ObstacleRowComponentData>;
    const containerWidth = TEST_COLS * blockHeight;
    const mkStore = <T,>(data: T, entityId = 0): ComponentStore<T> =>
      ({
        get: (id: number) => (id === entityId ? data : undefined),
        forEach: (fn: (entity: number, d: T) => void) => {
          fn(entityId, data);
        },
        count: () => 1,
      }) as ComponentStore<T>;
    const renderStore = new Map([
      [5, { position: { x: 0, y: 300 }, renderLayers: [{ image: 'block', position: { x: 0, y: 0 } }] }],
    ]);
    const components: Record<string, ComponentStore<unknown>> = {
      [ObstacleRowComponentName]: rowStore,
      [HazardBandLeadComponentName]: {
        get: (id: number) => leadStore.get(id),
        forEach: (fn: (id: number) => void) => leadStore.forEach((_, id) => fn(id)),
        count: () => leadStore.size,
      } as ComponentStore<HazardBandLeadComponentData>,
      [RenderComponentName]: {
        get: (id: number) => renderStore.get(id),
        forEach: (fn: (id: number) => void) => renderStore.forEach((_, id) => fn(id)),
        count: () => renderStore.size,
      } as ComponentStore<unknown>,
      [ContainerComponentName]: mkStore({
        centerX: containerWidth / 2,
        centerY: 400,
        width: containerWidth,
        height: 800,
        waterSurfaceY: 500,
      }),
      [WaterComponentName]: mkStore({
        raisingSpeed: 200,
        centerRowEntity: 99,
      }),
      [ObstaclesManagerComponentName]: mkStore({ sceneKey: 'swimmerGame' }),
      [GameSessionComponentName]: mkStore({ phase: 'playing' }),
    };
    const ecs = {
      components,
      getEntitiesWithComponents: () => [5],
      updateComponent: (entity: number, name: string, fn: (d: unknown) => void) => {
        if (name === HazardBandLeadComponentName) {
          const d = leadStore.get(entity);
          if (d) fn(d);
        }
        if (name === RenderComponentName) {
          const d = renderStore.get(entity);
          if (d) fn(d);
        }
        if (name === ObstacleRowComponentName) {
          const d = rows.get(entity);
          if (d) fn(d);
        }
        if (name === WaterComponentName) fn({});
      },
      removeComponent: () => { },
    } as unknown as ECS;

    mergeRowHazardPass({
      ecs,
      components,
      deltaTime: 16,
      eventQueue: { addEvent: () => { } } as never,
    });

    expect(leadStore.has(5)).toBe(true);
    expect(leadStore.get(5)?.memberRowEntityIds).toEqual([5]);
    expect(rows.get(5)?.effectivePressSlabAabb).toBeDefined();
  });

  it('loop purge removes all hazard band components and clears effectiveGaps', () => {
    const { ecs, components, leadStore, rows } = buildEcs([1, 2, 3]);
    const memberRow = rows.get(2)!;
    memberRow.effectiveGaps = [3];
    memberRow.effectiveSolidColumnCentersX = [100];

    purgePlatformShaftHazardsAndEffectiveGaps({
      ecs,
      components,
      sceneKey: 'swimmerGame',
      eventQueue: { addEvent: () => { } },
    });

    expect(leadStore.size).toBe(0);
    expect(memberRow.effectiveGaps).toBeUndefined();
    expect(memberRow.effectiveSolidColumnCentersX).toBeUndefined();
  });
});
