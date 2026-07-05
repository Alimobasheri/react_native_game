import { composePressIntroShaft } from '@/Game/path/platformShaft/composePressIntroShaft';
import {
  beatRowAtWorldY,
  hazardBeatRowAtTransition,
  leadingAnchorRow,
  trailingAnchorRow,
} from '@/Game/grid/beatRowAtWorldY';
import { buildGridAnchor } from '@/Game/grid/gridAnchor';
import { getObstacleRowPitch } from '@/assets/swimmerBlocks';
import { waterTransitionBandFromSurface } from '@/Game/grid/waterTransitionBand';
import { TEST_COLS } from '@/Game/path/__tests__/testGrid';
import type { ComponentStore } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/component';
import type { ObstacleRowComponentData } from '@/Game/ecs-components/ObstacleRowComponent';

function mockRowStore(
  rows: { entity: number; beatRowIndex: number; y: number }[]
): ComponentStore<ObstacleRowComponentData> {
  const map = new Map<number, ObstacleRowComponentData>();
  for (const r of rows) {
    map.set(r.entity, {
      y: r.y,
      gaps: [2, 3],
      solidColumnCentersX: [],
      prevRowEntity: null,
      beatRowIndex: r.beatRowIndex,
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

describe('beatRowAtWorldY', () => {
  const blockHeight = 50;
  const rowPitch = getObstacleRowPitch(blockHeight);

  it('beatRowAtWorldY is monotonic with increasing world Y', () => {
    const b0 = beatRowAtWorldY(100, 100, 8, rowPitch);
    const b1 = beatRowAtWorldY(100 + rowPitch, 100, 8, rowPitch);
    expect(b1).toBeGreaterThan(b0);
    expect(b1 - b0).toBeCloseTo(1, 5);
  });

  it('leadingAnchorRow picks smallest Y (top of band)', () => {
    const store = mockRowStore([
      { entity: 1, beatRowIndex: 8, y: 200 },
      { entity: 2, beatRowIndex: 9, y: 160 },
      { entity: 3, beatRowIndex: 10, y: 120 },
    ]);
    const anchor = buildGridAnchor(8, 10, [1, 2, 3]);
    const leading = leadingAnchorRow(anchor, store);
    expect(leading?.entity).toBe(3);
    expect(leading?.beatRow).toBe(10);
  });

  it('trailingAnchorRow picks largest Y (water-first on scroll-down)', () => {
    const store = mockRowStore([
      { entity: 1, beatRowIndex: 8, y: 200 },
      { entity: 2, beatRowIndex: 9, y: 160 },
      { entity: 3, beatRowIndex: 10, y: 120 },
    ]);
    const anchor = buildGridAnchor(8, 10, [1, 2, 3]);
    const trailing = trailingAnchorRow(anchor, store);
    expect(trailing?.entity).toBe(1);
    expect(trailing?.beatRow).toBe(8);
  });

  it('hazardBeatRowAtTransition uses trailing row and increases as Y scrolls down', () => {
    const store = mockRowStore([
      { entity: 1, beatRowIndex: 8, y: 80 },
      { entity: 2, beatRowIndex: 9, y: 40 },
      { entity: 3, beatRowIndex: 10, y: 0 },
    ]);
    const anchor = buildGridAnchor(8, 10, [1, 2, 3]);
    const waterSurfaceY = 400;
    const band = waterTransitionBandFromSurface(waterSurfaceY, blockHeight);

    let prevBeat = -1;
    for (let y = 80; y <= 350; y += 4) {
      const scrolled = mockRowStore([
        { entity: 1, beatRowIndex: 8, y },
        { entity: 2, beatRowIndex: 9, y: y - rowPitch },
        { entity: 3, beatRowIndex: 10, y: y - rowPitch * 2 },
      ]);
      const beat = hazardBeatRowAtTransition(anchor, scrolled, band, blockHeight);
      expect(beat).toBeGreaterThanOrEqual(prevBeat - 0.001);
      prevBeat = beat;
    }
  });
});

describe('hazardPhase integration with intro shaft', () => {
  it('composePressIntroShaft hazards have animStartRow before rowStart', () => {
    const result = composePressIntroShaft({ seed: 42, difficulty01: 0.4, columns: TEST_COLS });
    const hazard = result.hazards[0];
    const animStart = hazard.params.animStartRow ?? hazard.bounds.rowStart;
    expect(animStart).toBeLessThanOrEqual(hazard.bounds.rowStart);
  });
});
