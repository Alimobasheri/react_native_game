import { mapLifeToCompositeUniforms } from '../life/swimmerLifeUniforms';
import { swimmerLifeTuning } from '@/config/swimmerLifeTuning';
import {
  RIPPLE_EFFECT_UNIFORM_KEYS,
  KELP_SWAY_EFFECT_UNIFORM_KEYS,
} from '@/Shaders/SwimmerInternal';
import { buildUniformFloats } from '@/containers/ReactNativeSkiaGameEngine/internal/render/renderShaderUniforms';

describe('swimmerLifeUniforms', () => {
  it('maps ripple profile to production intensity and breath uniforms', () => {
    const uniforms = mapLifeToCompositeUniforms('ripple', 0.5, 48, 120, 0);
    expect(uniforms.uIntensity).toBe(swimmerLifeTuning.INTERNAL_RIPPLE_INTENSITY);
    expect(uniforms.uMeshSize).toEqual([48, 120]);
    expect(uniforms.uBreath).toBeGreaterThan(0.9);
    expect(uniforms.uGlow).toBeGreaterThan(0.5);
    expect(uniforms.uJuiceBoost).toBe(1);
  });

  it('ripple uniforms supply every SKSL float (avoids shader fallback)', () => {
    const uniforms = mapLifeToCompositeUniforms('ripple', 0.25, 48, 120, 0, 0.55);
    for (const key of RIPPLE_EFFECT_UNIFORM_KEYS) {
      expect(uniforms[key]).not.toBeNull();
      expect(uniforms[key]).not.toBeUndefined();
    }
    expect(buildUniformFloats(RIPPLE_EFFECT_UNIFORM_KEYS, uniforms).length).toBe(10);
  });

  it('maps kelp profile to kelp-specific uniforms', () => {
    const uniforms = mapLifeToCompositeUniforms('kelpSway', 0.3, 48, 120, 0);
    expect(uniforms.uIntensity).toBe(swimmerLifeTuning.INTERNAL_KELP_SWAY_INTENSITY);
    expect(uniforms.uKelpSway).toEqual([
      swimmerLifeTuning.INTERNAL_KELP_SWAY_TIP_AMPLITUDE_X,
      swimmerLifeTuning.INTERNAL_KELP_SWAY_TIP_AMPLITUDE_Y,
      swimmerLifeTuning.INTERNAL_KELP_SWAY_BEND_POWER,
    ]);
    expect(uniforms.uSwayKinematic).toEqual([1, 0]);
    for (const key of KELP_SWAY_EFFECT_UNIFORM_KEYS) {
      expect(uniforms[key]).not.toBeNull();
      expect(uniforms[key]).not.toBeUndefined();
    }
  });

  it('uses debug intensity when debug mode is active', () => {
    const uniforms = mapLifeToCompositeUniforms('ripple', 0, 48, 120, 2);
    expect(uniforms.uIntensity).toBe(swimmerLifeTuning.INTERNAL_RIPPLE_INTENSITY_DEBUG);
    expect(uniforms.uDebugMode).toBe(2);
  });

  it('returns empty uniforms for skins without internal motion', () => {
    expect(mapLifeToCompositeUniforms('none', 0, 48, 120, 0)).toEqual({});
  });
});
