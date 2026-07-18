import { getObstacleRowPitch } from '@/assets/swimmerBlocks';
import { mergeRowHazardPass } from '@/Game/grid/mergeRowHazardPass';
import { composePressIntroShaft } from '@/Game/path/platformShaft/composePressIntroShaft';
import { effectiveGapsAtFullPress } from '@/Game/path/platformShaft/primitives';
import {
  createHazardBandLeadComponent,
  HazardBandLeadComponentData,
  HazardBandLeadComponentName,
} from '@/Game/ecs-components/HazardBandLead';
import {
  ObstacleRowComponentData,
  ObstacleRowComponentName,
} from '@/Game/ecs-components/ObstacleRowComponent';
import { ContainerComponentName } from '@/Game/ecs-components/Container';
import { WaterComponentName } from '@/Game/ecs-components/Water';
import { ObstaclesManagerComponentName } from '@/Game/ecs-components/ObstaclesManager';
import { GameSessionComponentName } from '@/Game/ecs-components/GameSession';
import { RenderComponentName } from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { TEST_COLS, asPlatformSlabHazard } from '@/Game/path/__tests__/testGrid';
import { waterTransitionBandFromSurface } from '@/Game/grid/waterTransitionBand';
import type { ECS } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/ecs';
import type { ComponentStore } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/component';

