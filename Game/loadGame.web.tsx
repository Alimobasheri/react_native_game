import React, { FC } from 'react';
import { Text, View } from 'react-native';
import { WithSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import { version } from 'canvaskit-wasm/package.json';

// @ts-ignore
global.nativePerformanceNow = performance.now.bind(performance);
export const LoadGame: FC = () => {
  return (
    <View
      style={{
        width: '100%',
        height: '100%',
      }}
    >
      <WithSkiaWeb
        // import() uses the default export of MySkiaComponent.tsx
        getComponent={() => require('Game/index-rnsge')}
        fallback={<Text>Loading Skia...</Text>}
        opts={{
          locateFile: (file) =>
            `https://cdn.jsdelivr.net/npm/canvaskit-wasm@${version}/bin/full/${file}`,
        }}
      />
    </View>
  );
};
