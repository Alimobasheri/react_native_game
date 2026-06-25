import { gapWidthAtSwimmerX, sampleHorizontalClearancePx } from '../swimmerClearance';
import { swimmerVisualTuning } from '@/config/swimmerVisualTuning';
import { computeClearanceAwareAngleDeg } from '../swimmerVisualLocomotion';

const CONTAINER = { centerX: 200, width: 360, columnCount: 8 };
const BLOCK = { width: 45, height: 45 };

describe('swimmerClearance', () => {
  it('returns one-column gap width when swimmer is in a single gap', () => {
    const columnWidth = CONTAINER.width / 8;
    const gapCol = 3;
    const swimmerX = CONTAINER.centerX - CONTAINER.width / 2 + columnWidth * (gapCol + 0.5);
    const width = gapWidthAtSwimmerX(
      { y: 100, gaps: [gapCol] },
      swimmerX,
      CONTAINER
    );
    expect(width).toBeCloseTo(columnWidth, 1);
  });

  it('samples the minimum gap across nearby rows', () => {
    const columnWidth = CONTAINER.width / 8;
    const swimmerX = CONTAINER.centerX - CONTAINER.width / 2 + columnWidth * 3.5;
    const clearance = sampleHorizontalClearancePx(
      swimmerX,
      [
        { y: 100, gaps: [2, 3, 4] },
        { y: 140, gaps: [3] },
      ],
      CONTAINER,
      BLOCK
    );
    expect(clearance).toBeCloseTo(columnWidth, 1);
  });

  it('clamps open-water angle down in narrow gaps', () => {
    const narrow = computeClearanceAwareAngleDeg(400, 3, 0);
    const open = computeClearanceAwareAngleDeg(400, 3, 1);
    expect(narrow).toBeLessThanOrEqual(
      swimmerVisualTuning.NARROW_GAP_MAX_ANGLE_DEG + 0.01
    );
    expect(open).toBeGreaterThan(narrow);
    expect(open).toBeLessThanOrEqual(
      swimmerVisualTuning.OPEN_WATER_MAX_ANGLE_TIER[2]
    );
  });
});
