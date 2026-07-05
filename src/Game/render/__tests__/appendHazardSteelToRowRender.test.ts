import {
  appendHazardSteelToRowRender,
  orangeLayersFromRowRender,
  slabSpanFromBlockCols,
} from '@/Game/render/appendHazardSteelToRowRender';
import { gridSpanToWorld } from '@/Game/grid/gridSpanToWorld';
import { simPlatformPress } from '@/Game/hazards/platformPressMotion';
import { composePressIntroShaft } from '@/Game/path/platformShaft/composePressIntroShaft';
import { TEST_COLS } from '@/Game/path/__tests__/testGrid';
import type { RenderLayerData } from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';

describe('appendHazardSteelToRowRender', () => {
  const columnWidth = 60;
  const beat = composePressIntroShaft({ seed: 42, difficulty01: 0.4, columns: TEST_COLS });
  const hazard = beat.hazards[0];
  const rowStart = hazard.bounds.rowStart;

  it('orange layer local y stays 0 across repeated merge frames', () => {
    const orangeLayer: RenderLayerData = {
      position: { x: 10, y: 0 },
      shape: { type: 'rectangle', width: columnWidth, height: columnWidth },
      image: 'block',
      visible: true,
    };
    let layers: RenderLayerData[] = [orangeLayer];
    const leadRowY = 300;
    const worldRect = gridSpanToWorld({
      slabStart: 2,
      slabEnd: 3,
      rowYs: [leadRowY],
      leftX: 0,
      columnWidth,
      blockHeight: columnWidth,
      rowPitch: 72,
      columns: TEST_COLS,
    });

    for (let frame = 0; frame < 60; frame++) {
      const result = appendHazardSteelToRowRender({
        existingLayers: layers,
        worldRect,
        leadRowY,
      });
      layers = result.renderLayers;
      const orange = orangeLayersFromRowRender(layers);
      expect(orange.length).toBe(1);
      expect(orange[0].position.y).toBe(0);
      expect(result.positionY).toBeCloseTo(leadRowY, 5);
    }
  });

  it('slabSpanFromBlockCols matches collision column count at partial press', () => {
    const sim = simPlatformPress(hazard, TEST_COLS, 0.5, rowStart);
    expect(sim).not.toBeNull();
    const span = slabSpanFromBlockCols(
      sim!.blockCols,
      TEST_COLS,
      sim!.slabStart,
      sim!.slabEnd
    );
    expect(span.slabEnd - span.slabStart).toBe(sim!.blockCols.length);
    const rect = gridSpanToWorld({
      slabStart: span.slabStart,
      slabEnd: span.slabEnd,
      rowYs: [200],
      leftX: 0,
      columnWidth,
      blockHeight: columnWidth,
      rowPitch: 72,
      columns: TEST_COLS,
    });
    expect(rect.width).toBeCloseTo(sim!.blockCols.length * columnWidth, 5);
  });
});
