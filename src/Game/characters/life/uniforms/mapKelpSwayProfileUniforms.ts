import { swimmerLifeTuning } from '@/config/swimmerLifeTuning';
import type { KinematicSwayResult } from '../swimmerKinematicSway';
import type { SwimmerInternalUniformValues } from './swimmerInternalUniformShared';

export const mapKelpSwayProfileUniforms = (
  intensityOverride?: number,
  kinematic?: KinematicSwayResult
): SwimmerInternalUniformValues => {
  'worklet';
  const t = swimmerLifeTuning;
  const amplitudeScale = kinematic?.amplitudeScale ?? 1;
  const glowScale = kinematic?.glowScale ?? 1;
  const directionBias = kinematic?.directionBias ?? 0;
  const intensity = intensityOverride ?? t.INTERNAL_KELP_SWAY_INTENSITY;

  return {
    uIntensity: intensity * amplitudeScale,
    uGlow: t.INTERNAL_KELP_SWAY_GLOW * glowScale * amplitudeScale,
    uStrandRegion: [
      t.INTERNAL_KELP_STRAND_REGION_TOP,
      t.INTERNAL_KELP_STRAND_REGION_BOTTOM,
    ],
    uKelpSway: [
      t.INTERNAL_KELP_SWAY_TIP_AMPLITUDE_X,
      t.INTERNAL_KELP_SWAY_TIP_AMPLITUDE_Y,
      t.INTERNAL_KELP_SWAY_BEND_POWER,
    ],
    uSwayKinematic: [amplitudeScale, directionBias],
  };
};
