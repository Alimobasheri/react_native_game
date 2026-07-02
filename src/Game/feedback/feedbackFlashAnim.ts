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
  risePx: number,
  stackIndex = 0,
  stackGapPx = 0
): FlashTransform => {
  'worklet';
  const stackOffset = stackIndex * stackGapPx;
  const baseAnchorY = anchorY - stackOffset;

  if (startMs <= 0 || durationMs <= 0) {
    return { x: anchorX, y: baseAnchorY, opacity: 0, scale: 1, active: false };
  }

  const elapsed = nowMs - startMs;
  if (elapsed < 0) {
    return { x: anchorX, y: baseAnchorY, opacity: 0, scale: 1, active: false };
  }

  const t = elapsed / durationMs;
  if (t >= 1) {
    return {
      x: anchorX,
      y: baseAnchorY - risePx,
      opacity: 0,
      scale: 1,
      active: false,
    };
  }

  const riseT = easeOutCubic(t);
  const y = baseAnchorY - risePx * riseT;

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
  offsetY: number,
  stackIndex = 0,
  stackGapPx = 0
): FlashTransform => {
  'worklet';
  const stackOffset = stackIndex * stackGapPx;
  const base = computeFlashTransform(
    startMs,
    nowMs,
    anchorX + offsetX,
    anchorY + offsetY - stackOffset,
    durationMs,
    risePx * 0.85,
    0,
    0
  );
  return base;
};
