import { Skia } from '@shopify/react-native-skia';

export const screenAtmosphereGradientUniforms = `
  uniform vec2 uResolution;
  uniform vec3 uColorTop;
  uniform vec3 uColorMid;
  uniform vec3 uColorBottom;
  uniform float uMidStop;
  uniform float uLaneCenterX;
  uniform float uLaneHalfWidth;
  uniform float uLaneLift;
`;

export const screenAtmosphereGradientMain = `
  half4 main(float2 fragCoord) {
    vec2 uv = fragCoord / max(uResolution, vec2(1.0));
    float y = uv.y;

    vec3 color;
    if (y <= uMidStop) {
      float t = uMidStop > 0.0001 ? y / uMidStop : 0.0;
      color = mix(uColorTop, uColorMid, clamp(t, 0.0, 1.0));
    } else {
      float t = (1.0 - uMidStop) > 0.0001
        ? (y - uMidStop) / (1.0 - uMidStop)
        : 1.0;
      color = mix(uColorMid, uColorBottom, clamp(t, 0.0, 1.0));
    }

    float laneHalf = max(uLaneHalfWidth, 0.02);
    float laneDist = abs(uv.x - uLaneCenterX) / laneHalf;
    float laneMask = 1.0 - smoothstep(0.35, 1.0, laneDist);
    color += uLaneLift * laneMask;

    float edgeFalloff = smoothstep(0.0, 0.22, uv.x) * smoothstep(0.0, 0.22, 1.0 - uv.x);
    color *= mix(0.88, 1.0, edgeFalloff);

    return half4(clamp(color, 0.0, 1.0), 1.0);
  }
`;

export const sourceCode = `
  ${screenAtmosphereGradientUniforms}
  ${screenAtmosphereGradientMain}
`;

export const createScreenAtmosphereGradientShader = () => {
  return Skia.RuntimeEffect.Make(sourceCode)!;
};
