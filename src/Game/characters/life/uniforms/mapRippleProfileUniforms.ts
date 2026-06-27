import { swimmerLifeTuning } from '@/config/swimmerLifeTuning';
import { SWIMMER_INTERNAL_MOTION_KIND } from '@/Shaders/SwimmerInternal/swimmerInternalUniforms';
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
    uMotionKind: SWIMMER_INTERNAL_MOTION_KIND.ripple,
    uIntensity: intensity,
    uGlow: glow,
    uStrandRegion: [0, 1],
    uKelpSway: [0, 0, 1],
  };
};
