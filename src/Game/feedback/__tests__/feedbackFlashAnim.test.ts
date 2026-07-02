import { computeBonusFlashTransform, computeFlashTransform } from '../feedbackFlashAnim';

describe('computeFlashTransform', () => {
  const start = 1000;
  const duration = 400;
  const rise = 48;

  it('starts near anchor with fade-in', () => {
    const t = computeFlashTransform(start, start + 20, 100, 200, duration, rise);
    expect(t.active).toBe(true);
    expect(t.x).toBe(100);
    expect(t.y).toBeLessThanOrEqual(200);
    expect(t.opacity).toBeGreaterThan(0);
    expect(t.opacity).toBeLessThanOrEqual(1);
  });

  it('rises over time', () => {
    const early = computeFlashTransform(start, start + 100, 100, 200, duration, rise);
    const late = computeFlashTransform(start, start + 300, 100, 200, duration, rise);
    expect(late.y).toBeLessThan(early.y);
  });

  it('stackIndex offsets word position upward', () => {
    const base = computeFlashTransform(start, start + 100, 100, 200, duration, rise, 0, 0);
    const stacked = computeFlashTransform(start, start + 100, 100, 200, duration, rise, 1, 36);
    expect(stacked.y).toBeLessThan(base.y);
  });

  it('is inactive after duration', () => {
    const t = computeFlashTransform(start, start + duration + 1, 100, 200, duration, rise);
    expect(t.active).toBe(false);
    expect(t.opacity).toBe(0);
  });
});

describe('computeBonusFlashTransform', () => {
  it('offsets from anchor', () => {
    const word = computeFlashTransform(1000, 1100, 50, 100, 400, 48);
    const bonus = computeBonusFlashTransform(1000, 1100, 50, 100, 400, 48, 20, -5);
    expect(bonus.x).toBe(70);
    expect(bonus.y).not.toBe(word.y);
  });
});
