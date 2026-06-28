const easeOutCubic = (t: number): number => {
  'worklet';
  const c = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - c, 3);
};

export type FlashTransform = {
  x: number;
  y: number;
  opacity: number;
  scale: number;
  active: boolean;
};

export const computeFlashTransform = (
  startMs: number,
  nowMs: number,
  anchorX: number,
  anchorY: number,
  durationMs: number,
  risePx: number
): FlashTransform => {
  'worklet';
  if (startMs <= 0 || durationMs <= 0) {
    return { x: anchorX, y: anchorY, opacity: 0, scale: 1, active: false };
  }

  const elapsed = nowMs - startMs;
  if (elapsed < 0) {
    return { x: anchorX, y: anchorY, opacity: 0, scale: 1, active: false };
  }

  const t = elapsed / durationMs;
  if (t >= 1) {
    return { x: anchorX, y: anchorY - risePx, opacity: 0, scale: 1, active: false };
  }

  const riseT = easeOutCubic(t);
  const y = anchorY - risePx * riseT;

  let opacity = 1;
  if (t > 0.7) {
    opacity = 1 - (t - 0.7) / 0.3;
  } else if (t < 0.08) {
    opacity = t / 0.08;
  }

  const scale = 1 + 0.12 * (1 - easeOutCubic(Math.min(1, t * 2)));

  return {
    x: anchorX,
    y,
    opacity: Math.max(0, Math.min(1, opacity)),
    scale,
    active: true,
  };
};

export const computeBonusFlashTransform = (
  startMs: number,
  nowMs: number,
  anchorX: number,
  anchorY: number,
  durationMs: number,
  risePx: number,
  offsetX: number,
  offsetY: number
): FlashTransform => {
  'worklet';
  const base = computeFlashTransform(
    startMs,
    nowMs,
    anchorX + offsetX,
    anchorY + offsetY,
    durationMs,
    risePx * 0.85
  );
  return base;
};
