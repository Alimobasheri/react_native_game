import { swimmerLifeTuning } from '@/config/swimmerLifeTuning';
import type { SwimmerLifeDebugMode } from '../swimmerLifeTypes';

export type SwimmerInternalUniformValues = Record<string, number | number[]>;

export const mapSharedInternalUniforms = (
  phase: number,
  meshW: number,
  meshH: number,
  debugMode: SwimmerLifeDebugMode,
  juiceBoost: number,
  breath: number,
  glow: number
): SwimmerInternalUniformValues => {
  'worklet';
  return {
    uPhase: phase,
    uBreath: breath,
    uGlow: glow,
    uJuiceBoost: juiceBoost,
    uDebugMode: debugMode,
    uMeshSize: [meshW, meshH],
    uFillOrigin: [
      swimmerLifeTuning.INTERNAL_RIPPLE_FILL_ORIGIN_X,
      swimmerLifeTuning.INTERNAL_RIPPLE_FILL_ORIGIN_Y,
    ],
  };
};

export const applyDebugIntensity = (
  profileIntensity: number,
  debugMode: SwimmerLifeDebugMode,
  intensityOverride?: number
): number => {
  'worklet';
  if (debugMode === 0) {
    return profileIntensity;
  }
  return intensityOverride ?? swimmerLifeTuning.INTERNAL_RIPPLE_INTENSITY_DEBUG;
};
