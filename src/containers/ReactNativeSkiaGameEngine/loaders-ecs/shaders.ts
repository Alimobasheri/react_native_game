import { Skia, SkRuntimeEffect } from '@shopify/react-native-skia';

export type ShadersCache = Record<string, SkRuntimeEffect>;

export type LoadedShader = {
  type: 'shader';
  name: string;
  data: SkRuntimeEffect;
};

export const loadShaderAssets = (
  assets: Record<string, string>
): LoadedShader[] => {
  if (assets) {
    const compiledShaders = Object.fromEntries(
      Object.entries(assets).reduce((acc, [key, source]) => {
        try {
          const effect = Skia.RuntimeEffect.Make(source);
          if (!effect) {
            console.warn(
              "[RNTGE] Warning: Couldn't make RuntimeEffect for shader:",
              key
            );
            return acc;
          }
          return acc.concat([[key, effect]]);
        } catch (error) {
          console.warn(
            '[RNTGE] Warning: RuntimeEffect compile failed for shader:',
            key,
            error
          );
          return acc;
        }
      }, [] as [string, SkRuntimeEffect][])
    );

    let loadedShaders: LoadedShader[] = Object.entries(compiledShaders)
      .filter(([, effect]) => effect !== null)
      .map(([name, data]) => ({
        type: 'shader',
        name,
        data,
      }));

    return loadedShaders;
  }
  return [];
};
