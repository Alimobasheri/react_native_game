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
`;

export const waveShaderMainFunc = `
  half4 main(vec2 fragCoord) {
    // Transform UV coordinates to map container space to full UV space
    vec2 containerUV = (fragCoord - containerCenter) / vec2(containerWidth, containerHeight);
    containerUV += 0.5;
    // Flip Y so 0 = container bottom, 1 = container top
    containerUV.y = 1.0 - containerUV.y;

    vec2 uv = containerUV;

    float rectangleMask = RectangleMask(fragCoord);

    float bottomY = (containerCenter.y - containerHeight / 2.0) / containerHeight;
    bottomY += 0.5;

    // Check if pixel is below water level (solid water body)
    if (containerUV.y < (bottomY + waterLevel)) {
      // Solid water body with upward-flowing interior texture
      float surfaceY = bottomY + waterLevel;
      // Normalize depth within filled region (0 = bottom, 1 = water surface)
      float depth = clamp(containerUV.y / max(surfaceY, 0.0001), 0.0, 1.0);

      // Upward flow: offset sampling UV over time so the pattern appears to rise
      vec2 flowUV = uv;
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
      vec3 flowColor = gradColor + bandIntensity * 0.12;

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
      float hasBubble = step(0.6, rSeed);
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

      // Lighten color inside bubbles slightly
      vec3 bubbleColor = vec3(1.0);
      flowColor = mix(flowColor, bubbleColor, bubbleMask * 0.18);

      return vec4(flowColor, 0.8 * rectangleMask);
    }

    // Above water level - render wavy surface
    // Position waves at the water level
    float surfaceH = bottomY + waterLevel;

    float w = WaterMask(uv, surfaceH, iTime * speed * 8.0, amplitude, frequency);

    vec2 wavePosition = YPosition(uv, surfaceH, iTime * speed * 0.2, amplitude * 0.05, frequency);

    float foamNoise = noise(wavePosition * 2. * frequency);
    float clampedW = clamp(1. - w, 0., 1.);
    float foam = 1. - foamIntensity(foamNoise, clampedW) * 3.;
    float clampedFoam = clamp(foam, 0., 1.);

    float whiteCap = 1. / exp(smoothstep(surfaceH, surfaceH + 0.01, wavePosition.y * 1.) * .5);
    vec3 waterMix = mix(vec3(1.) * clampedFoam, w * waterColor, 0.8);

    return vec4(waterMix, w * whiteCap * rectangleMask);
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
