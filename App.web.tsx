import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LogBox, StyleSheet, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import Navigation from '@/web/containers/navigation';
import './global.css';
LogBox.ignoreAllLogs();

SplashScreen.preventAutoHideAsync();

function App() {
  const [loaded, error] = useFonts({
    Montserrat: require('./assets/fonts/Montserrat-Regular.ttf'),
    'Montserrat-SemiBold': require('./assets/fonts/Montserrat-SemiBold.ttf'),
    'Montserrat-Bold': require('./assets/fonts/Montserrat-Bold.ttf'),
    'Montserrat-Light': require('./assets/fonts/Montserrat-Light.ttf'),
    'Montserrat-ExtraBold': require('./assets/fonts/Montserrat-ExtraBold.ttf'),
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }
  return (
    <SafeAreaProvider style={{ flex: 1 }}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Navigation />
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
// Default to rendering your app
let AppEntryPoint = App;

// Render Storybook if storybookEnabled is true
// if (Constants?.expoConfig?.extra?.storybookEnabled === 'true') {
//   LogBox.ignoreAllLogs(true);
//   AppEntryPoint = require('./.storybook').default;
// }

export default AppEntryPoint;
