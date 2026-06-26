import { mapLifeToCompositeUniforms } from '../life/swimmerLifeUniforms';
import { swimmerLifeTuning } from '@/config/swimmerLifeTuning';

describe('swimmerLifeUniforms', () => {
  it('maps ripple profile to production intensity and breath uniforms', () => {
    const uniforms = mapLifeToCompositeUniforms('ripple', 0.5, 48, 120, 0);
    expect(uniforms.uIntensity).toBe(swimmerLifeTuning.INTERNAL_RIPPLE_INTENSITY);
    expect(uniforms.uMotionKind).toBe(0);
    expect(uniforms.uMeshSize).toEqual([48, 120]);
    expect(uniforms.uBreath).toBeGreaterThan(0.9);
    expect(uniforms.uGlow).toBeGreaterThan(0.5);
    expect(uniforms.uJuiceBoost).toBe(1);
  });

  it('maps kelp profile to kelp motion kind', () => {
    const uniforms = mapLifeToCompositeUniforms('kelpSway', 0.3, 48, 120, 0);
    expect(uniforms.uMotionKind).toBe(1);
    expect(uniforms.uIntensity).toBe(swimmerLifeTuning.INTERNAL_KELP_SWAY_INTENSITY);
  });

  it('uses debug intensity when debug mode is active', () => {
    const uniforms = mapLifeToCompositeUniforms('ripple', 0, 48, 120, 2);
    expect(uniforms.uIntensity).toBe(swimmerLifeTuning.INTERNAL_RIPPLE_INTENSITY_DEBUG);
    expect(uniforms.uDebugMode).toBe(2);
  });
});
