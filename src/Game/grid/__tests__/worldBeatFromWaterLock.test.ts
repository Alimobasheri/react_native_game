import { composePressIntroShaft } from '@/Game/path/platformShaft/composePressIntroShaft';
import { hazardLocalSecFromBeatRow } from '@/Game/grid/hazardPhase';
import {
  hazardBandCouplesToWaterLock,
  latchedSegmentWorldBeat,
  latchedWorldBeat,
  resolveSegmentWaterLockRow,
  worldBeatFromWaterLock,
} from '@/Game/grid/worldBeatFromWaterLock';
import type { ObstacleRowComponentData } from '@/Game/ecs-components/ObstacleRowComponent';
import { getObstacleRowPitch } from '@/assets/swimmerBlocks';
import { waterTransitionBandFromSurface } from '@/Game/grid/waterTransitionBand';
import { TEST_COLS } from '@/Game/path/__tests__/testGrid';

describe('worldBeatFromWaterLock', () => {
  const blockHeight = 60;
  const rowPitch = getObstacleRowPitch(blockHeight);
  const waterSurfaceY = 500;
  const band = waterTransitionBandFromSurface(waterSurfaceY, blockHeight);
  const centerBeatRow = 12;

  it('worldBeat is monotonic as center row Y increases through and past the band', () => {
    let prev = -Infinity;
    for (let y = band.transitionStartY; y <= band.transitionEndY + rowPitch * 6; y += 2) {
      const beat = worldBeatFromWaterLock(centerBeatRow, y, rowPitch, band, blockHeight);
      expect(beat).toBeGreaterThanOrEqual(prev - 0.0001);
      prev = beat;
    }
  });

  it('latchedWorldBeat never decreases', () => {
    expect(latchedWorldBeat(5, 4)).toBe(5);
    expect(latchedWorldBeat(5, 6)).toBe(6);
    expect(latchedWorldBeat(-1, 3)).toBe(3);
    expect(latchedWorldBeat(8, -1)).toBe(8);
  });

  it('latchedSegmentWorldBeat resets on loop-scale regression', () => {
    expect(latchedSegmentWorldBeat(28, 4)).toBe(4);
    expect(latchedSegmentWorldBeat(28, 27.6)).toBe(28);
    expect(latchedSegmentWorldBeat(-1, 3)).toBe(3);
  });

  it('resolveSegmentWaterLockRow ignores stale center row from prior shaft epoch', () => {
    const waterSurfaceY = 500;
    const blockHeight = 60;
    const rows = new Map<number, ObstacleRowComponentData>([
      [
        1,
        {
          y: waterSurfaceY,
          gaps: [],
          solidColumnCentersX: [],
          prevRowEntity: null,
          beatRowIndex: 28,
          shaftSegmentEpoch: 1,
        },
      ],
      [
        2,
        {
          y: waterSurfaceY + 120,
          gaps: [],
          solidColumnCentersX: [],
          prevRowEntity: null,
          beatRowIndex: 5,
          shaftSegmentEpoch: 2,
        },
      ],
    ]);
    const store = {
      get: (id: number) => rows.get(id),
      forEach: (fn: (entity: number, row: ObstacleRowComponentData) => void) => {
        rows.forEach((row, entity) => fn(entity, row));
      },
    };
    const lock = resolveSegmentWaterLockRow({
      rowStore: store,
      centerRowEntity: 1,
      shaftSegmentEpoch: 2,
      waterSurfaceY,
      blockHeight,
    });
    expect(lock?.beatRowIndex).toBe(5);
    expect(lock?.entity).toBe(2);
  });

  it('localSec is zero before animStartRow', () => {
    const result = composePressIntroShaft({ seed: 42, difficulty01: 0.4, columns: TEST_COLS });
    const hazard = result.hazards[0];
    const animStart = hazard.params.animStartRow ?? hazard.bounds.rowStart;
    const rowDurationSec = 0.25;
    const beatBefore = animStart - 0.5;
    expect(hazardLocalSecFromBeatRow(hazard, beatBefore, rowDurationSec)).toBe(0);
  });

  it('localSec reaches press duration after enough worldBeat advance', () => {
    const result = composePressIntroShaft({ seed: 42, difficulty01: 0.4, columns: TEST_COLS });
    const hazard = result.hazards[0];
    const animStart = hazard.params.animStartRow ?? hazard.bounds.rowStart;
    const rowDurationSec = 0.25;
    const pressDuration = hazard.params.pressDurationSec ?? 1.4;
    const beatsNeeded = pressDuration / rowDurationSec + 1;
    const beatAtFull = animStart + beatsNeeded;
    const localSec = hazardLocalSecFromBeatRow(hazard, beatAtFull, rowDurationSec);
    expect(localSec).toBeGreaterThanOrEqual(pressDuration);
  });

  it('worldBeat continues increasing after center row exits transition band', () => {
    const yInBand = band.transitionTargetY + blockHeight * 0.25;
    const yPastBand = band.transitionEndY + rowPitch * 3;
    const beatIn = worldBeatFromWaterLock(centerBeatRow, yInBand, rowPitch, band, blockHeight);
    const beatPast = worldBeatFromWaterLock(centerBeatRow, yPastBand, rowPitch, band, blockHeight);
    expect(beatPast).toBeGreaterThan(beatIn + 1);
  });

  it('hazardBandCouplesToWaterLock uses transition band overlap on member row', () => {
    const yInBand = band.transitionTargetY;
    const lockRow = { entity: 2, beatRowIndex: 8, y: yInBand };
    expect(
      hazardBandCouplesToWaterLock({
        waterLockRow: lockRow,
        memberRowEntityIds: [1, 2, 3],
        transitionBand: band,
        blockHeight,
      })
    ).toBe(true);
    expect(
      hazardBandCouplesToWaterLock({
        waterLockRow: { entity: 2, beatRowIndex: 8, y: yInBand - blockHeight * 4 },
        memberRowEntityIds: [1, 2, 3],
        transitionBand: band,
        blockHeight,
      })
    ).toBe(false);
    expect(
      hazardBandCouplesToWaterLock({
        waterLockRow: lockRow,
        memberRowEntityIds: [10, 11],
        transitionBand: band,
        blockHeight,
      })
    ).toBe(false);
  });
});
