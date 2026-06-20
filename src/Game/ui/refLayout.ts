import { REF_CANVAS_HEIGHT, REF_CANVAS_WIDTH } from './swimmerTheme';

export type SafeAreaInsets = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

export const refScale = (screenW: number, screenH: number): number => {
  'worklet';
  const sx = screenW / REF_CANVAS_WIDTH;
  const sy = screenH / REF_CANVAS_HEIGHT;
  return Math.min(sx, sy);
};

export const refSize = (
  value: number,
  screenW: number,
  screenH: number
): number => {
  'worklet';
  return value * refScale(screenW, screenH);
};

/** Top-left anchor rect scaled from 1080×1920 reference coordinates. */
export const refRect = (
  x: number,
  y: number,
  w: number,
  h: number,
  screenW: number,
  screenH: number,
  insets: SafeAreaInsets = { top: 0, bottom: 0, left: 0, right: 0 }
): { x: number; y: number; width: number; height: number; centerX: number; centerY: number } => {
  'worklet';
  const s = refScale(screenW, screenH);
  const width = w * s;
  const height = h * s;
  const left = x * s + insets.left;
  const top = y * s + insets.top;
  return {
    x: left,
    y: top,
    width,
    height,
    centerX: left + width / 2,
    centerY: top + height / 2,
  };
};

/** Center-anchored position from reference center coords. */
export const refCenter = (
  centerX: number,
  centerY: number,
  screenW: number,
  screenH: number,
  insets: SafeAreaInsets = { top: 0, bottom: 0, left: 0, right: 0 }
): { x: number; y: number } => {
  'worklet';
  const s = refScale(screenW, screenH);
  return {
    x: centerX * s + insets.left,
    y: centerY * s + insets.top,
  };
};
