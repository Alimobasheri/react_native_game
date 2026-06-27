import { swimmerInternalCommonGlsl } from '../../common/swimmerInternalCommon.glsl';
import { rippleEffectGlsl } from './ripple.glsl';
import {
  RIPPLE_EFFECT_SHADER_KEY,
  RIPPLE_EFFECT_UNIFORM_KEYS,
  rippleEffectShaderUniforms,
} from './rippleUniforms';

export {
  RIPPLE_EFFECT_SHADER_KEY,
  RIPPLE_EFFECT_UNIFORM_KEYS,
  type RippleEffectUniformKey,
} from './rippleUniforms';

export const sourceCode = `
${rippleEffectShaderUniforms}
${swimmerInternalCommonGlsl}
${rippleEffectGlsl}

half4 main(float2 xy) {
  half4 base = uBody.eval(xy);
  half4 masked = swimmerMaskAlpha(base);
  if (masked.a < 0.01) {
    return half4(0);
  }

  float a = base.a;
  vec2 uv = swimmerBodyUv(xy);
  float aspect = swimmerBodyAspect();

  if (uDebugMode > 2.5) {
    return base;
  }
  if (uDebugMode > 1.5) {
    return debugRippleFill(uv, a, aspect);
  }
  if (uDebugMode > 0.5) {
    return half4(a, a, a, 1);
  }

  return compositeRipple(xy, uv, a, base, aspect);
}
`;
