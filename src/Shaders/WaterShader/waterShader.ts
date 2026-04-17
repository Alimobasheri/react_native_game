import { ICanvasDimensions } from '@/containers/ReactNativeSkiaGameEngine';
import { Skia, Uniforms } from '@shopify/react-native-skia';
import { SharedValue, useDerivedValue } from 'react-native-reanimated';
import { shaderNoiseFuncWithRandom } from '../common';
import { IWave } from '@/Game/Entities/Wave/types';

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
  uniform float uGapBlend;
  uniform float uFlowDir;
  uniform float uGapCenter;
  uniform float uGapWidth;
  uniform float uSurfaceBandCenterY;
  uniform float uSurfaceBandHalfHeight;
  uniform float uSurge;
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

  float bandMask(float y, float center, float halfH) {
    float low = smoothstep(center - halfH - 0.02, center - halfH + 0.01, y);
    float high = 1.0 - smoothstep(center + halfH - 0.01, center + halfH + 0.02, y);
    return clamp(low * high, 0.0, 1.0);
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
    float surgeT = smoothstep(0.0, 1.0, clamp(uSurge, 0.0, 1.0));
    float blendedGapStart = mix(uGapPrev.x, uGapCurrent.x, blendT);
    float blendedGapEnd = mix(uGapPrev.y, uGapCurrent.y, blendT);
    vec2 blendedGap = vec2(blendedGapStart, max(blendedGapStart + 0.01, blendedGapEnd));
    float activeGapMask = gapMask(blendedGap, containerUV.x);
    float activeBandMask = bandMask(
      containerUV.y,
      clamp(uSurfaceBandCenterY, 0.0, 1.0),
      clamp(uSurfaceBandHalfHeight, 0.02, 0.2)
    );

    // Flip sign so visual slope points toward push direction.
    float tilt = -uFlowDir * (0.02 + 0.018 * surgeT);
    float widthSafe = max(uGapWidth, 0.06);
    float centeredX = (containerUV.x - uGapCenter) / widthSafe;
    float tiltLocal = clamp(centeredX, -1.0, 1.0);
    float tiltedSurface = clamp(surfaceBase + tilt * tiltLocal * activeGapMask * activeBandMask, 0.0, 1.0);
    float directionalFlowBoost = abs(uFlowDir) * (0.12 + 0.3 * surgeT) * activeGapMask * activeBandMask;
    float pressure = clamp((1.0 - min(1.0, widthSafe)) * 0.7 + abs(uFlowDir) * 0.3, 0.0, 1.0);

    // Wave energy: calm when gap is wide and there is little lateral push; stronger when squeezed or flowing.
    float gapOpen = clamp(uGapWidth, 0.001, 1.0);
    float wideCalm = smoothstep(0.18, 0.48, gapOpen);
    float narrowStress = 1.0 - wideCalm;
    float flowMag = clamp(abs(uFlowDir), 0.0, 1.0);
    float agitation = clamp(
      narrowStress * 0.88 + flowMag * 0.52 + surgeT * 0.38,
      0.0,
      1.0
    );
    float idleWide = wideCalm * (1.0 - smoothstep(0.0, 0.22, flowMag + surgeT * 0.6));
    agitation *= 1.0 - idleWide * 0.92;

    float waveAmp = mix(0.0009, 0.026, agitation);
    float peakSharp = mix(1.0, 1.35, narrowStress * (0.5 + 0.5 * pressure));

    // Horizontal advection: crests travel with push direction (UV space), speed scales with flow + surge.
    float advectSpeed = speed * 0.0001 * (3.2 + 4.5 * flowMag + 2.2 * surgeT);
    float flowPhase = uFlowDir * iTime * advectSpeed;

    float wave1 = sin((containerUV.x * frequency * 10.0) + flowPhase * 1.0 + iTime * speed * 1.2);
    float wave2 = sin((containerUV.x * frequency * 18.0) + flowPhase * 1.25 - iTime * speed * 0.8 + 1.3);
    float wave3 = sin((containerUV.x * frequency * 6.0) + flowPhase * 0.75 + iTime * speed * 0.5);
    float blendedWave = wave1 * 0.55 + wave2 * 0.3 + wave3 * 0.15;
    blendedWave = sign(blendedWave) * pow(max(abs(blendedWave), 0.0001), peakSharp);

    float curveMask = mix(0.2, 1.0, activeGapMask * activeBandMask * (0.35 + 0.65 * agitation));
    float surfaceWaveOffset = blendedWave * waveAmp * curveMask;
    float finalSurface = clamp(tiltedSurface + surfaceWaveOffset, 0.0, 1.0);

    // Check if pixel is below water level (solid water body)
    if (containerUV.y < (bottomY + finalSurface)) {
      // Solid water body with upward-flowing interior texture
      float surfaceY = bottomY + finalSurface;
      // Normalize depth within filled region (0 = bottom, 1 = water surface)
      float depth = clamp(containerUV.y / max(surfaceY, 0.0001), 0.0, 1.0);

      // Upward flow: offset sampling UV over time so the pattern appears to rise
      vec2 flowUV = uv;
      flowUV.x += uFlowDir * depth * 0.07 * (0.5 + uSurge);
      flowUV.y -= iTime * speed * 0.6;

      // Anisotropic scaling to create soft vertical streaks
      vec2 streakUV = vec2(flowUV.x * 1.5, flowUV.y * 4.0);
      float flowNoise = noise(streakUV);

      // Base vertical gradient: darker at bottom, lighter near surface
      vec3 deepColor = waterColor * 0.7;
      vec3 shallowColor = waterColor * 1.1;
      vec3 gradColor = mix(deepColor, shallowColor, depth);

      // Modulate brightness with noise to get subtle moving bands
      float bandIntensity = smoothstep(0.3, 0.9, flowNoise);
      vec3 flowColor = gradColor + bandIntensity * (0.10 + 0.08 * directionalFlowBoost);

      // --- Minimal hyper-casual bubbles (true circles in screen space) -----
      // Water-space Y (0 = bottom of water, 1 = surface)
      float waterHeight = max(waterLevel, 0.0001);
      float localY = clamp((containerUV.y - bottomY) / waterHeight, 0.0, 1.0);

      // Container-local pixel coordinates (0..containerWidth / 0..containerHeight)
      float containerLeft = containerCenter.x - containerWidth * 0.5;
      float containerTop = containerCenter.y - containerHeight * 0.5;
      vec2 containerLocalPx = vec2(
        fragCoord.x - containerLeft,
        fragCoord.y - containerTop
      );

      // Square cells in pixel space so circles stay circular
      float cols = 6.0;
      float rows = 14.0;
      vec2 cellSize = vec2(containerWidth / cols, containerHeight / rows);

      // Scroll pattern upward over time
      vec2 bubblePosPx = vec2(
        containerLocalPx.x,
        containerLocalPx.y + iTime * speed * 0.3 * containerHeight
      );

      vec2 cellIndex = floor(bubblePosPx / cellSize);
      vec2 cellUV = fract(bubblePosPx / cellSize);

      // Random center and radius per cell (noise-based random)
      float rSeed = random(cellIndex * 3.17);
      float bubbleThreshold = 0.68 - pressure * 0.22;
      float hasBubble = step(bubbleThreshold, rSeed);
      float r1 = random(cellIndex * 7.31 + 1.23);
      float r2 = random(cellIndex * 11.71 + 4.56);
      vec2 bubbleCenter = vec2(0.25 + 0.5 * r1, 0.2 + 0.6 * r2);
      float rRadius = random(cellIndex * 13.97 + 8.42);
      // Smaller, tighter circles so they don't get clipped at cell edges
      float bubbleRadius = 0.12 + 0.08 * rRadius;

      vec2 diff = cellUV - bubbleCenter;
      float distToCenter = length(diff); // true circle in pixel-mapped cell
      float bubbleMask = hasBubble * (1.0 - smoothstep(bubbleRadius, bubbleRadius + 0.04, distToCenter));

      // Fade bubbles out near the surface and bottom
      float verticalFade = smoothstep(0.08, 0.25, localY) * (1.0 - smoothstep(0.7, 0.98, localY));
      bubbleMask *= verticalFade;
      bubbleMask *= (0.75 + 0.25 * activeBandMask * activeGapMask + pressure * 0.15);

      // Lighten color inside bubbles slightly
      vec3 bubbleColor = vec3(1.0);
      flowColor = mix(flowColor, bubbleColor, bubbleMask * 0.18);

      // In active surface band, only gap span should be visible.
      float bandGapVisibility = mix(1.0, activeGapMask, activeBandMask);
      return vec4(flowColor, 0.8 * rectangleMask * bandGapVisibility);
    }

    // Above water level - render wavy surface
    // Position waves at the water level
    float surfaceH = bottomY + finalSurface;

    float w = WaterMask(uv, surfaceH, iTime * speed * 8.0, amplitude, frequency);

    vec2 wavePosition = YPosition(uv, surfaceH, iTime * speed * 0.2, amplitude * 0.05, frequency);

    float foamNoise = noise(wavePosition * (2.0 + 1.0 * pressure) * frequency);
    float clampedW = clamp(1. - w, 0., 1.);
    float foam = 1. - foamIntensity(foamNoise, clampedW) * 3.;
    float clampedFoam = clamp(foam, 0., 1.);

    float whiteCap = 1. / exp(smoothstep(surfaceH, surfaceH + 0.01, wavePosition.y * 1.) * .5);
    vec3 waterMix = mix(vec3(1.) * clampedFoam, w * waterColor, 0.8);
    float foamBoost = 1.0 + pressure * 0.35 * activeGapMask * activeBandMask;
    // Surface crest also respects gap limits inside the active band.
    float surfaceVisibility = mix(1.0, activeGapMask, activeBandMask);
    return vec4(waterMix, w * whiteCap * foamBoost * rectangleMask * surfaceVisibility);
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
