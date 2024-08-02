import { ICanvasDimensions } from "@/containers/ReactNativeSkiaGameEngine";
import { Skia } from "@shopify/react-native-skia";
import { useDerivedValue } from "react-native-reanimated";

export const waveShaderUniforms = `
  uniform float iTime;
  uniform float height;
  uniform float heightOffset;
  uniform float frequency1;
  uniform float frequency2;
  uniform float frequency3;
  uniform float amplitude1;
  uniform float amplitude2;
  uniform float amplitude3;
  uniform float speed1;
  uniform float speed2;
  uniform float speed3;
  uniform float heightOffsetFreq;
  uniform float heightOffsetAmp;
  uniform vec3 waterColor;
  uniform vec2 canvasSize;
`;

export const waveShaderWaveMaskFunc = `
  float WaveMask(vec2 uv, float h, float t, float i, float freq) {
    vec2 st = uv;
    st.x += t;
    st.y += (sin(st.x * freq) * 0.5 + 0.5) * i;

    float softness = 0.001;
    float c = smoothstep(h + softness, h, st.y);
    return c;
  }
`;

export const waveShaderWaterMaskFunc = `
  float WaterMask(vec2 uv, float h, float t, float i, float freq1, float freq2, float freq3) {
    float waterMask1 = WaveMask(uv, h, t * speed1, i * amplitude1, freq1);
    float waterMask2 = WaveMask(uv, h, -t * speed2, i * amplitude2, freq2);
    float waterMask3 = WaveMask(uv, h, t * speed3, i * amplitude3, freq3);

    float waterMask = mix(waterMask1, waterMask2, .5);
    waterMask = mix(waterMask, waterMask3, .5);
    return waterMask;
  }
`;

export const waveShaderMainFunc = () => `
  half4 main(vec2 fragCoord) {
    vec2 uv = 1. - fragCoord / canvasSize;
    float h = height;

    float o1 = -sin(iTime * heightOffsetFreq) * heightOffsetAmp;
    
    float w = WaterMask(uv,  h + heightOffset, iTime * 0.25, 1.0, frequency1, frequency2, frequency3);
    
    return vec4(w * waterColor, w*1.);
  }
`;

export const createWaveShader = () => {
  return Skia.RuntimeEffect.Make(`
    ${waveShaderUniforms}
    ${waveShaderWaveMaskFunc}
    ${waveShaderWaterMaskFunc}
    ${waveShaderMainFunc()}
  `)!;
};

export const useWaveShaderUniforms = (
  dimensions: ICanvasDimensions,
  time: any,
  height: number,
  heightOffset: number,
  freq1: number,
  amp1: number,
  speed1: number,
  freq2: number,
  amp2: number,
  speed2: number,
  freq3: number,
  amp3: number,
  speed3: number,
  heightOffsetFreq: number,
  heightOffsetAmp: number,
  waterColor: [number, number, number]
) => {
  console.log("🚀 ~ heightOffset:", heightOffset);
  return useDerivedValue(() => {
    return {
      iTime: time.value,
      height: dimensions.height ? height / dimensions.height : 0,
      heightOffset,
      frequency1: freq1,
      amplitude1: amp1,
      speed1: speed1,
      frequency2: freq2,
      amplitude2: amp2,
      speed2: speed2,
      frequency3: freq3,
      amplitude3: amp3,
      speed3: speed3,
      heightOffsetFreq,
      heightOffsetAmp,
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
    freq1,
    amp1,
    speed1,
    freq2,
    amp2,
    speed2,
    freq3,
    amp3,
    speed3,
    waterColor,
  ]);
};

export default createWaveShader;
