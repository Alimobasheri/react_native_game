import { ICanvasDimensions } from '@/containers/ReactNativeSkiaGameEngine';
import { Skia, Uniforms } from '@shopify/react-native-skia';
import { SharedValue, useDerivedValue } from 'react-native-reanimated';
import { shaderNoiseFuncWithRandom } from '../common';
import { waterBodyShaderHelpers } from './waterBodyShader';
import { waterIdleSurfaceHelpers } from './waterIdleSurface.glsl';
import { waterLightingUniforms } from './waterShaderUniforms';
import { waterSurfaceShaderHelpers } from './waterSurfaceShader';

export const waveShaderUniforms = `
  float M_PI = 3.1415926535897932384626433832795;
  float wave_x = 0;
  uniform float iTime;
  uniform float height;
  uniform float heightOffset;
  uniform float waterLevel;
  uniform float frequency;
  uniform float amplitude;
  uniform float speed;
  uniform float dynamicWaveX;
  uniform vec4 dynamicWave;
  uniform float heightOffsetFreq;
  uniform float heightOffsetAmp;
  uniform vec3 waterColor;
  uniform vec2 canvasSize;
  uniform vec2 containerCenter;
  uniform float containerWidth;
  uniform float containerHeight;
  uniform vec2 uGapCurrent;
  uniform vec2 uGapPrev;
  uniform vec4 uGapCurr01;
  uniform vec4 uGapCurr23;
  uniform vec4 uGapPrev01;
  uniform vec4 uGapPrev23;
  uniform vec4 uFlowPerRange;
  uniform vec4 uAmpPerRange;
  uniform float uHybridGapMaskStrength;
  uniform float uGapBlend;
  uniform float uFlowDir;
  uniform float uGapCenter;
  uniform float uGapWidth;
  uniform float uSurfaceBandCenterY;
  uniform float uSurfaceBandHalfHeight;
  uniform float uSurge;
  uniform float uPeakHeight;
  uniform float uPeakSharpness;
  uniform float uTroughDepth;
  uniform float uFlowWaveSpeedScale;
  uniform float uFlowVelocity;
  uniform float uFlowOffset;
  uniform float uSurgeEnergy;
  uniform float uCalmness;
  uniform float uCurveCenter;
  uniform float uCurveAmp;
  uniform float uCurveTilt;
  ${waterLightingUniforms}
`;

export const waveShaderFoamIntensityFunc = `
  // Function to calculate foam intensity based on height and noise
  float foamIntensity(float noiseValue, float height) {
      return smoothstep(0.0, 1., noiseValue * 2. + height);
  }
`;

export const waveShaderGetDecayFunc = `
  float getDecayFactorAtDistance(float distance) {
    return exp(-8. * abs(distance));
  }
`;

export const waveShaderYPosition = `
  vec2 YPosition(vec2 uv, float h, float t, float i, float freq) {
    vec2 st = uv;
    vec2 dynamic_st = st;
    st.x += t;
    float d = st.x - (wave_x / canvasSize.x);
    st.y += -sin((d * (freq))* 0.5 + 0.5) * i;

    dynamic_st.x += dynamicWave.z * dynamicWave.w;
    float dynamicDistance = dynamic_st.x - (dynamicWaveX / canvasSize.x);
    float decayFactor = getDecayFactorAtDistance(dynamicDistance);
    st.y += -sin((dynamicDistance * dynamicWave.y)* 0.5 + 0.5) * dynamicWave.x * 0.05 * decayFactor;

    return st;
  }
`;

export const waveShaderWaveMaskFunc = `
  float WaveMask(vec2 uv, float h, float t, float i, float freq) {
    vec2 st = YPosition(uv, h, t, i, freq);

    float softness = 0.001;
    float c = smoothstep(h + softness, h, st.y);
    return c;
  }
`;

export const waveShaderWaterMaskFunc = `
  float WaterMask(vec2 uv, float h, float t, float i, float freq) {
    float waterMask1 = WaveMask(uv, h, t * 0.4, i * 0.05, freq);
    float waterMask2 = WaveMask(uv, h, -t * 0.5, i * 0.05, freq);
    float waterMask3 = WaveMask(uv, h, t * 0.3, i * 0.05, freq);

    float waterMask = mix(waterMask1, waterMask2, .3);
    waterMask = mix(waterMask, waterMask3, .2);
    return waterMask;
  }
`;

