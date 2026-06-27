import { swimmerLifeTuning } from '@/config/swimmerLifeTuning';
import { SWIMMER_INTERNAL_MOTION_KIND } from '@/Shaders/SwimmerInternal/swimmerInternalUniforms';
import type { SwimmerInternalUniformValues } from './swimmerInternalUniformShared';

export const mapKelpSwayProfileUniforms = (
  intensityOverride?: number
): SwimmerInternalUniformValues => {
  'worklet';
  const t = swimmerLifeTuning;
  return {
    uMotionKind: SWIMMER_INTERNAL_MOTION_KIND.kelpSway,
    uIntensity: intensityOverride ?? t.INTERNAL_KELP_SWAY_INTENSITY,
    uGlow: t.INTERNAL_KELP_SWAY_GLOW,
    uStrandRegion: [
      t.INTERNAL_KELP_STRAND_REGION_TOP,
      t.INTERNAL_KELP_STRAND_REGION_BOTTOM,
    ],
    uKelpSway: [
      t.INTERNAL_KELP_SWAY_TIP_AMPLITUDE_X,
      t.INTERNAL_KELP_SWAY_TIP_AMPLITUDE_Y,
      t.INTERNAL_KELP_SWAY_BEND_POWER,
    ],
  };
};
