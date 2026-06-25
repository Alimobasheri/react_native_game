import { swimmerLifeTuning } from '@/config/swimmerLifeTuning';

export type InternalRippleState = {
  phase: number;
};

export type InternalRippleVisual = {
  opacity: number;
  offsetY: number;
  state: InternalRippleState;
};

export const createInternalRippleState = (): InternalRippleState => {
  'worklet';
  return { phase: 0 };
};

export const updateInternalRipple = (
  state: InternalRippleState | undefined,
  meshHeight: number,
  dt: number
): InternalRippleVisual => {
  'worklet';
  const safeDt = dt > 0 ? dt : 0;
  const cycleSec = swimmerLifeTuning.INTERNAL_RIPPLE_CYCLE_SEC;
  const nextPhase =
    ((state?.phase ?? 0) + safeDt / cycleSec) % 1;

  const travel = meshHeight * swimmerLifeTuning.INTERNAL_RIPPLE_TRAVEL_RATIO;
  const startY = meshHeight * 0.28;
  const endY = startY - travel;
  const offsetY = startY + (endY - startY) * nextPhase;

  const opacityWave = Math.sin(nextPhase * Math.PI);
  const opacity =
    swimmerLifeTuning.INTERNAL_RIPPLE_OPACITY_MIN +
    opacityWave *
      (swimmerLifeTuning.INTERNAL_RIPPLE_OPACITY_MAX -
        swimmerLifeTuning.INTERNAL_RIPPLE_OPACITY_MIN);

  return {
    opacity,
    offsetY,
    state: { phase: nextPhase },
  };
};

export const getInternalRippleBandSize = (
  meshWidth: number,
  meshHeight: number
): { width: number; height: number } => {
  'worklet';
  return {
    width: meshWidth * swimmerLifeTuning.INTERNAL_RIPPLE_BAND_WIDTH_RATIO,
    height: meshHeight * swimmerLifeTuning.INTERNAL_RIPPLE_BAND_HEIGHT_RATIO,
  };
};
