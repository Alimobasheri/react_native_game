import { composePressIntroShaft } from '@/Game/path/platformShaft/composePressIntroShaft';
import { flowNormFromPlatformPress, flowNormFromPressVelocity } from '@/Game/hazards/flowFromPlatform';
import { TEST_COLS } from '@/Game/path/__tests__/testGrid';

describe('flowFromPlatform', () => {
  it('returns zero at rest', () => {
    const result = composePressIntroShaft({ seed: 42, difficulty01: 0.4, columns: TEST_COLS });
    const hazard = result.hazards[0];
    const flow = flowNormFromPlatformPress({
      hazard,
      localSec: 0,
      prevLocalSec: 0,
      gapWidthCols: 2,
      rowSpan: 3,
      maxRowSpan: 3,
    });
    expect(flow).toBe(0);
  });

  it('returns non-zero during active press', () => {
    const result = composePressIntroShaft({ seed: 42, difficulty01: 0.4, columns: TEST_COLS });
    const hazard = result.hazards[0];
    const duration = hazard.params.pressDurationSec ?? 1.4;
    const mid = duration * 0.5;
    const flow = flowNormFromPlatformPress({
      hazard,
      localSec: mid,
      prevLocalSec: mid - 0.016,
      gapWidthCols: 1,
      rowSpan: hazard.bounds.rowEnd - hazard.bounds.rowStart + 1,
      maxRowSpan: 3,
    });
    expect(Math.abs(flow)).toBeGreaterThan(0);
  });

  it('flowNormFromPressVelocity returns zero at rest', () => {
    const flow = flowNormFromPressVelocity({
      pressVelocity: 0,
      gapWidthCols: 2,
      rowSpan: 3,
      maxRowSpan: 3,
      pressDirection: 'right',
    });
    expect(flow).toBe(0);
  });

  it('flowNormFromPressVelocity is non-zero during squeeze', () => {
    const flow = flowNormFromPressVelocity({
      pressVelocity: 0.5,
      gapWidthCols: 1,
      rowSpan: 3,
      maxRowSpan: 3,
      pressDirection: 'right',
    });
    expect(Math.abs(flow)).toBeGreaterThan(0);
  });
});
