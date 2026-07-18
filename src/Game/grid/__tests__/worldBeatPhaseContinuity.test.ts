import { composePressIntroShaft } from '@/Game/path/platformShaft/composePressIntroShaft';
import { hazardLocalSecFromBeatRow } from '@/Game/grid/hazardPhase';
import { latchedWorldBeat, worldBeatFromWaterLock } from '@/Game/grid/worldBeatFromWaterLock';
import { getObstacleRowPitch } from '@/assets/swimmerBlocks';
import { waterTransitionBandFromSurface } from '@/Game/grid/waterTransitionBand';
import { TEST_COLS, asPlatformSlabHazard } from '@/Game/path/__tests__/testGrid';

describe('worldBeatPhaseContinuity', () => {
  const blockHeight = 60;
  const rowPitch = getObstacleRowPitch(blockHeight);
  const waterSurfaceY = 500;
  const band = waterTransitionBandFromSurface(waterSurfaceY, blockHeight);
  const result = composePressIntroShaft({ seed: 42, difficulty01: 0.4, columns: TEST_COLS });
  const hazard = asPlatformSlabHazard(result.hazards[0]);
  const animStart = hazard.params.animStartRow ?? hazard.bounds.rowStart;
  const rowDurationSec = 0.25;
  const pressDuration = hazard.params.pressDurationSec ?? 1.4;

  it('localSec reaches press duration when worldBeat advances past transition band', () => {
    const centerBeat = animStart;
    let latched = -1;
    let localSec = 0;
    for (let y = band.transitionStartY; y <= band.transitionEndY + rowPitch * 10; y += rowPitch * 0.25) {
      const beat = worldBeatFromWaterLock(centerBeat, y, rowPitch, band, blockHeight);
      latched = latchedWorldBeat(latched, beat);
      localSec = hazardLocalSecFromBeatRow(hazard, latched, rowDurationSec);
    }
    expect(localSec).toBeGreaterThanOrEqual(pressDuration);
  });
});
