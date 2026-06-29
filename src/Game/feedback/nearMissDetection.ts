export type NearMissState = {
  wasNearPin: boolean;
  lastFireMs: number;
  firesThisRun: number;
};

export const createDefaultNearMissState = (): NearMissState => {
  'worklet';
  return {
    wasNearPin: false,
    lastFireMs: 0,
    firesThisRun: 0,
  };
};

export const isNearPinClearance = (
  clearance01: number,
  threshold: number
): boolean => {
  'worklet';
  return clearance01 < threshold;
};

/**
 * Edge-enter near-pin detection with cooldown and per-run cap.
 * Fires once when entering the near-pin zone, not every frame while inside.
 */
export const updateNearMissState = (
  clearance01: number,
  threshold: number,
  state: NearMissState,
  nowMs: number,
  cooldownMs: number,
  maxPerRun: number
): { state: NearMissState; fired: boolean } => {
  'worklet';
  const inNearPin = isNearPinClearance(clearance01, threshold);
  const nextState: NearMissState = {
    ...state,
    wasNearPin: inNearPin,
  };

  if (!inNearPin) {
    return { state: nextState, fired: false };
  }

  const enteringNearPin = !state.wasNearPin;
  if (!enteringNearPin) {
    return { state: nextState, fired: false };
  }

  if (state.firesThisRun >= maxPerRun) {
    return { state: nextState, fired: false };
  }

  const elapsed = state.lastFireMs > 0 ? nowMs - state.lastFireMs : cooldownMs;
  if (state.lastFireMs > 0 && elapsed < cooldownMs) {
    return { state: nextState, fired: false };
  }

  return {
    state: {
      wasNearPin: true,
      lastFireMs: nowMs,
      firesThisRun: state.firesThisRun + 1,
    },
    fired: true,
  };
};

export const pickNearMissCopyByClearance = (
  clearance01: number,
  closeMax: number,
  niceMax: number,
  closeCopy: string,
  niceCopy: string
): string => {
  'worklet';
  if (clearance01 < closeMax) {
    return closeCopy;
  }
  if (clearance01 < niceMax) {
    return niceCopy;
  }
  return closeCopy;
};

export const rollNearMissBonus = (
  min: number,
  max: number,
  roll01: number
): number => {
  'worklet';
  const lo = Math.floor(Math.min(min, max));
  const hi = Math.floor(Math.max(min, max));
  if (hi <= lo) return lo;
  const t = Math.max(0, Math.min(1, roll01));
  return Math.min(hi, lo + Math.floor(t * (hi - lo + 1)));
};
