import {
  computeReboundVelocityX,
  shouldDebounceWallBump,
  shouldTriggerBounceDisruptor,
} from '../swimmerBounceDisruptor';

describe('swimmerBounceDisruptor', () => {
  it('rebound velocity is opposite blocked direction', () => {
    expect(computeReboundVelocityX(1, 520, 0.08)).toBeCloseTo(-41.6);
    expect(computeReboundVelocityX(-1, 520, 0.08)).toBeCloseTo(41.6);
    expect(computeReboundVelocityX(0, 520, 0.18)).toBe(0);
  });

  it('debounce blocks second trigger within window', () => {
    expect(shouldDebounceWallBump(1000, 0, 120)).toBe(true);
    expect(shouldDebounceWallBump(1000, 900, 120)).toBe(false);
    expect(shouldDebounceWallBump(1020, 900, 120)).toBe(true);
  });

  it('shouldTrigger false when ceiling pin', () => {
    expect(shouldTriggerBounceDisruptor(true, true, 1)).toBe(false);
    expect(shouldTriggerBounceDisruptor(true, false, 1)).toBe(true);
    expect(shouldTriggerBounceDisruptor(false, false, 1)).toBe(false);
  });
});
