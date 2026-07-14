import { swimmerPhysicsTuning, swimmerCoastPresets, swimmerCoastPreset } from '@/config/swimmerTuning';

export const pivotHazardTuning = {
  /** Rotational speed baseline in radians per second. Min=0.5, Max=3.0. */
  BASE_ANGULAR_VELOCITY: 1.2,
  /** Arm width in grid columns. */
  ARM_THICKNESS_COLS: 1,
  /** Kinematic shove multiplier when an arm hits the swimmer laterally. */
  LATERAL_IMPULSE_MULTIPLIER: 0.85,
  /** Runway rows required before a Pivot spawns. */
  MIN_RUNWAY_ROWS: 6,
  /** Visual gap between hub and arm start (fraction of column width). */
  HUB_ARM_DISCONNECT_COL_FRACTION: 0.12,
  /** Hub footprint in columns (square axle). */
  HUB_SIZE_COLS: 1,
  /** Default arm length in columns for center cross. */
  DEFAULT_ARM_LENGTH_COLS: 2,
  /** Pivot band row span. */
  PIVOT_BAND_ROW_SPAN: 6,
  /** Wide open rows after pivot clears before ceiling / narrow rows resume. */
  POST_PIVOT_RELEASE_ROWS: 8,
  /** Minimum open gap columns at water line (fairness invariant). */
  MIN_OPEN_GAP_COLS: 2,
  /** Max RPM hard cap. */
  MAX_RPM: 60,
  /** Teach RPM for 2-arm gate. */
  TEACH_RPM: 15,
  /** Escalation RPM for 4-arm cross. */
  CROSS_RPM: 25,
} as const;

/** Cap RPM so a 2-column tap traverse can clear one quadrant before the next arm sweeps. */
export const maxFairPivotRpm = (
  armCount: number,
  columns: number,
  columnWidthPx: number,
  rowDurationSec: number
): number => {
  'worklet';
  const minGapCols = pivotHazardTuning.MIN_OPEN_GAP_COLS;
  const tapTravelCols =
    swimmerCoastPresets[swimmerCoastPreset].TAP_TRAVEL_COLUMN_MULTIPLIER * minGapCols;
  const tapTravelPx = tapTravelCols * columnWidthPx;
  const maxSpeed = swimmerPhysicsTuning.MAX_HORIZONTAL_SPEED;
  const tapTimeSec = Math.max(0.05, tapTravelPx / maxSpeed);
  const quadrantSec = (Math.PI * 2) / Math.max(2, armCount) / (Math.PI * 2);
  const visibleBandSec = Math.max(rowDurationSec * pivotHazardTuning.PIVOT_BAND_ROW_SPAN, 0.5);
  const minQuadrantWindowSec = Math.max(tapTimeSec * 1.25, visibleBandSec * quadrantSec);
  const maxOmega = (Math.PI * 2) / (minQuadrantWindowSec * Math.max(1, armCount / 2));
  const maxRpm = (maxOmega * 60) / (Math.PI * 2);
  const capped = Math.min(pivotHazardTuning.MAX_RPM, maxRpm);
  return Math.max(5, capped);
};

export const capPivotRpm = (
  requestedRpm: number,
  armCount: number,
  columns: number,
  columnWidthPx: number,
  rowDurationSec: number
): number => {
  'worklet';
  const maxRpm = maxFairPivotRpm(armCount, columns, columnWidthPx, rowDurationSec);
  return Math.min(Math.max(0, requestedRpm), maxRpm);
};
