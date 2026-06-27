import { swimmerInternalCommonGlsl } from './swimmerInternalCommon.glsl';
import { swimmerInternalKelpSwayGlsl } from './swimmerInternalKelpSway.glsl';
import { swimmerInternalRippleGlsl } from './swimmerInternalRipple.glsl';
import {
  SWIMMER_INTERNAL_UNIFORM_KEYS,
  swimmerInternalShaderUniforms,
} from './swimmerInternalUniforms';

export {
  SWIMMER_INTERNAL_MOTION_KIND,
  SWIMMER_INTERNAL_UNIFORM_KEYS,
  type SwimmerInternalUniformKey,
} from './swimmerInternalUniforms';

/** Threshold between ripple (0) and kelpSway (1) motion kinds. */
const KELP_MOTION_KIND_THRESHOLD = 0.5;

export const sourceCode = `
${swimmerInternalShaderUniforms}
${swimmerInternalCommonGlsl}
${swimmerInternalKelpSwayGlsl}
${swimmerInternalRippleGlsl}

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
    return uMotionKind > ${KELP_MOTION_KIND_THRESHOLD}
      ? debugKelpStrands(xy, uv, a)
      : debugRippleFill(uv, a, aspect);
  }
  if (uDebugMode > 0.5) {
    return half4(a, a, a, 1);
  }

  if (uMotionKind > ${KELP_MOTION_KIND_THRESHOLD}) {
    return compositeKelpSway(xy, uv, a, base.rgb);
  }
  return compositeRipple(xy, uv, a, base, aspect);
}
`;