export const waveShaderCircleMaskFunc = `
  float RectangleMask(vec2 fragCoord) {
    // Since the WaterView renders a rectangle exactly matching container bounds,
    // and Skia clips to shape bounds, we want full opacity everywhere within the shape.
    // The container bounds checking is handled by the shape clipping.
    return 1.0;
  }

  float gapMask(vec2 rangeNorm, float x) {
    // Keep edges tight so surge does not visibly bleed under blocks.
    float edge = 0.003;
    float left = smoothstep(rangeNorm.x - edge, rangeNorm.x + edge, x);
    float right = 1.0 - smoothstep(rangeNorm.y - edge, rangeNorm.y + edge, x);
    return clamp(left * right, 0.0, 1.0);
  }

  float softGapInfluence(vec2 rangeNorm, float x, float feather) {
    float left = smoothstep(rangeNorm.x - feather, rangeNorm.x + feather, x);
    float right = 1.0 - smoothstep(rangeNorm.y - feather, rangeNorm.y + feather, x);
    return clamp(left * right, 0.0, 1.0);
  }

  float bandMask(float y, float center, float halfH) {
    float low = smoothstep(center - halfH - 0.02, center - halfH + 0.01, y);
    float high = 1.0 - smoothstep(center + halfH - 0.01, center + halfH + 0.02, y);
    return clamp(low * high, 0.0, 1.0);
  }

  vec2 safeRange(vec2 r) {
    float s = clamp(r.x, 0.0, 1.0);
    float e = clamp(r.y, 0.0, 1.0);
    // treat near-empty ranges as disabled
    if (e <= s + 0.0005) {
      return vec2(0.0, 0.0);
    }
    return vec2(s, max(s + 0.01, e));
  }

  float softRangeWeight(vec2 r, float x) {
    vec2 rr = safeRange(r);
    if (rr.y <= rr.x + 0.0005) return 0.0;
    float w = rr.y - rr.x;
    float feather = max(0.02, min(0.09, w * 0.45));
    return softGapInfluence(rr, x, feather);
  }

  float hardRangeMask(vec2 r, float x) {
    vec2 rr = safeRange(r);
    if (rr.y <= rr.x + 0.0005) return 0.0;
    return gapMask(rr, x);
  }
`;

