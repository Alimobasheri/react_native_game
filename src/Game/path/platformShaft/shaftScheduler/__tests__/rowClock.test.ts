import { platformShaftTuning } from '@/config/platformShaftTuning';
import { buildPlatformSlabHazard } from '@/Game/path/platformShaft/recipeCompose';
import {
  computeRowClockPressTiming,
  pressDurationSecFromRows,
  rowDurationSecFromSpeed,
} from '@/Game/path/platformShaft/shaftScheduler/rowClock';
import {
  pressExtentAtLocalSec,
  resolvePressDurationSec,
} from '@/Game/hazards/platformPressMotion';

describe('rowClock', () => {
  const blockHeight = 60;
  const swimmerHeight = 120;

  it('rowDurationSec scales inversely with raisingSpeed', () => {
    const slow = rowDurationSecFromSpeed(blockHeight, 200);
    const fast = rowDurationSecFromSpeed(blockHeight, 400);
    expect(fast).toBeCloseTo(slow / 2, 5);
  });

  it('computeRowClockPressTiming yields positive duration rows', () => {
    const timing = computeRowClockPressTiming({
      shaftRow: 10,
      difficulty01: 0.2,
      swimmerHeight,
      blockHeight,
    });
    expect(timing.pressStartRow).toBeLessThan(10);
    expect(timing.pressFullRow).toBeGreaterThan(10);
    expect(timing.pressDurationRows).toBeGreaterThan(0);
  });

  it('pressDurationRows produces same beat-row full press at different scroll speeds', () => {
    const timing = computeRowClockPressTiming({
      shaftRow: 12,
      difficulty01: 0.4,
      swimmerHeight,
      blockHeight,
    });
    const hazard = buildPlatformSlabHazard(
      {
        pressCols: 1,
        pressDurationRows: timing.pressDurationRows,
        pressEase: 'linear',
        animStartRow: timing.pressStartRow,
      },
      6,
      timing.pressStartRow + 1,
      1,
      'right',
      'test-hz-rowclock'
    );

    const rowDur200 = rowDurationSecFromSpeed(blockHeight, 200);
    const rowDur400 = rowDurationSecFromSpeed(blockHeight, 400);
    const sec200 = resolvePressDurationSec(hazard, rowDur200);
    const sec400 = resolvePressDurationSec(hazard, rowDur400);

    expect(sec400).toBeCloseTo(sec200 / 2, 5);

    const beatAtFull = timing.pressStartRow + timing.pressDurationRows;
    const localSec200 = (beatAtFull - timing.pressStartRow) * rowDur200;
    const localSec400 = (beatAtFull - timing.pressStartRow) * rowDur400;

    const full200 = pressExtentAtLocalSec(hazard, localSec200, rowDur200);
    const full400 = pressExtentAtLocalSec(hazard, localSec400, rowDur400);
    expect(full200.pressT).toBeCloseTo(1, 3);
    expect(full400.pressT).toBeCloseTo(1, 3);
  });

  it('falls back to pressDurationSec when rowDurationSec omitted', () => {
    const hazard = buildPlatformSlabHazard(
      {
        pressCols: 1,
        pressDurationSec: 1.2,
        pressDurationRows: 5,
        pressEase: 'linear',
        animStartRow: 0,
      },
      6,
      2,
      1,
      'left',
      'test-hz-fallback'
    );
    expect(resolvePressDurationSec(hazard, undefined)).toBe(1.2);
  });

  it('pressDurationSecFromRows matches row clock conversion', () => {
    const rows = 4;
    const rowDur = rowDurationSecFromSpeed(blockHeight, 300);
    expect(pressDurationSecFromRows(rows, rowDur)).toBeCloseTo(rows * rowDur, 5);
    expect(platformShaftTuning.CLEARANCE_MARGIN_ROWS).toBeGreaterThanOrEqual(0);
  });
});
