import { swimmerLifeTuning } from '@/config/swimmerLifeTuning';

export type InternalKelpSwayState = {
  phase: number;
};

export type InternalKelpSwayVisual = {
  opacity: number;
  offsetX: number;
  offsetY: number;
  state: InternalKelpSwayState;
};

export const createInternalKelpSwayState = (): InternalKelpSwayState => {
  'worklet';
  return { phase: 0 };
};

export const updateInternalKelpSway = (
  state: InternalKelpSwayState | undefined,
  meshWidth: number,
  meshHeight: number,
  dt: number
): InternalKelpSwayVisual => {
  'worklet';
  const safeDt = dt > 0 ? dt : 0;
  const cycleSec = swimmerLifeTuning.INTERNAL_KELP_SWAY_CYCLE_SEC;
  const nextPhase = ((state?.phase ?? 0) + safeDt / cycleSec) % 1;

  const sway = Math.sin(nextPhase * Math.PI * 2);
  const offsetX = sway * meshWidth * swimmerLifeTuning.INTERNAL_KELP_SWAY_AMPLITUDE_RATIO;
  const offsetY = meshHeight * swimmerLifeTuning.INTERNAL_KELP_SWAY_REST_Y_RATIO;

  const opacityWave = 0.5 + 0.5 * Math.sin(nextPhase * Math.PI * 2 + 0.4);
  const opacity =
    swimmerLifeTuning.INTERNAL_KELP_SWAY_OPACITY_MIN +
    opacityWave *
      (swimmerLifeTuning.INTERNAL_KELP_SWAY_OPACITY_MAX -
        swimmerLifeTuning.INTERNAL_KELP_SWAY_OPACITY_MIN);

  return {
    opacity,
    offsetX,
    offsetY,
    state: { phase: nextPhase },
  };
};

export const getInternalKelpSwayBandSize = (
  meshWidth: number,
  meshHeight: number
): { width: number; height: number } => {
  'worklet';
  return {
    width: meshWidth * swimmerLifeTuning.INTERNAL_KELP_SWAY_BAND_WIDTH_RATIO,
    height: meshHeight * swimmerLifeTuning.INTERNAL_KELP_SWAY_BAND_HEIGHT_RATIO,
  };
};
