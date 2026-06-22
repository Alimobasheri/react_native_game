import {
  countVisibleObstacleBlocks,
  estimateMaxVisibleObstacleBlocks,
  isObstacleRowVisibleOnScreen,
  vignetteStrengthFromVisibleBlockCount,
} from '@/Game/visual/obstacleDensityVignette';
import type { ObstacleRowComponentData } from '@/Game/ecs-components/ObstacleRowComponent';
import type { ComponentStore } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/component';

function mockRowStore(
  rows: ObstacleRowComponentData[]
): ComponentStore<ObstacleRowComponentData> {
  return {
    count: () => rows.length,
    forEach: (fn) => {
      rows.forEach((data, i) => fn(i + 1, data));
    },
    forEachEntity: (fn) => {
      rows.forEach((_data, i) => fn(i + 1));
    },
  } as ComponentStore<ObstacleRowComponentData>;
}

describe('obstacleDensityVignette', () => {
  it('isObstacleRowVisibleOnScreen intersects viewport band', () => {
    expect(isObstacleRowVisibleOnScreen(100, 40, 0, 200)).toBe(true);
    expect(isObstacleRowVisibleOnScreen(300, 40, 0, 200)).toBe(false);
    expect(isObstacleRowVisibleOnScreen(10, 40, 0, 200)).toBe(true);
    expect(isObstacleRowVisibleOnScreen(-30, 40, 0, 200)).toBe(false);
  });

  it('countVisibleObstacleBlocks sums solid columns in view only', () => {
    const store = mockRowStore([
      { y: 50, gaps: [], solidColumnCentersX: [1, 2], prevRowEntity: null },
      { y: 150, gaps: [], solidColumnCentersX: [3], prevRowEntity: null },
      { y: 400, gaps: [], solidColumnCentersX: [4, 5, 6], prevRowEntity: null },
    ]);
    expect(countVisibleObstacleBlocks(store, 0, 200, 40)).toBe(3);
  });

  it('vignetteStrengthFromVisibleBlockCount scales between min and max', () => {
    expect(vignetteStrengthFromVisibleBlockCount(0, 16, 0.1, 0.5)).toBeCloseTo(
      0.1
    );
    expect(vignetteStrengthFromVisibleBlockCount(16, 16, 0.1, 0.5)).toBeCloseTo(
      0.5
    );
    expect(
      vignetteStrengthFromVisibleBlockCount(8, 16, 0.1, 0.5)
    ).toBeCloseTo(0.3);
  });

  it('estimateMaxVisibleObstacleBlocks uses row pitch slots', () => {
    expect(estimateMaxVisibleObstacleBlocks(800, 100)).toBe(8 * 8);
  });
});
