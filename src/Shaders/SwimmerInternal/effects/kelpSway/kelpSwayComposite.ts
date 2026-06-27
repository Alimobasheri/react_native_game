import { swimmerInternalCommonGlsl } from '../../common/swimmerInternalCommon.glsl';
import { kelpSwayEffectGlsl } from './kelpSway.glsl';
import {
  KELP_SWAY_EFFECT_SHADER_KEY,
  KELP_SWAY_EFFECT_UNIFORM_KEYS,
  kelpSwayEffectShaderUniforms,
} from './kelpSwayUniforms';

export {
  KELP_SWAY_EFFECT_SHADER_KEY,
  KELP_SWAY_EFFECT_UNIFORM_KEYS,
  type KelpSwayEffectUniformKey,
} from './kelpSwayUniforms';

export const sourceCode = `
${kelpSwayEffectShaderUniforms}
${swimmerInternalCommonGlsl}
${kelpSwayEffectGlsl}

half4 main(float2 xy) {
  half4 base = uBody.eval(xy);
  half4 masked = swimmerMaskAlpha(base);
  if (masked.a < 0.01) {
    return half4(0);
  }

  float a = base.a;
  vec2 uv = swimmerBodyUv(xy);

  if (uDebugMode > 2.5) {
    return base;
  }
  if (uDebugMode > 1.5) {
    return debugKelpStrands(xy, uv, a);
  }
  if (uDebugMode > 0.5) {
    return half4(a, a, a, 1);
  }

  return compositeKelpSway(xy, uv, a, base.rgb);
}
`;