describe('mergeRowHazardPass', () => {
  const blockHeight = 60;
  const rowPitch = getObstacleRowPitch(blockHeight);
  const beat = composePressIntroShaft({ seed: 42, difficulty01: 0.4, columns: TEST_COLS });
  const hazard = asPlatformSlabHazard(beat.hazards[0]);
  const rowStart = hazard.bounds.rowStart;
  const rowEnd = hazard.bounds.rowEnd;

  function buildEcs(centerBeat: number, rowCenterY: number) {
    const rowEntities = [1, 2, 3].slice(0, rowEnd - rowStart + 1);
    const rows = new Map<number, ObstacleRowComponentData>();
    for (let i = 0; i < rowEntities.length; i++) {
      rows.set(rowEntities[i], {
        y: rowCenterY - i * rowPitch,
        gaps: beat.rows[rowStart + i].gaps.slice(),
        solidColumnCentersX: [],
        prevRowEntity: i > 0 ? rowEntities[i - 1] : null,
        beatRowIndex: rowStart + i,
      });
    }

    const leadEntity = rowEntities[rowEntities.length - 1];
    const leadData: HazardBandLeadComponentData = createHazardBandLeadComponent({
      modifierId: hazard.id,
      hazardId: hazard.id,
      side: hazard.side,
      bounds: {
        rowStart: hazard.bounds.rowStart,
        rowEnd: hazard.bounds.rowEnd,
        colStart: hazard.bounds.colStart,
        colEnd: hazard.bounds.colEnd,
      },
      params: hazard.params,
      memberRowEntityIds: rowEntities,
    }).data;

    leadData.maxWorldBeat = -1;
    leadData.pressClockOpen = false;
    leadData.localSec = 0;
    leadData.shaftSegmentEpoch = 1;
    for (const [, row] of rows) {
      row.shaftSegmentEpoch = 1;
    }

    const leadStore = new Map<number, HazardBandLeadComponentData>([[leadEntity, leadData]]);

    const rowStore = {
      get: (id: number) => rows.get(id),
      forEach: (fn: (entity: number, data: ObstacleRowComponentData) => void) => {
        rows.forEach((data, entity) => fn(entity, data));
      },
      count: () => rows.size,
    } as ComponentStore<ObstacleRowComponentData>;

    const containerWidth = TEST_COLS * blockHeight;
    const waterSurfaceY = 500;
    const band = waterTransitionBandFromSurface(waterSurfaceY, blockHeight);
    const centerY = band.transitionTargetY;

    const animStart = hazard.params.animStartRow ?? rowStart;
    const pressDuration = hazard.params.pressDurationSec ?? 1.4;
    const rowDurationSec = blockHeight / 200;
    const lockBeat =
      animStart + Math.ceil(pressDuration / rowDurationSec) + 2;
    rows.set(99, {
      y: centerY,
      gaps: [],
      solidColumnCentersX: [],
      prevRowEntity: null,
      beatRowIndex: lockBeat,
      shaftSegmentEpoch: 1,
    });

    const mkStore = <T,>(data: T, entityId = 0): ComponentStore<T> =>
      ({
        get: (id: number) => (id === entityId ? data : undefined),
        forEach: (fn: (entity: number, d: T) => void) => {
          fn(entityId, data);
        },
        count: () => 1,
      }) as ComponentStore<T>;

    const renderStore = new Map<number, { renderLayers: unknown[]; position: { x: number; y: number } }>();
    for (let i = 0; i < rowEntities.length; i++) {
      const ent = rowEntities[i];
      renderStore.set(ent, {
        renderLayers: [],
        position: { x: containerWidth / 2, y: rowCenterY - i * rowPitch },
      });
    }

    const components: Record<string, ComponentStore<unknown>> = {
      [ObstacleRowComponentName]: rowStore,
      [HazardBandLeadComponentName]: {
        get: (id: number) => leadStore.get(id),
        forEach: (fn: (id: number) => void) => {
          leadStore.forEach((_, id) => fn(id));
        },
        count: () => leadStore.size,
      } as ComponentStore<HazardBandLeadComponentData>,
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
        waterSurfaceY,
      }),
      [WaterComponentName]: mkStore({
        raisingSpeed: 200,
        baseSpeed: 200,
        containerEntityId: 0,
        centerRowEntity: 99,
      }),
      [ObstaclesManagerComponentName]: mkStore({ sceneKey: 'swimmerGame' }),
      [GameSessionComponentName]: mkStore({ phase: 'playing' }),
    };

    const ecs = {
      components,
      getEntitiesWithComponents: (names: string[]) => {
        if (names.includes(HazardBandLeadComponentName)) return [leadEntity];
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
        if (name === ObstacleRowComponentName) {
          const d = rows.get(entity);
          if (d) fn(d);
        }
        if (name === RenderComponentName) {
          const d = renderStore.get(entity);
          if (d) fn(d);
        }
        if (name === WaterComponentName) {
          fn({});
        }
      },
      removeComponent: () => { },
    } as unknown as ECS;

    return { ecs, components, rows, leadEntity, centerBeat, centerY };
  }

  it('writes effectiveGaps narrowed at full press on trailing member row', () => {
    const { ecs, components, rows } = buildEcs(rowStart, 300);

    mergeRowHazardPass({
      ecs,
      components,
      deltaTime: 16,
      eventQueue: { addEvent: () => { } } as never,
    });

    const trailingRow = rows.get(1)!;
    const expected = effectiveGapsAtFullPress(
      trailingRow.gaps,
      hazard,
      rowStart,
      TEST_COLS
    );
    expect(trailingRow.effectiveGaps).toEqual(expected);
  });

  it('adjacent single-row hazard bands each render steel on their own row', () => {
    const stackHazards = beat.hazards.filter(
      (h) => h.bounds.rowStart === h.bounds.rowEnd
    );
    expect(stackHazards.length).toBeGreaterThanOrEqual(2);
    const hzA = stackHazards[0];
    const hzB = stackHazards[1];
    const rowA = hzA.bounds.rowStart;
    const rowB = hzB.bounds.rowStart;
    const containerWidth = TEST_COLS * blockHeight;
    const rows = new Map<number, ObstacleRowComponentData>([
      [
        10,
        {
          y: 350,
          gaps: beat.rows[rowA].gaps.slice(),
          solidColumnCentersX: [],
          prevRowEntity: null,
          beatRowIndex: rowA,
        },
      ],
      [
        11,
        {
          y: 350 - rowPitch,
          gaps: beat.rows[rowB].gaps.slice(),
          solidColumnCentersX: [],
          prevRowEntity: 10,
          beatRowIndex: rowB,
        },
      ],
      [
        99,
        {
          y: 380,
          gaps: [2, 3],
          solidColumnCentersX: [],
          prevRowEntity: null,
          beatRowIndex: Math.max(0, (hzA.params.animStartRow ?? rowA) + 2),
        },
      ],
    ]);
    const leadStore = new Map<number, HazardBandLeadComponentData>([
      [
        10,
        createHazardBandLeadComponent({
          modifierId: hzA.id,
          hazardId: hzA.id,
          side: hzA.side,
          bounds: hzA.bounds,
          params: hzA.params,
          memberRowEntityIds: [10],
        }).data,
      ],
      [
        11,
        createHazardBandLeadComponent({
          modifierId: hzB.id,
          hazardId: hzB.id,
          side: hzB.side,
          bounds: hzB.bounds,
          params: hzB.params,
          memberRowEntityIds: [11],
        }).data,
      ],
    ]);
    const renderStore = new Map([
      [10, { renderLayers: [{ image: 'block', position: { x: 0, y: 0 } }], position: { x: 0, y: 350 } }],
      [11, { renderLayers: [{ image: 'block', position: { x: 0, y: 0 } }], position: { x: 0, y: 350 - rowPitch } }],
    ]);
    const rowStore = {
      get: (id: number) => rows.get(id),
      forEach: (fn: (id: number, d: ObstacleRowComponentData) => void) => {
        rows.forEach((d, id) => fn(id, d));
      },
      count: () => rows.size,
    };
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
      [WaterComponentName]: mkStore({ raisingSpeed: 200, centerRowEntity: 99 }),
      [ObstaclesManagerComponentName]: mkStore({ sceneKey: 'swimmerGame' }),
      [GameSessionComponentName]: mkStore({ phase: 'playing' }),
    };
    const ecs = {
      components,
      getEntitiesWithComponents: () => [10, 11],
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

    const steelA = renderStore.get(10)!.renderLayers.filter(
      (l: { image?: string }) => !l.image
    );
    const steelB = renderStore.get(11)!.renderLayers.filter(
      (l: { image?: string }) => !l.image
    );
    expect(steelA.length).toBeGreaterThan(0);
    expect(steelB.length).toBeGreaterThan(0);
  });

  it('does not write platformFlow when band rows are far from water surface', () => {
    const { ecs, components, rows, leadEntity } = buildEcs(rowStart, 120);
    let platformFlow: [number, number, number, number] | undefined;

    const leadStore = components[HazardBandLeadComponentName] as ComponentStore<HazardBandLeadComponentData>;
    const leadData = leadStore.get(leadEntity)!;
    leadData.pressClockOpen = true;
    leadData.maxWorldBeat = rowStart + 5;
    leadData.localSec = 0.5;
    leadData.prevPressExtent = 0;

    const origUpdate = ecs.updateComponent.bind(ecs);
    ecs.updateComponent = (entity: number, name: string, fn: (d: unknown) => void) => {
      if (name === WaterComponentName) {
        const patch: { platformFlowPerRange?: [number, number, number, number] } = {};
        fn(patch);
        platformFlow = patch.platformFlowPerRange;
        return;
      }
      origUpdate(entity, name, fn);
    };

    mergeRowHazardPass({
      ecs,
      components,
      deltaTime: 100,
      eventQueue: { addEvent: () => { } } as never,
    });

    expect(platformFlow).toEqual([0, 0, 0, 0]);
  });

  it('writes progressively narrowed effectiveGaps during partial press', () => {
    const { ecs, components, rows, leadEntity } = buildEcs(rowStart, 300);
    const leadStore = components[HazardBandLeadComponentName] as ComponentStore<HazardBandLeadComponentData>;
    const leadData = leadStore.get(leadEntity)!;
    const duration = hazard.params.pressDurationSec ?? 1.4;
    leadData.pressClockOpen = true;
    leadData.maxWorldBeat = rowStart + 10;
    leadData.localSec = duration * 0.45;
    leadData.prevPressExtent = 0;

    mergeRowHazardPass({
      ecs,
      components,
      deltaTime: 16,
      eventQueue: { addEvent: () => { } } as never,
    });

    const trailingRow = rows.get(1)!;
    const baseWidth = Math.max(...trailingRow.gaps) - Math.min(...trailingRow.gaps) + 1;
    expect(trailingRow.effectiveGaps).toBeDefined();
    const effWidth =
      Math.max(...(trailingRow.effectiveGaps ?? [])) -
      Math.min(...(trailingRow.effectiveGaps ?? [])) +
      1;
    expect(effWidth).toBeLessThan(baseWidth);
  });

  it('does not narrow gaps or write press slab at telegraph', () => {
    const { ecs, components, rows, leadEntity } = buildEcs(rowStart, 300);
    const leadStore = components[HazardBandLeadComponentName] as ComponentStore<HazardBandLeadComponentData>;
    const leadData = leadStore.get(leadEntity)!;
    const animStart = hazard.params.animStartRow ?? rowStart;
    const lockRow = rows.get(99)!;
    lockRow.beatRowIndex = Math.max(0, animStart - 1);
    leadData.pressClockOpen = false;
    leadData.maxWorldBeat = rowStart - 1;
    leadData.localSec = 0;
    leadData.prevPressExtent = 0;

    mergeRowHazardPass({
      ecs,
      components,
      deltaTime: 16,
      eventQueue: { addEvent: () => { } } as never,
    });

    const row = rows.get(1)!;
    expect(row.effectiveGaps).toBeUndefined();
    expect(row.effectivePressSlabAabb).toBeUndefined();
  });
});
