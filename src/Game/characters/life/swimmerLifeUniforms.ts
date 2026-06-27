import { swimmerLifeTuning } from '@/config/swimmerLifeTuning';
import { computeBreathMotion } from './swimmerLifeDrivers';
import type { KinematicSwayResult } from './swimmerKinematicSway';
import type { InternalMotionProfileId, SwimmerLifeDebugMode } from './swimmerLifeTypes';
import { mapKelpSwayProfileUniforms } from './uniforms/mapKelpSwayProfileUniforms';
import { mapRippleProfileUniforms } from './uniforms/mapRippleProfileUniforms';
import {
  applyDebugIntensity,
  mapRippleSharedUniforms,
  mapKelpSharedUniforms,
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
  glowOverride?: number,
  kinematicSway?: KinematicSwayResult
): Record<string, number | number[]> => {
  'worklet';

  if (profile === 'ripple') {
    const motion = computeBreathMotion(phase, glowOverride, 1, breathOverride);
    const profileUniforms = mapRippleProfileUniforms(
      intensityOverride,
      motion.glow
    );
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
      ...mapRippleSharedUniforms(
        phase,
        meshW,
        meshH,
        debugMode,
        juiceBoost,
        motion.breath,
        uGlow
      ),
      uIntensity,
      uGlow,
      uBreath: motion.breath,
    };
  }

  if (profile === 'kelpSway') {
    const profileUniforms = mapKelpSwayProfileUniforms(
      intensityOverride,
      kinematicSway
    );
    const uIntensity = applyDebugIntensity(
      profileUniforms.uIntensity as number,
      debugMode,
      intensityOverride
    );

    return {
      ...mapKelpSharedUniforms(phase, meshW, meshH, debugMode, juiceBoost),
      ...profileUniforms,
      uIntensity,
    };
  }

  return {};
};
