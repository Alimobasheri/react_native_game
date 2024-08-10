import { ICanvasDimensions } from "@/containers/ReactNativeSkiaGameEngine";
import { Skia } from "@shopify/react-native-skia";
import { SharedValue, useDerivedValue } from "react-native-reanimated";
import { shaderNoiseFuncWithRandom } from "../common";

export const waveShaderUniforms = `
  float M_PI = 3.1415926535897932384626433832795;
  float wave_x = 0;
  uniform float iTime;
  uniform float height;
  uniform float heightOffset;
  uniform float frequency;
  uniform float amplitude;
  uniform float speed;
  uniform float dynamicWaveX;
  uniform vec4 dynamicWave;
  uniform float heightOffsetFreq;
  uniform float heightOffsetAmp;
  uniform vec3 waterColor;
  uniform vec2 canvasSize;
`;

export const waveShaderFoamIntensityFunc = `
  // Function to calculate foam intensity based on height and noise
  float foamIntensity(float noiseValue, float height) {
      return smoothstep(0.0, 1., noiseValue * 2. + height);
  }
`;

export const waveShaderGetDecayFunc = `
  float getDecayFactorAtDistance(float distance) {
    return exp(-10. * abs(distance));
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

export const waveShaderMainFunc = `
  half4 main(vec2 fragCoord) {
    vec2 uv = fragCoord / canvasSize;
    uv.y = 1. - uv.y;
    float h = height + heightOffset;
    
    float w = WaterMask(uv,  h, iTime * speed, amplitude, frequency);

    vec2 wavePosition = YPosition(uv, h, iTime * speed * 0.2, amplitude * 0.05, frequency);

    float foamNoise = noise(wavePosition * 2. * frequency);
    float clampedW = clamp(1. - w, 0., 1.);
    float foam = 1. - foamIntensity(foamNoise,clampedW)*3.;
    float clampedFoam = clamp(foam, 0., 1.);

    float whiteCap = 1./ exp(smoothstep(h, h+0.01,wavePosition.y*1.)*.5);
    vec3 waterMix = mix(vec3(1.)*clampedFoam,w*waterColor, 0.9);
    
    return vec4(waterMix, w*whiteCap*1.);
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
    ${waveShaderMainFunc}
  `)!;
};

export const useWaveShaderUniforms = (
  dimensions: ICanvasDimensions,
  time: any,
  height: number,
  heightOffset: number,
  frequency: number,
  speed: number,
  amplitude: number,
  dynamicWaveX: SharedValue<number>,
  dynamicWave: SharedValue<[number, number, number, number]>,
  heightOffsetFreq: number,
  heightOffsetAmp: number,
  waterColor: [number, number, number]
) => {
  return useDerivedValue(() => {
    return {
      iTime: time.value,
      height: dimensions.height ? height / dimensions.height : 0,
      heightOffset,
      frequency: frequency,
      amplitude: amplitude,
      speed: speed,
      heightOffsetFreq,
      heightOffsetAmp,
      dynamicWaveX: dynamicWaveX.value,
      dynamicWave: dynamicWave.value,
      waterColor: waterColor.map((color) => color / 255) as [
        number,
        number,
        number
      ],
      canvasSize: [dimensions.width, dimensions.height],
    };
  }, [
    time.value,
    height,
    dimensions.height,
    frequency,
    amplitude,
    speed,
    waterColor,
    dynamicWaveX.value,
    dynamicWave.value,
  ]);
};

export default createWaveShader;
