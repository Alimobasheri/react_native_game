import { buildUniformFloats } from '../renderShaderUniforms';

describe('renderShaderUniforms', () => {
  it('buildUniformFloats preserves SKSL declaration order', () => {
    const orderedKeys = ['uPhase', 'uBreath', 'uGlow', 'uIntensity', 'uJuiceBoost', 'uDebugMode', 'uMeshSize', 'uFillOrigin', 'uMotionKind'];
    const uniforms = {
      uPhase: 0.25,
      uBreath: 0.8,
      uGlow: 0.9,
      uIntensity: 0.35,
      uJuiceBoost: 1,
      uDebugMode: 2,
      uMeshSize: [48, 120],
      uFillOrigin: [0.5, 0.9],
      uMotionKind: 0,
      uUnused: 99,
    };

    expect(buildUniformFloats(orderedKeys, uniforms)).toEqual([
      0.25, 0.8, 0.9, 0.35, 1, 2, 48, 120, 0.5, 0.9, 0,
    ]);
  });

  it('expands vec2 uniforms as consecutive floats', () => {
    const values = buildUniformFloats(['uMeshSize'], { uMeshSize: [10, 20] });
    expect(values).toEqual([10, 20]);
  });
});
