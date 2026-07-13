import { swimmerPhysicsTuning } from '@/config/swimmerTuning';
import {
  computePinnedVelocityDamping,
  computePinnedWaterCurrentResponse,
} from '../swimmerPinnedWaterCurrent';

describe('computePinnedVelocityDamping', () => {
  it('uses full damping at 0° lean', () => {
    expect(computePinnedVelocityDamping(0)).toBe(
      swimmerPhysicsTuning.PINNED_VELOCITY_DAMPING
    );
  });

  it('uses max-angle damping at 90° lean', () => {
    expect(computePinnedVelocityDamping(90)).toBe(
      swimmerPhysicsTuning.PINNED_VELOCITY_DAMPING_AT_MAX_ANGLE
    );
    expect(computePinnedVelocityDamping(-90)).toBe(
      swimmerPhysicsTuning.PINNED_VELOCITY_DAMPING_AT_MAX_ANGLE
    );
  });

  it('lerps between base and max-angle damping', () => {
    expect(computePinnedVelocityDamping(45)).toBeCloseTo(0.815, 2);
  });
});

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
