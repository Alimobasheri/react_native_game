export default ({ config }) => {
  return {
    expo: {
      name: 'reactNativeGame',
      slug: 'reactNativeGame',
      version: '1.0.0',
      orientation: 'landscape',
      icon: './assets/icon.png',
      userInterfaceStyle: 'light',
      jsEngine: 'hermes',
      newArchEnabled: true,
      splash: {
        image: './assets/splash.png',
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
      },
      updates: {
        fallbackToCacheTimeout: 0,
      },
      assetBundlePatterns: ['**/*'],
      ios: {
        supportsTablet: true,
        bundleIdentifier: 'com.narin.waves_crash',
      },
      android: {
        adaptiveIcon: {
          foregroundImage: './assets/adaptive-icon.png',
          backgroundColor: '#FFFFFF',
        },
        package: 'com.narin.waves_crash',
      },
      web: {
        favicon: './assets/favicon.png',
      },
      experiments: {
        tsconfigPaths: true,
      },
      extra: {
        // eas: {
        //   projectId: "20ce35ae-97ab-4ba1-adde-5d8111be3d8a",
        // },
        storybookEnabled: process.env.STORYBOOK_ENABLED,
      },
    },
  };
};
