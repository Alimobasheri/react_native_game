import { getObstacleRowPitch } from '@/assets/swimmerBlocks';
import { appendHazardSteelToRowRender } from '@/Game/render/appendHazardSteelToRowRender';
import { gridSpanToWorld } from '@/Game/grid/gridSpanToWorld';
import { simPlatformPress } from '@/Game/hazards/platformPressMotion';
import { composePressIntroShaft } from '@/Game/path/platformShaft/composePressIntroShaft';
import { TEST_COLS } from '@/Game/path/__tests__/testGrid';
import type { RenderLayerData } from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';

describe('hazardRenderTelegraph', () => {
  const columnWidth = 60;
  const blockHeight = 60;
  const rowPitch = getObstacleRowPitch(blockHeight);
  const leftX = 0;
  const beat = composePressIntroShaft({ seed: 42, difficulty01: 0.4, columns: TEST_COLS });
  const hazard = beat.hazards[0];
  const rowStart = hazard.bounds.rowStart;

  it('gridSpanToWorld uses 1-col width at telegraph (no 0.15 fudge)', () => {
    const sim = simPlatformPress(hazard, TEST_COLS, 0, rowStart);
    expect(sim).not.toBeNull();
    const rect = gridSpanToWorld({
      slabStart: sim!.slabStart,
      slabEnd: sim!.slabEnd,
      rowYs: [200],
      leftX,
      columnWidth,
      blockHeight,
      rowPitch,
      columns: TEST_COLS,
    });
    expect(rect.width).toBeCloseTo(columnWidth, 5);
    expect(rect.width).toBeLessThan(columnWidth * 1.5);
  });

  it('appendHazardSteelToRowRender yields steel layers at localSec === 0', () => {
    const sim = simPlatformPress(hazard, TEST_COLS, 0, rowStart);
    expect(sim).not.toBeNull();
    const rowYs = [200, 200 - rowPitch];
    const worldRect = gridSpanToWorld({
      slabStart: sim!.slabStart,
      slabEnd: sim!.slabEnd,
      rowYs,
      leftX,
      columnWidth,
      blockHeight,
      rowPitch,
      columns: TEST_COLS,
    });
    const orangeLayer: RenderLayerData = {
      position: { x: 0, y: 0 },
      shape: { type: 'rectangle', width: columnWidth, height: blockHeight },
      image: 'test-block',
      visible: true,
    };
    const { renderLayers } = appendHazardSteelToRowRender({
      existingLayers: [orangeLayer],
      worldRect,
      leadRowY: rowYs[0],
    });
    const steelLayers = renderLayers.filter((l) => !l.image);
    expect(steelLayers.length).toBeGreaterThan(0);
    expect(steelLayers[0].shape.width).toBeGreaterThan(0);
  });
});