export const waveShaderMainFunc = `
  half4 main(vec2 fragCoord) {
    // IMPORTANT: render path is local-space centered at (0,0),
    // so fragCoord is interpreted in local path coordinates.
    // Map local rect [-w/2..w/2, -h/2..h/2] to UV [0..1].
    vec2 containerUV = vec2(
      (fragCoord.x + containerWidth * 0.5) / max(containerWidth, 0.0001),
      1.0 - ((fragCoord.y + containerHeight * 0.5) / max(containerHeight, 0.0001))
    );

    vec2 uv = containerUV;

    float rectangleMask = RectangleMask(fragCoord);

    // In containerUV space, bottom is always 0 and top is always 1.
    float bottomY = 0.0;
    float surfaceBase = clamp(waterLevel, 0.0, 1.0);
    float blendT = smoothstep(0.0, 1.0, clamp(uGapBlend, 0.0, 1.0));
    float blendedGapStart = mix(uGapPrev.x, uGapCurrent.x, blendT);
    float blendedGapEnd = mix(uGapPrev.y, uGapCurrent.y, blendT);
    vec2 blendedGap = vec2(blendedGapStart, max(blendedGapStart + 0.01, blendedGapEnd));
    float blendedGapWidth = max(0.02, blendedGap.y - blendedGap.x);
    // Multi-gap hybrid: compute combined mask/weight from up to 4 packed ranges.
    vec2 r0 = vec2(mix(uGapPrev01.x, uGapCurr01.x, blendT), mix(uGapPrev01.y, uGapCurr01.y, blendT));
    vec2 r1 = vec2(mix(uGapPrev01.z, uGapCurr01.z, blendT), mix(uGapPrev01.w, uGapCurr01.w, blendT));
    vec2 r2 = vec2(mix(uGapPrev23.x, uGapCurr23.x, blendT), mix(uGapPrev23.y, uGapCurr23.y, blendT));
    vec2 r3 = vec2(mix(uGapPrev23.z, uGapCurr23.z, blendT), mix(uGapPrev23.w, uGapCurr23.w, blendT));
    float w0 = softRangeWeight(r0, containerUV.x);
    float w1 = softRangeWeight(r1, containerUV.x);
    float w2 = softRangeWeight(r2, containerUV.x);
    float w3 = softRangeWeight(r3, containerUV.x);
    float softGapAny = clamp(max(max(w0, w1), max(w2, w3)), 0.0, 1.0);
    float activeGapMaskAny = clamp(max(max(hardRangeMask(r0, containerUV.x), hardRangeMask(r1, containerUV.x)),
                                      max(hardRangeMask(r2, containerUV.x), hardRangeMask(r3, containerUV.x))), 0.0, 1.0);
    // Keep single-gap math for silhouette for now; multi-surface comes next step.
    float activeGapMask = mix(gapMask(blendedGap, containerUV.x), activeGapMaskAny, clamp(uHybridGapMaskStrength, 0.0, 1.0));
    float gapFeather = max(0.02, min(0.09, blendedGapWidth * 0.45));
    float softGap = mix(softGapInfluence(blendedGap, containerUV.x, gapFeather), softGapAny, clamp(uHybridGapMaskStrength, 0.0, 1.0));
    float activeBandMask = bandMask(
      containerUV.y,
      clamp(uSurfaceBandCenterY, 0.0, 1.0),
      clamp(uSurfaceBandHalfHeight, 0.02, 0.2)
    );
    float surgeEnergy = clamp(max(uSurge, uSurgeEnergy), 0.0, 1.0);
    float calmness = clamp(uCalmness, 0.0, 1.0);
    float flowVelocity = clamp(mix(uFlowDir, uFlowVelocity, 0.75), -1.0, 1.0);
    float flowOffset = clamp(uFlowOffset, -1.0, 1.0);
    float pressure = clamp((1.0 - blendedGapWidth) * 0.72 + abs(flowVelocity) * 0.28, 0.0, 1.0);
    float directionalFlowBoost = abs(flowVelocity) * (0.1 + 0.3 * surgeEnergy) * activeGapMask * activeBandMask;

    // Canonical silhouette = center surge curve + directional tilt + optional calm ripples.
    float curveMargin = max(0.01, min(0.08, blendedGapWidth * 0.2));
    float inertiaTravel = max(0.035, blendedGapWidth * (0.16 + 0.2 * surgeEnergy));
    float curveCenter = clamp(
      uCurveCenter,
      blendedGap.x + curveMargin - inertiaTravel,
      blendedGap.y - curveMargin + inertiaTravel
    );
    float gapHalf = max(blendedGapWidth * 0.5, 0.02);
    float centeredNorm = (containerUV.x - curveCenter) / gapHalf;
    float centerCurve = exp(-centeredNorm * centeredNorm * 2.8) * max(0.0, uCurveAmp);
    float directionalTilt = clamp(centeredNorm, -1.0, 1.0) * uCurveTilt;
    float calmRippleAmp = (0.0005 + calmness * 0.0038) * (1.0 - surgeEnergy) * softGap * activeBandMask;
    float calmRippleA = sin(containerUV.x * frequency * 4.5 + iTime * speed * (0.02 + 0.04 * abs(flowVelocity)));
    float calmRippleB = sin(containerUV.x * frequency * 2.8 - iTime * speed * 0.015 + 1.2);
    float calmRipples = (calmRippleA * 0.65 + calmRippleB * 0.35) * calmRippleAmp;
    float curveInfluence = 0.18 + 0.82 * activeBandMask;
    float edgeBend = (1.0 - softGap) * activeBandMask * (0.003 + 0.01 * (0.4 + pressure * 0.6));
    float idleOffset = computeIdleSurfaceOffset(containerUV);
    float gameplayDelta =
      (centerCurve + directionalTilt) * curveInfluence + calmRipples - edgeBend;
    float visualIntensity = clamp(uVisualIntensity, 0.0, 1.0);
    // Keep idle surface waves alive; layer gameplay bulge/tilt on top.
    float finalSurface = clamp(
      surfaceBase + idleOffset + gameplayDelta * visualIntensity,
      0.0,
      1.0
    );

    // Check if pixel is below water level (solid water body)
    if (containerUV.y < (bottomY + finalSurface)) {
      float surfaceY = bottomY + finalSurface;
      vec3 flowColor = renderWaterBody(
        containerUV,
        uv,
        fragCoord,
        surfaceY,
        finalSurface,
        centeredNorm,
        activeBandMask,
        softGap,
        surgeEnergy,
        flowVelocity,
        directionalFlowBoost
      );

      float bandGapVisibility = mix(1.0, softGap, activeBandMask * visualIntensity);
      return vec4(flowColor, 0.88 * rectangleMask * bandGapVisibility);
    }

    // Above water level - thin glossy surface lip (foam only during gameplay).
    float surfaceH = bottomY + finalSurface;
    return renderSurfaceAboveWater(
      containerUV,
      uv,
      surfaceH,
      calmness,
      flowVelocity,
      pressure,
      softGap,
      activeBandMask,
      surgeEnergy,
      rectangleMask
    );
  }
`;

