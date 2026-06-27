import { swimmerLifeTuning } from '@/config/swimmerLifeTuning';
import { computeBreathMotion } from './swimmerLifeDrivers';
import type { InternalMotionProfileId, SwimmerLifeDebugMode } from './swimmerLifeTypes';
import { mapKelpSwayProfileUniforms } from './uniforms/mapKelpSwayProfileUniforms';
import { mapRippleProfileUniforms } from './uniforms/mapRippleProfileUniforms';
import {
  applyDebugIntensity,
  mapSharedInternalUniforms,
} from './uniforms/swimmerInternalUniformShared';

export const mapLifeToCompositeUniforms = (
  profile: InternalMotionProfileId,
  phase: number,
  meshW: number,
  meshH: number,
  debugMode: SwimmerLifeDebugMode = 0,
  intensityOverride?: number,
  juiceBoost = 1,
  breathOverride?: number,
  glowOverride?: number
): Record<string, number | number[]> => {
  'worklet';
  const motion = computeBreathMotion(phase, glowOverride, 1, breathOverride);

  const shared = mapSharedInternalUniforms(
    phase,
    meshW,
    meshH,
    debugMode,
    juiceBoost,
    motion.breath,
    motion.glow
  );

  if (profile === 'none') {
    return {
      ...shared,
      uIntensity: 0,
      uMotionKind: 0,
      uStrandRegion: [0, 1],
      uKelpSway: [0, 0, 1],
    };
  }

  const profileUniforms =
    profile === 'kelpSway'
      ? mapKelpSwayProfileUniforms(intensityOverride)
      : mapRippleProfileUniforms(intensityOverride, motion.glow);

  const uIntensity = applyDebugIntensity(
    profileUniforms.uIntensity as number,
    debugMode,
    intensityOverride
  );
  const uGlow =
    debugMode !== 0
      ? Math.max(
          profileUniforms.uGlow as number,
          swimmerLifeTuning.INTERNAL_RIPPLE_GLOW_DEBUG
        )
      : (profileUniforms.uGlow as number);

  return {
    ...shared,
    ...profileUniforms,
    uIntensity,
    uGlow,
    uBreath: motion.breath,
  };
};
