import { composePathChicane } from '@/Game/path/platformShaft/pathIntent/pathGenerators';
import {
  collectCenterConstraints,
  planCornerStackFlow,
} from '@/Game/path/platformShaft/shaftScheduler/cornerStackFlowPlan';
import { platformShaftTuning } from '@/config/platformShaftTuning';
import { TEST_COLS } from '@/Game/path/__tests__/testGrid';

describe('cornerStackFlowPlan', () => {
  it('seed 42 segments have escalate → peak → deescalate before each constraint', () => {
    const path = composePathChicane({ seed: 42, difficulty01: 0.2, columns: TEST_COLS });
    const shaftStart = platformShaftTuning.PATH_SHAFT_START_ROW;
    const { rows: phases } = planCornerStackFlow(path.pathRows, {
      columns: TEST_COLS,
      shaftStartRow: shaftStart,
      wideGapCols: 4,
      difficulty01: 0.2,
      minResidualGapCols: 1,
    });
    expect(phases[0]!.flowKind).toBe('corner_stack');
    const constraints = collectCenterConstraints(path.pathRows, shaftStart, TEST_COLS);
    expect(constraints.length).toBeGreaterThan(0);

    for (const cIdx of constraints) {
      const seg = phases.slice(shaftStart, cIdx);
      if (seg.length < 4) continue;
      expect(seg.some((p) => p.phase === 'escalate' || p.phase === 'peak')).toBe(true);
      expect(seg.some((p) => p.phase === 'deescalate' || p.phase === 'gap_shift_runway')).toBe(
        true
      );
    }
  });

  it('deescalate phase caps press lower than peak', () => {
    const path = composePathChicane({ seed: 42, difficulty01: 0.2, columns: TEST_COLS });
    const shaftStart = platformShaftTuning.PATH_SHAFT_START_ROW;
    const { rows: phases } = planCornerStackFlow(path.pathRows, {
      columns: TEST_COLS,
      shaftStartRow: shaftStart,
      wideGapCols: 4,
      difficulty01: 0.2,
      minResidualGapCols: 1,
    });
    const peakMax = Math.max(
      ...phases.filter((p) => p.phase === 'peak').map((p) => p.maxPressCols ?? 0)
    );
    const releaseMax = Math.max(
      ...phases.filter((p) => p.phase === 'deescalate').map((p) => p.maxPressCols ?? 0)
    );
    if (peakMax > 0 && releaseMax > 0) {
      expect(releaseMax).toBeLessThanOrEqual(peakMax);
    }
  });

  it('seed 42 path rows carry both authored shaft sides', () => {
    const path = composePathChicane({
      seed: 42,
      difficulty01: 0.2,
      columns: TEST_COLS,
      applyCeilingPins: false,
    });
    const sides = new Set(path.pathRows.map((row) => row.shaftSide));
    expect(sides.has('left')).toBe(true);
    expect(sides.has('right')).toBe(true);
  });
});
