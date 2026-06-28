import {
  createDefaultNearMissState,
  isNearPinClearance,
  pickNearMissCopy,
  rollNearMissBonus,
  updateNearMissState,
} from '../nearMissDetection';

describe('isNearPinClearance', () => {
  it('is true below threshold', () => {
    expect(isNearPinClearance(0.2, 0.35)).toBe(true);
  });

  it('is false at or above threshold', () => {
    expect(isNearPinClearance(0.35, 0.35)).toBe(false);
    expect(isNearPinClearance(0.9, 0.35)).toBe(false);
  });
});

describe('updateNearMissState', () => {
  const threshold = 0.35;
  const cooldown = 900;
  const maxPerRun = 20;

  it('does not fire in open water', () => {
    const state = createDefaultNearMissState();
    const result = updateNearMissState(1, threshold, state, 1000, cooldown, maxPerRun);
    expect(result.fired).toBe(false);
    expect(result.state.wasNearPin).toBe(false);
  });

  it('fires on edge enter into near-pin', () => {
    const state = createDefaultNearMissState();
    const result = updateNearMissState(0.2, threshold, state, 1000, cooldown, maxPerRun);
    expect(result.fired).toBe(true);
    expect(result.state.firesThisRun).toBe(1);
    expect(result.state.lastFireMs).toBe(1000);
  });

  it('does not double-fire while staying in near-pin', () => {
    const state = createDefaultNearMissState();
    const first = updateNearMissState(0.2, threshold, state, 1000, cooldown, maxPerRun);
    const second = updateNearMissState(
      0.15,
      threshold,
      first.state,
      1100,
      cooldown,
      maxPerRun
    );
    expect(second.fired).toBe(false);
    expect(second.state.firesThisRun).toBe(1);
  });

  it('can fire again after leaving and re-entering with cooldown elapsed', () => {
    const state = createDefaultNearMissState();
    const first = updateNearMissState(0.2, threshold, state, 1000, cooldown, maxPerRun);
    const open = updateNearMissState(0.8, threshold, first.state, 1500, cooldown, maxPerRun);
    const second = updateNearMissState(
      0.1,
      threshold,
      open.state,
      2000,
      cooldown,
      maxPerRun
    );
    expect(second.fired).toBe(true);
    expect(second.state.firesThisRun).toBe(2);
  });

  it('respects cooldown when re-entering quickly', () => {
    const state = createDefaultNearMissState();
    const first = updateNearMissState(0.2, threshold, state, 1000, cooldown, maxPerRun);
    const open = updateNearMissState(0.8, threshold, first.state, 1200, cooldown, maxPerRun);
    const tooSoon = updateNearMissState(
      0.1,
      threshold,
      open.state,
      1500,
      cooldown,
      maxPerRun
    );
    expect(tooSoon.fired).toBe(false);
  });

  it('caps fires per run', () => {
    let state = createDefaultNearMissState();
    let now = 0;
    let fires = 0;
    for (let i = 0; i < 30; i++) {
      now += 1000;
      const inPin = i % 2 === 0;
      const result = updateNearMissState(
        inPin ? 0.1 : 0.9,
        threshold,
        state,
        now,
        cooldown,
        3
      );
      state = result.state;
      if (result.fired) fires += 1;
    }
    expect(fires).toBe(3);
  });
});

describe('pickNearMissCopy', () => {
  it('picks CLOSE! when roll is above nice weight', () => {
    expect(pickNearMissCopy(0.5, 0.3, 'CLOSE!', 'NICE!')).toBe('CLOSE!');
  });

  it('picks NICE! when roll is below nice weight', () => {
    expect(pickNearMissCopy(0.1, 0.3, 'CLOSE!', 'NICE!')).toBe('NICE!');
  });
});

describe('rollNearMissBonus', () => {
  it('returns min when roll is 0', () => {
    expect(rollNearMissBonus(10, 25, 0)).toBe(10);
  });

  it('returns max when roll is 1', () => {
    expect(rollNearMissBonus(10, 25, 1)).toBe(25);
  });

  it('stays within bounds for mid roll', () => {
    const bonus = rollNearMissBonus(10, 25, 0.5);
    expect(bonus).toBeGreaterThanOrEqual(10);
    expect(bonus).toBeLessThanOrEqual(25);
  });
});
