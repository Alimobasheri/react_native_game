import { getObstacleRowPitch } from '@/assets/swimmerBlocks';
import { mergeRowHazardPass } from '@/Game/grid/mergeRowHazardPass';
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
import { waterTransitionBandFromSurface } from '@/Game/grid/waterTransitionBand';
import { TEST_COLS } from '@/Game/path/__tests__/testGrid';

/**
 * Seed 42 intro: rows 7–9 are 3-col corridor (gaps 2,3,4); row 10 returns to 2-col.
 * Hazard h0 spans 7–9. Before one column of press travel, anchor slab overlap must NOT
 * close gap 4 in collision — orange still shows open col 4, invisible pin otherwise.
 */
describe('telegraphCollisionParity', () => {
  const beat = composePressIntroShaft({ seed: 42, difficulty01: 0.4, columns: TEST_COLS });
  const hazard = beat.hazards[0];
  const blockHeight = 60;
  const rowPitch = getObstacleRowPitch(blockHeight);
  const waterSurfaceY = 500;
  const band = waterTransitionBandFromSurface(waterSurfaceY, blockHeight);

  function runMergeAtTelegraph(leadY: number) {
    const rowStart = hazard.bounds.rowStart;
    const rowEnd = hazard.bounds.rowEnd;
    const rowEntities = [1, 2, 3];
    const rows = new Map<number, ObstacleRowComponentData>();
    for (let i = 0; i < rowEntities.length; i++) {
      const beatIdx = rowStart + i;
      rows.set(rowEntities[i], {
        y: leadY - i * rowPitch,
        gaps: beat.rows[beatIdx].gaps.slice(),
        solidColumnCentersX: [],
        prevRowEntity: i > 0 ? rowEntities[i - 1] : null,
        beatRowIndex: beatIdx,
      });
    }

    const animStart = hazard.params.animStartRow ?? rowStart;
    rows.set(99, {
      y: band.transitionStartY - rowPitch * 8,
      gaps: beat.rows[Math.max(0, animStart - 1)].gaps.slice(),
      solidColumnCentersX: [],
      prevRowEntity: null,
      beatRowIndex: animStart - 1,
    });

    const leadEntity = rowEntities[rowEntities.length - 1];
    const leadData: HazardBandLeadComponentData = createHazardBandLeadComponent({
      modifierId: hazard.id,
      hazardId: hazard.id,
      side: hazard.side,
      bounds: hazard.bounds,
      params: hazard.params,
      memberRowEntityIds: rowEntities,
    }).data;

    const leadStore = new Map([[leadEntity, leadData]]);
    const containerWidth = TEST_COLS * blockHeight;

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
          centerX: containerWidth / 2,
          centerY: 400,
          width: containerWidth,
          height: 800,
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
      getEntitiesWithComponents: () => [leadEntity],
      updateComponent: (entity: number, name: string, fn: (d: unknown) => void) => {
        if (name === HazardBandLeadComponentName) {
          const d = leadStore.get(entity);
          if (d) fn(d);
        }
        if (name === ObstacleRowComponentName) {
          const d = rows.get(entity);
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

    return rows;
  }

  it('3-col hazard rows keep rest gaps at telegraph (lead above water)', () => {
    const leadY = band.transitionStartY - rowPitch * 3;
    const rows = runMergeAtTelegraph(leadY);
    for (let beatIdx = hazard.bounds.rowStart; beatIdx <= hazard.bounds.rowEnd; beatIdx++) {
      const ent = beatIdx - hazard.bounds.rowStart + 1;
      const row = rows.get(ent)!;
      const base = beat.rows[beatIdx].gaps;
      expect(row.effectiveGaps).toBeUndefined();
      expect(base).toEqual([2, 3, 4]);
    }
  });

  it('lead row below water band does not advance press collision when never latched', () => {
    const leadY = band.transitionEndY + rowPitch * 5;
    const rows = runMergeAtTelegraph(leadY);
    for (let beatIdx = hazard.bounds.rowStart; beatIdx <= hazard.bounds.rowEnd; beatIdx++) {
      const ent = beatIdx - hazard.bounds.rowStart + 1;
      expect(rows.get(ent)!.effectiveGaps).toBeUndefined();
    }
  });

  it('row 10 below hazard band has no effectiveGaps', () => {
    expect(beat.rows[10].gaps).toEqual([2, 3]);
  });
});
