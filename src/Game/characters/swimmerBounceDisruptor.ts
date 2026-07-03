/**
 * Failed-timing side-block bounce — pure helpers (PT-006).
 * Worklet-safe.
 */

export const shouldTriggerBounceDisruptor = (
  movementBlocked: boolean,
  isCeilingPin: boolean,
  blockedDir: -1 | 0 | 1
): boolean => {
  'worklet';
  return movementBlocked && !isCeilingPin && blockedDir !== 0;
};

export const computeReboundVelocityX = (
  blockedDir: -1 | 0 | 1,
  maxSpeed: number,
  reboundScale: number
): number => {
  'worklet';
  if (blockedDir === 0) {
    return 0;
  }
  return -blockedDir * maxSpeed * reboundScale;
};

export const shouldDebounceWallBump = (
  nowMs: number,
  lastBumpMs: number,
  debounceMs: number
): boolean => {
  'worklet';
  return nowMs - lastBumpMs >= debounceMs;
};
