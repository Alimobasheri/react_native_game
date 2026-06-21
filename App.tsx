import React from 'react';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LogBox, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View } from 'react-native';
import Constants from 'expo-constants';
import { SwimmerGameComp } from './src/containers/ReactNativeSkiaGameEngine/Swimmer.stories';
// import { Game } from '@/containers/Game/index-rnsge';
import { WATER_SURFACE_FROM_CONTAINER_BOTTOM_FRACTION } from './src/Layout'
import { sideWallTuning } from './src/config/swimmerTuning'
LogBox.ignoreAllLogs();

function App() {
  return (
    <SafeAreaProvider style={{ flex: 1 }}>
      <View style={[styles.container]}>
        <StatusBar hidden />
        <SwimmerGameComp waterSurfaceFromBottomFraction={
          WATER_SURFACE_FROM_CONTAINER_BOTTOM_FRACTION}
          waterRiseSpeed={50}
          raisingSpeed={200}
          waterShaderOpacity={0.52}
          sideWallContainerOverlapPx={sideWallTuning.CONTAINER_OVERLAP_PX}
          lockedTemplateName={""}
          storyLockedProceduralSegment={""} />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'yellow',
    flex: 1,
  },
});
// Default to rendering your app
let AppEntryPoint = App;

// // Render Storybook if storybookEnabled is true
if (Constants?.expoConfig?.extra?.storybookEnabled === 'true') {
  LogBox.ignoreAllLogs(true);
  AppEntryPoint = require('./.storybook').default;
}

export default AppEntryPoint;
