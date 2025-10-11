import { Skia, SkRuntimeEffect } from '@shopify/react-native-skia';
import { runOnUI } from 'react-native-reanimated';

export type ShadersCache = Record<string, SkRuntimeEffect>;

export const loadShadersNative = (loadedShaders: ShadersCache) => {
  'worklet';

  global._RNTGE_.shaderCache = {
    ...global._RNTGE_.shaderCache,
    ...loadedShaders,
  };
};

export const loadShaderAssets = async (assets: Record<string, string>) => {
  if (assets) {
    const compiledShaders = Object.fromEntries(
      Object.entries(assets).reduce((acc, [key, source]) => {
        const effect = Skia.RuntimeEffect.Make(source);
        if (!effect) {
          return acc;
        }
        return acc.concat([[key, effect]]);
      }, [] as [string, SkRuntimeEffect][])
    );

    let loadedShaders: ShadersCache = Object.fromEntries(
      Object.entries(compiledShaders).filter(([, effect]) => effect !== null)
    );

    runOnUI(loadShadersNative)(loadedShaders);
  }
};
