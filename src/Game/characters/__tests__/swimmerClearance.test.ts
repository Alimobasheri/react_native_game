import {
  clearance01FromPx,
  gapWidthAtSwimmerX,
  sampleHorizontalClearancePx,
} from '../swimmerClearance';
import { swimmerVisualTuning } from '@/config/swimmerVisualTuning';
import { swimmerPhysicsTuning } from '@/config/swimmerTuning';
import { computeClearanceAwareAngleDeg, computeVelocityLedAngleDeg } from '../swimmerVisualLocomotion';

const CONTAINER = { centerX: 200, width: 360, columnCount: 8 };
const COLUMN_WIDTH = CONTAINER.width / 8;

describe('swimmerClearance', () => {
  it('returns one-column gap width when swimmer is in a single gap', () => {
    const gapCol = 3;
    const swimmerX = CONTAINER.centerX - CONTAINER.width / 2 + COLUMN_WIDTH * (gapCol + 0.5);
    const width = gapWidthAtSwimmerX(
      { y: 100, gaps: [gapCol] },
      swimmerX,
      CONTAINER
    );
    expect(width).toBeCloseTo(COLUMN_WIDTH, 1);
  });

  it('samples the minimum gap across nearby rows', () => {
    const swimmerX = CONTAINER.centerX - CONTAINER.width / 2 + COLUMN_WIDTH * 3.5;
    const clearance = sampleHorizontalClearancePx(
      swimmerX,
      [
        { y: 100, gaps: [2, 3, 4] },
        { y: 140, gaps: [3] },
      ],
      CONTAINER
    );
    expect(clearance).toBeCloseTo(COLUMN_WIDTH, 1);
  });

  it('maps one-column clearance to fully narrow and four-column to fully open', () => {
    expect(clearance01FromPx(COLUMN_WIDTH, COLUMN_WIDTH)).toBeCloseTo(0, 2);
    expect(
      clearance01FromPx(
        COLUMN_WIDTH * swimmerVisualTuning.OPEN_WATER_CLEARANCE_COLUMNS,
        COLUMN_WIDTH
      )
    ).toBeCloseTo(1, 2);
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

  it('velocity-led lean uses speed-scaled max tilt in open water', () => {
    const fullTiltSpeed =
      swimmerPhysicsTuning.MAX_HORIZONTAL_SPEED *
      swimmerPhysicsTuning.FULL_TILT_SPEED_FRACTION;
    const lowSpeedLean = computeVelocityLedAngleDeg(fullTiltSpeed * 0.15, 1);
    const highSpeedLean = computeVelocityLedAngleDeg(fullTiltSpeed, 1);
    expect(Math.abs(lowSpeedLean)).toBeLessThanOrEqual(
      swimmerVisualTuning.LOW_SPEED_MAX_TILT_DEG + 1
    );
    expect(Math.abs(highSpeedLean)).toBeCloseTo(
      swimmerVisualTuning.HIGH_SPEED_MAX_TILT_DEG,
      1
    );
    expect(Math.abs(highSpeedLean)).toBeGreaterThan(Math.abs(lowSpeedLean));
  });

  it('velocity-led lean returns toward zero as speed drops', () => {
    expect(Math.abs(computeVelocityLedAngleDeg(0, 1))).toBeLessThan(1);
    expect(Math.abs(computeVelocityLedAngleDeg(20, 1))).toBeLessThan(15);
  });
});
