import { Skia, SkRuntimeEffect } from '@shopify/react-native-skia';

export type ShadersCache = Record<string, SkRuntimeEffect>;

export type LoadedShader = {
  type: 'shader';
  name: string;
  data: string;
};

/** Compile on the worklet thread — RuntimeEffect must not cross scheduleOnUI on web. */
export const compileShaderOnUI = (source: string): SkRuntimeEffect | null => {
  'worklet';
  try {
    const effect = Skia.RuntimeEffect.Make(source);
    if (!effect) {
      console.warn('[RNTGE][shaderLoader] RuntimeEffect.Make returned null');
      return null;
    }
    return effect;
  } catch (error) {
    console.warn('[RNTGE][shaderLoader] RuntimeEffect compile failed', error);
    return null;
  }
};

export const loadShaderAssets = (
  assets: Record<string, string>
): LoadedShader[] => {
  if (!assets) {
    return [];
  }

  return Object.entries(assets).map(([name, source]) => ({
    type: 'shader',
    name,
    data: source,
  }));
};
