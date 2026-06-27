import { swimmerLifeTuning } from '@/config/swimmerLifeTuning';
import type { SwimmerInternalUniformValues } from './swimmerInternalUniformShared';

export const mapRippleProfileUniforms = (
  intensityOverride?: number,
  breathGlow?: number
): SwimmerInternalUniformValues => {
  'worklet';
  const intensity =
    intensityOverride ?? swimmerLifeTuning.INTERNAL_RIPPLE_INTENSITY;
  const glow =
    intensityOverride != null
      ? swimmerLifeTuning.INTERNAL_RIPPLE_GLOW_BASE +
        swimmerLifeTuning.INTERNAL_RIPPLE_GLOW_PEAK * intensityOverride
      : breathGlow ?? swimmerLifeTuning.INTERNAL_RIPPLE_GLOW_BASE;

  return {
    uIntensity: intensity,
    uGlow: glow,
  };
};
