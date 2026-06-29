import { rollBonusInRange } from '../praiseBonus';

describe('rollNearMissBonus (legacy alias)', () => {
  it('returns min when roll is 0', () => {
    expect(rollBonusInRange(10, 25, 0)).toBe(10);
  });

  it('returns max when roll is 1', () => {
    expect(rollBonusInRange(10, 25, 1)).toBe(25);
  });

  it('stays within bounds for mid roll', () => {
    const bonus = rollBonusInRange(10, 25, 0.5);
    expect(bonus).toBeGreaterThanOrEqual(10);
    expect(bonus).toBeLessThanOrEqual(25);
  });
});
