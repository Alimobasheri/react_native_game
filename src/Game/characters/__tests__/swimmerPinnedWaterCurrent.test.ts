import { swimmerPhysicsTuning } from '@/config/swimmerTuning';
import { computePinnedWaterCurrentResponse } from '../swimmerPinnedWaterCurrent';

describe('computePinnedWaterCurrentResponse', () => {
  const base = 0.28;

  it('returns 0 when pinned with no tap and block advection enabled', () => {
    expect(computePinnedWaterCurrentResponse(true, false, true, base)).toBe(0);
  });

  it('scales by PINNED_TAP_WATER_CURRENT_SCALE on pinned tap frame', () => {
    expect(computePinnedWaterCurrentResponse(true, true, true, base)).toBe(
      base * swimmerPhysicsTuning.PINNED_TAP_WATER_CURRENT_SCALE
    );
  });

  it('returns base response when not pinned', () => {
    expect(computePinnedWaterCurrentResponse(false, false, true, base)).toBe(base);
    expect(computePinnedWaterCurrentResponse(false, true, true, base)).toBe(base);
  });

  it('returns base when block advection disabled even if pinned', () => {
    expect(computePinnedWaterCurrentResponse(true, false, false, base)).toBe(base);
  });
});
