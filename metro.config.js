const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const packagePath = '/Users/mirali/Documents/projects/matter-js-workletized';

const { generate } = require('@storybook/react-native/scripts/generate');

generate({
  configPath: path.resolve(__dirname, './.storybook'),
});

const defaultConfig = getDefaultConfig(__dirname);
console.log(defaultConfig.resolver.sourceExts);
defaultConfig.transformer.unstable_allowRequireContext = true;
defaultConfig.resolver.nodeModulesPaths = [packagePath];
// defaultConfig.watchFolders = [packagePath];
module.exports = defaultConfig;
