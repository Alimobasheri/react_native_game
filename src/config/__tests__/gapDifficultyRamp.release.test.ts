import {
  gapDifficultyRampTuning,
  pathSegmentReleaseRestZoneRows,
} from '@/config/gapDifficultyRamp';

describe('pathSegmentReleaseRestZoneRows', () => {
  it('respects RELEASE_REST_ZONE tuning above legacy hard cap of 30', () => {
    const rows = pathSegmentReleaseRestZoneRows(0, 0x12345678, 80);
    expect(rows).toBeGreaterThan(30);
    expect(rows).toBeLessThanOrEqual(80);
  });

  it('never exceeds RELEASE phase row budget', () => {
    const budget = 12;
    const rows = pathSegmentReleaseRestZoneRows(0, 0xabcdef01, budget);
    expect(rows).toBeLessThanOrEqual(budget);
    expect(rows).toBeGreaterThanOrEqual(3);
  });

  it('early-run rest strip can reach RELEASE_PHASE start budget', () => {
    const phaseBudget = gapDifficultyRampTuning.RELEASE_PHASE_ROWS_START_MIN;
    const rows = pathSegmentReleaseRestZoneRows(0, 0x11111111, phaseBudget);
    expect(rows).toBeGreaterThanOrEqual(
      Math.min(
        gapDifficultyRampTuning.RELEASE_REST_ZONE_ROWS_START_MIN,
        phaseBudget
      )
    );
  });
});
