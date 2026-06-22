import { Skia } from '@shopify/react-native-skia';

export const screenEdgeVignetteUniforms = `
  uniform vec2 uResolution;
  uniform float uStrength;
  uniform float uSoftness;
  uniform float uRoundness;
`;

export const screenEdgeVignetteMain = `
  half4 main(float2 fragCoord) {
    // fragCoord is local path space centered at (0,0): [-w/2..w/2, -h/2..h/2].
    vec2 centered = fragCoord / max(uResolution, vec2(1.0));

    float aspect = uResolution.x / max(uResolution.y, 1.0);
    centered.x *= mix(1.0, aspect, clamp(uRoundness, 0.0, 1.0));

    float dist = length(centered) * 2.0;
    float vignette = smoothstep(
      1.0 - uSoftness,
      1.0 + uSoftness * 0.35,
      dist
    );
    vignette *= uStrength;

    float factor = 1.0 - vignette;
    return half4(vec3(factor), 1.0);
  }
`;

export const sourceCode = `
  ${screenEdgeVignetteUniforms}
  ${screenEdgeVignetteMain}
`;

export const createScreenEdgeVignetteShader = () => {
  return Skia.RuntimeEffect.Make(sourceCode)!;
};
