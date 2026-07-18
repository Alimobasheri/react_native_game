const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const { generate } = require('@storybook/react-native/scripts/generate');

generate({
  configPath: path.resolve(__dirname, './.storybook'),
});

const defaultConfig = getDefaultConfig(__dirname);
defaultConfig.transformer.unstable_allowRequireContext = true;

// Web resolves zustand's ESM entry (uses import.meta) which Metro can't run.
// Native already uses the react-native export -> CJS. Force CJS on web too.
const upstreamResolveRequest = defaultConfig.resolver.resolveRequest;
defaultConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    platform === 'web' &&
    (moduleName === 'zustand' || moduleName.startsWith('zustand/'))
  ) {
    return {
      type: 'sourceFile',
      filePath: require.resolve(moduleName),
    };
  }

  if (upstreamResolveRequest) {
    return upstreamResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = defaultConfig;
