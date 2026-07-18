import { composePressIntroShaft } from '@/Game/path/platformShaft/composePressIntroShaft';
import { computeHazardPhase, hazardLocalSecFromBeatRow } from '@/Game/grid/hazardPhase';
import {
  hazardBeatRowAtTransition,
  trailingAnchorRow,
} from '@/Game/grid/beatRowAtWorldY';
import { buildGridAnchor } from '@/Game/grid/gridAnchor';
import { waterTransitionBandFromSurface } from '@/Game/grid/waterTransitionBand';
import { getObstacleRowPitch } from '@/assets/swimmerBlocks';
import { TEST_COLS, asPlatformSlabHazard } from '@/Game/path/__tests__/testGrid';
import type { ComponentStore } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/component';
import type { ObstacleRowComponentData } from '@/Game/ecs-components/ObstacleRowComponent';

describe('hazardPhase', () => {
  const result = composePressIntroShaft({ seed: 42, difficulty01: 0.4, columns: TEST_COLS });
  const hazard = asPlatformSlabHazard(result.hazards[0]);
  const rowDurationSec = 0.25;
  const animStart = hazard.params.animStartRow ?? hazard.bounds.rowStart;

  it('localSec is zero before animStartRow', () => {
    expect(hazardLocalSecFromBeatRow(hazard, animStart - 1, rowDurationSec)).toBe(0);
  });

  it('localSec grows after animStartRow', () => {
    const local = hazardLocalSecFromBeatRow(hazard, animStart + 2, rowDurationSec);
    expect(local).toBeGreaterThan(0);
  });

  it('phase01 is monotonic over increasing beat rows', () => {
    let prevPhase = 0;
    for (let beat = animStart; beat <= animStart + 10; beat += 0.1) {
      const { phase01 } = computeHazardPhase(hazard, beat, rowDurationSec);
      expect(phase01).toBeGreaterThanOrEqual(prevPhase - 0.0001);
      prevPhase = phase01;
    }
  });

  it('phase01 caps at 1 at full press', () => {
    const duration = hazard.params.pressDurationSec ?? 1.4;
    const beatAtFull = animStart + duration / rowDurationSec + 2;
    const { phase01, pressExtent } = computeHazardPhase(hazard, beatAtFull, rowDurationSec);
    expect(phase01).toBe(1);
    expect(pressExtent).toBe(hazard.params.pressCols ?? 1);
  });

  it('trailing transition beat produces monotonic phase01 while scrolling down', () => {
    const blockHeight = 60;
    const rowPitch = getObstacleRowPitch(blockHeight);
    const rowStart = hazard.bounds.rowStart;
    const rowEnd = hazard.bounds.rowEnd;
    const band = waterTransitionBandFromSurface(500, blockHeight);
    const anchor = buildGridAnchor(rowStart, rowEnd, [1, 2, 3]);

    const mkStore = (y8: number): ComponentStore<ObstacleRowComponentData> => {
      const map = new Map<number, ObstacleRowComponentData>([
        [
          1,
          {
            y: y8,
            gaps: [],
            solidColumnCentersX: [],
            prevRowEntity: null,
            beatRowIndex: rowStart,
          },
        ],
        [
          2,
          {
            y: y8 - rowPitch,
            gaps: [],
            solidColumnCentersX: [],
            prevRowEntity: null,
            beatRowIndex: rowStart + 1,
          },
        ],
        [
          3,
          {
            y: y8 - rowPitch * 2,
            gaps: [],
            solidColumnCentersX: [],
            prevRowEntity: null,
            beatRowIndex: rowEnd,
          },
        ],
      ]);
      return {
        get: (id: number) => map.get(id),
        forEach: (fn) => map.forEach((data, id) => fn(id, data)),
        count: () => map.size,
      } as ComponentStore<ObstacleRowComponentData>;
    };

    expect(trailingAnchorRow(anchor, mkStore(200))?.beatRow).toBe(rowStart);

    let prevPhase = 0;
    for (let y8 = 100; y8 <= 400; y8 += 5) {
      const beatRow = hazardBeatRowAtTransition(anchor, mkStore(y8), band, blockHeight);
      const { phase01 } = computeHazardPhase(hazard, beatRow, rowDurationSec);
      expect(phase01).toBeGreaterThanOrEqual(prevPhase - 0.001);
      prevPhase = phase01;
    }
  });
});