export const createWaveShader = () => {
  return Skia.RuntimeEffect.Make(`
    ${waveShaderUniforms}
    ${shaderNoiseFuncWithRandom}
    ${waveShaderGetDecayFunc}
    ${waveShaderFoamIntensityFunc}
    ${waveShaderYPosition}
    ${waveShaderWaveMaskFunc}
    ${waveShaderWaterMaskFunc}
    ${waveShaderCircleMaskFunc}
    ${waterIdleSurfaceHelpers}
    ${waterBodyShaderHelpers}
    ${waterSurfaceShaderHelpers}
    ${waveShaderMainFunc}
  `)!;
};
export const sourceCode = `
    ${waveShaderUniforms}
    ${shaderNoiseFuncWithRandom}
    ${waveShaderGetDecayFunc}
    ${waveShaderFoamIntensityFunc}
    ${waveShaderYPosition}
    ${waveShaderWaveMaskFunc}
    ${waveShaderWaterMaskFunc}
    ${waveShaderCircleMaskFunc}
    ${waterIdleSurfaceHelpers}
    ${waterBodyShaderHelpers}
    ${waterSurfaceShaderHelpers}
    ${waveShaderMainFunc}
  `;
export const useWaveShaderUniforms = ({
  frequency,
  amplitude,
  speed,
  time,
  dynamicWaveX,
  dynamicWaveUniformValue,
  dimensions,
  height,
  heightOffset,
  waterLevel,
  heightOffsetFreq,
  heightOffsetAmp,
  waterColor,
}: {
  time: SharedValue<number>;
  frequency: SharedValue<number>;
  amplitude: SharedValue<number>;
  speed: SharedValue<number>;
  dynamicWaveX: SharedValue<number>;
  dynamicWaveUniformValue: SharedValue<[number, number, number, number]>;
  dimensions: ICanvasDimensions;
  height: number;
  heightOffset: number;
  waterLevel: number;
  heightOffsetFreq: number;
  heightOffsetAmp: number;
  waterColor: [number, number, number];
}) => {
  return useDerivedValue<Uniforms>(() => {
    const result = {
      iTime: time.value,
      height: dimensions.height ? height / dimensions.height : 0,
      heightOffset,
      waterLevel,
      frequency: frequency.value,
      amplitude: amplitude.value,
      speed: speed.value,
      heightOffsetFreq,
      heightOffsetAmp,
      dynamicWaveX: dynamicWaveX.value,
      dynamicWave: dynamicWaveUniformValue.value,
      waterColor: waterColor.map((color) => color / 255) as [
        number,
        number,
        number
      ],
      canvasSize: [dimensions.width || 0, dimensions.height || 0],
    };
    return result;
  }, [
    time,
    frequency,
    amplitude,
    speed,
    dynamicWaveUniformValue,
    dynamicWaveX,
    height,
    heightOffset,
    waterLevel,
    dimensions.height,
    waterColor,
  ]);
};

export default createWaveShader;
