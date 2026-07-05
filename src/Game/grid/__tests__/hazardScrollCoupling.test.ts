import { getObstacleRowPitch } from '@/assets/swimmerBlocks';
import { mergeRowHazardPass } from '@/Game/grid/mergeRowHazardPass';
import { waterTransitionBandFromSurface } from '@/Game/grid/waterTransitionBand';
import { composePressIntroShaft } from '@/Game/path/platformShaft/composePressIntroShaft';
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
import { TEST_COLS } from '@/Game/path/__tests__/testGrid';
import type { ECS } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/ecs';
import type { ComponentStore } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/component';

describe('hazardScrollCoupling', () => {
  const blockHeight = 60;
  const rowPitch = getObstacleRowPitch(blockHeight);
  const raisingSpeed = 200;
  const beat = composePressIntroShaft({ seed: 42, difficulty01: 0.4, columns: TEST_COLS });
  const hazard = beat.hazards[0];
  const rowStart = hazard.bounds.rowStart;
  const rowEnd = hazard.bounds.rowEnd;
  const waterSurfaceY = 500;
  const band = waterTransitionBandFromSurface(waterSurfaceY, blockHeight);

  function buildSimEcs(rowYs: number[]) {
    const rowEntities = [1, 2, 3].slice(0, rowYs.length);
    const rows = new Map<number, ObstacleRowComponentData>();
    for (let i = 0; i < rowEntities.length; i++) {
      rows.set(rowEntities[i], {
        y: rowYs[i],
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
      bounds: hazard.bounds,
      params: hazard.params,
      memberRowEntityIds: rowEntities,
    }).data;

    const leadStore = new Map<number, HazardBandLeadComponentData>([[leadEntity, leadData]]);
    const renderStore = new Map<number, { position: { x: number; y: number }; renderLayers: unknown[] }>();
    for (let i = 0; i < rowEntities.length; i++) {
      const ent = rowEntities[i];
      renderStore.set(ent, { position: { x: 200, y: rowYs[i] }, renderLayers: [] });
    }

    const rowStore = {
      get: (id: number) => rows.get(id),
      forEach: (fn: (entity: number, data: ObstacleRowComponentData) => void) => {
        rows.forEach((data, entity) => fn(entity, data));
      },
      count: () => rows.size,
    } as ComponentStore<ObstacleRowComponentData>;

    const containerWidth = TEST_COLS * blockHeight;
    const centerRowEntity = leadEntity;

    const mkStore = <T,>(
      data: T,
      entityId = 0
    ): ComponentStore<T> =>
      ({
        get: (id: number) => (id === entityId ? data : undefined),
        forEach: (fn: (entity: number, d: T) => void) => {
          fn(entityId, data);
        },
        count: () => 1,
      }) as ComponentStore<T>;

    const waterData = {
      raisingSpeed,
      baseSpeed: raisingSpeed,
      containerEntityId: 0,
      centerRowEntity,
    };

    const components: Record<string, ComponentStore<unknown>> = {
      [ObstacleRowComponentName]: rowStore,
      [HazardBandLeadComponentName]: {
        get: (id: number) => leadStore.get(id),
        forEach: (fn: (id: number, data: HazardBandLeadComponentData) => void) => {
          leadStore.forEach((data, id) => fn(id, data));
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
      [WaterComponentName]: mkStore(waterData),
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
            leadStore.set(entity, d as HazardBandLeadComponentData);
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
          fn(waterData);
        }
      },
      removeComponent: () => {},
    } as unknown as ECS;

    return { ecs, components, leadEntity, leadStore, renderStore, rows, rowEntities };
  }

  it('render Y stays on leading (top) band row as band scrolls', () => {
    const rowCount = rowEnd - rowStart + 1;
    let rowYs = Array.from({ length: rowCount }, (_, i) => band.transitionTargetY - i * rowPitch);
    const deltaMs = 16;
    const deltaY = (raisingSpeed * deltaMs) / 1000;
    const leadingEntity = rowCount;

    for (let frame = 0; frame < 60; frame++) {
      rowYs = rowYs.map((y) => y + deltaY);
      const { ecs, components, renderStore, rows, rowEntities } = buildSimEcs(rowYs);
      for (let i = 0; i < rowEntities.length; i++) {
        const row = rows.get(rowEntities[i])!;
        row.y = rowYs[i];
      }

      mergeRowHazardPass({
        ecs,
        components,
        deltaTime: deltaMs,
        eventQueue: { addEvent: () => {} } as never,
      });

      const leadingY = rowYs[rowYs.length - 1];
      const renderY = renderStore.get(leadingEntity)?.position.y ?? 0;
      expect(Math.abs(renderY - leadingY)).toBeLessThan(0.5);
    }
  });

  it('phase01 is non-decreasing while band scrolls through transition', () => {
    const rowCount = rowEnd - rowStart + 1;
    let prevPhase = 0;
    let rowYs = Array.from({ length: rowCount }, (_, i) => band.transitionStartY - i * rowPitch);
    const { ecs, components, leadStore, leadEntity, rows, rowEntities } = buildSimEcs(rowYs);

    for (let frame = 0; frame < 80; frame++) {
      rowYs = rowYs.map((y) => y + 3);
      for (let i = 0; i < rowEntities.length; i++) {
        const row = rows.get(rowEntities[i])!;
        row.y = rowYs[i];
      }

      mergeRowHazardPass({
        ecs,
        components,
        deltaTime: 16,
        eventQueue: { addEvent: () => {} } as never,
      });

      const phase = leadStore.get(leadEntity)?.phase01 ?? 0;
      expect(phase).toBeGreaterThanOrEqual(prevPhase - 0.001);
      prevPhase = phase;
    }
  });
});
