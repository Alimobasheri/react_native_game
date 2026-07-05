import { composePressIntroShaft } from '@/Game/path/platformShaft/composePressIntroShaft';
import { resolveRowEntitiesForBeatRange } from '@/Game/grid/gridAnchor';
import { purgePlatformShaftHazardsAndEffectiveGaps } from '@/Game/hazards/purgePlatformShaftHazardState';
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
import type { ComponentStore } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/component';
import type { ECS } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/ecs';

describe('hazardSegmentLoop', () => {
  const beat = composePressIntroShaft({ seed: 42, difficulty01: 0.4, columns: 6 });
  const hazard = beat.hazards[0];

  it('resolveRowEntitiesForBeatRange picks current epoch when duplicates exist', () => {
    const rowStart = hazard.bounds.rowStart;
    const rowEnd = hazard.bounds.rowEnd;
    const rows = new Map<number, ObstacleRowComponentData>();
    for (let beatIdx = rowStart; beatIdx <= rowEnd; beatIdx++) {
      rows.set(beatIdx, {
        y: 100,
        gaps: [],
        solidColumnCentersX: [],
        prevRowEntity: null,
        beatRowIndex: beatIdx,
        shaftSegmentEpoch: 1,
      });
      rows.set(beatIdx + 100, {
        y: 300,
        gaps: [],
        solidColumnCentersX: [],
        prevRowEntity: null,
        beatRowIndex: beatIdx,
        shaftSegmentEpoch: 2,
      });
    }
    const store = {
      get: (id: number) => rows.get(id),
      forEach: (fn: (entity: number, data: ObstacleRowComponentData) => void) => {
        rows.forEach((data, entity) => fn(entity, data));
      },
      count: () => rows.size,
    } as ComponentStore<ObstacleRowComponentData>;

    const epoch1 = resolveRowEntitiesForBeatRange(store, rowStart, rowEnd, {
      shaftSegmentEpoch: 1,
    });
    const epoch2 = resolveRowEntitiesForBeatRange(store, rowStart, rowEnd, {
      shaftSegmentEpoch: 2,
    });
    expect(epoch1.every((id) => id < 100)).toBe(true);
    expect(epoch2.every((id) => id >= 100)).toBe(true);
    expect(epoch1.length).toBe(rowEnd - rowStart + 1);
    expect(epoch2.length).toBe(rowEnd - rowStart + 1);
  });

  it('loop purge strips leads tagged with prior shaft epoch', () => {
    const rowStart = hazard.bounds.rowStart;
    const leadEntity = 50;
    const leadData: HazardBandLeadComponentData = createHazardBandLeadComponent({
      modifierId: hazard.id,
      hazardId: hazard.id,
      side: hazard.side,
      bounds: hazard.bounds,
      params: hazard.params,
      memberRowEntityIds: [51, 52],
      shaftSegmentEpoch: 1,
    }).data;

    const leadStore = new Map<number, HazardBandLeadComponentData>([[leadEntity, leadData]]);
    const memberStore = new Map<number, { modifierId: string; leadEntityId: number }>([
      [51, { modifierId: hazard.id, leadEntityId: leadEntity }],
      [52, { modifierId: hazard.id, leadEntityId: leadEntity }],
    ]);

    const components: Record<string, ComponentStore<unknown>> = {
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
      [ObstacleRowComponentName]: {
        get: () => undefined,
        forEach: () => {},
        count: () => 0,
      } as ComponentStore<ObstacleRowComponentData>,
    };

    const ecs = {
      components,
      removeComponent: (entity: number, name: string) => {
        if (name === HazardBandLeadComponentName) {
          leadStore.delete(entity);
        }
        if (name === HazardBandMemberComponentName) {
          memberStore.delete(entity);
        }
      },
      updateComponent: () => {},
    } as unknown as ECS;

    purgePlatformShaftHazardsAndEffectiveGaps({
      ecs,
      components,
      sceneKey: 'swimmerGame',
      eventQueue: { addEvent: () => {} },
    });

    expect(leadStore.size).toBe(0);
    expect(memberStore.size).toBe(0);
  });
});
