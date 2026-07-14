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
import { TEST_COLS } from '@/Game/path/__tests__/testGrid';

describe('hazardBandPhaseFromLeadRow', () => {
  const blockHeight = 60;
  const rowPitch = getObstacleRowPitch(blockHeight);
  const beat = composePressIntroShaft({ seed: 42, difficulty01: 0.4, columns: TEST_COLS });
  const hazard = beat.hazards[0];
  const waterSurfaceY = 500;
  const band = waterTransitionBandFromSurface(waterSurfaceY, blockHeight);

  it('phase stays 0 when lead row is above the transition band', () => {
    const leadY = band.transitionStartY - rowPitch * 4;
    const rowEntities = [1];
    const rows = new Map<number, ObstacleRowComponentData>([
      [
        1,
        {
          y: leadY,
          gaps: beat.rows[hazard.bounds.rowStart].gaps.slice(),
          solidColumnCentersX: [],
          prevRowEntity: null,
          beatRowIndex: hazard.bounds.rowStart,
        },
      ],
    ]);
    const leadData: HazardBandLeadComponentData = createHazardBandLeadComponent({
      modifierId: hazard.id,
      hazardId: hazard.id,
      side: hazard.side,
      bounds: hazard.bounds,
      params: hazard.params,
      memberRowEntityIds: [1],
    }).data;
    const leadStore = new Map([[1, leadData]]);

    const components = {
      [ObstacleRowComponentName]: {
        get: (id: number) => rows.get(id),
        forEach: (fn: (id: number, d: ObstacleRowComponentData) => void) => {
          rows.forEach((d, id) => fn(id, d));
        },
        count: () => rows.size,
      },
      [HazardBandLeadComponentName]: {
        get: (id: number) => leadStore.get(id),
        forEach: (fn: (id: number) => void) => leadStore.forEach((_, id) => fn(id)),
        count: () => leadStore.size,
      },
      [ContainerComponentName]: {
        get: () => ({
          centerX: (TEST_COLS * blockHeight) / 2,
          width: TEST_COLS * blockHeight,
          waterSurfaceY,
        }),
        forEach: (fn: (id: number) => void) => fn(0),
        count: () => 1,
      },
      [WaterComponentName]: {
        get: () => ({ raisingSpeed: 200, centerRowEntity: 99 }),
        forEach: (fn: (id: number) => void) => fn(0),
        count: () => 1,
      },
      [ObstaclesManagerComponentName]: {
        get: () => ({ sceneKey: 'swimmerGame' }),
        forEach: (fn: (id: number) => void) => fn(0),
        count: () => 1,
      },
      [GameSessionComponentName]: {
        get: () => ({ phase: 'playing' }),
        forEach: (fn: (id: number) => void) => fn(0),
        count: () => 1,
      },
    };

    const ecs = {
      components,
      getEntitiesWithComponents: () => [1],
      updateComponent: (entity: number, name: string, fn: (d: unknown) => void) => {
        if (name === HazardBandLeadComponentName) {
          const d = leadStore.get(entity);
          if (d) fn(d);
        }
        if (name === WaterComponentName) fn({});
      },
      removeComponent: () => { },
    };

    mergeRowHazardPass({
      ecs: ecs as never,
      components: components as never,
      deltaTime: 16,
      eventQueue: { addEvent: () => { } } as never,
    });

    expect(leadStore.get(1)?.phase01).toBe(0);
    expect(leadStore.get(1)?.localSec).toBe(0);
  });
});
