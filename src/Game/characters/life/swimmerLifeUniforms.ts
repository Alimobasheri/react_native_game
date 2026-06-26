import { swimmerLifeTuning } from '@/config/swimmerLifeTuning';
import { computeBreathMotion } from './swimmerLifeDrivers';
import type { InternalMotionProfileId, SwimmerLifeDebugMode } from './swimmerLifeTypes';

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
  const debugIntensity = swimmerLifeTuning.INTERNAL_RIPPLE_INTENSITY_DEBUG;
  const prodIntensity = swimmerLifeTuning.INTERNAL_RIPPLE_INTENSITY;

  let uIntensity = 0;
  let uMotionKind = 0;
  let uGlow = motion.glow;
  let uBreath = motion.breath;

  if (profile === 'ripple') {
    uIntensity = intensityOverride ?? prodIntensity;
    uMotionKind = 0;
    if (intensityOverride != null) {
      uGlow =
        swimmerLifeTuning.INTERNAL_RIPPLE_GLOW_BASE +
        swimmerLifeTuning.INTERNAL_RIPPLE_GLOW_PEAK * intensityOverride;
    }
  } else if (profile === 'kelpSway') {
    uIntensity =
      intensityOverride ?? swimmerLifeTuning.INTERNAL_KELP_SWAY_INTENSITY;
    uMotionKind = 1;
    uGlow = swimmerLifeTuning.INTERNAL_KELP_SWAY_GLOW;
  }

  if (debugMode !== 0 && profile !== 'none') {
    uIntensity = intensityOverride ?? debugIntensity;
    uGlow = Math.max(uGlow, swimmerLifeTuning.INTERNAL_RIPPLE_GLOW_DEBUG);
  }

  return {
    uPhase: phase,
    uBreath,
    uGlow,
    uIntensity,
    uJuiceBoost: juiceBoost,
    uDebugMode: debugMode,
    uMeshSize: [meshW, meshH],
    uFillOrigin: [
      swimmerLifeTuning.INTERNAL_RIPPLE_FILL_ORIGIN_X,
      swimmerLifeTuning.INTERNAL_RIPPLE_FILL_ORIGIN_Y,
    ],
    uMotionKind,
  };
};
