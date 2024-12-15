// import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
// import { StatusBar } from 'expo-status-bar';
import { LogBox, StyleSheet } from 'react-native';
// import { GestureHandlerRootView } from 'react-native-gesture-handler';
// import { View } from 'react-native';
import Constants from 'expo-constants';
// import { Game } from '@/containers/Game/index-rnsge';
LogBox.ignoreAllLogs();
// function App() {
//   return (
//     <SafeAreaProvider style={{ flex: 1 }}>
//       <GestureHandlerRootView style={{ flex: 1 }}>
//         <View style={[styles.container]}>
//           <StatusBar hidden />
//           <Game />
//         </View>
//       </GestureHandlerRootView>
//     </SafeAreaProvider>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     backgroundColor: 'yellow',
//     flex: 1,
//   },
// });
// Default to rendering your app
let AppEntryPoint = null;

// Render Storybook if storybookEnabled is true
if (Constants?.expoConfig?.extra?.storybookEnabled === 'true') {
  LogBox.ignoreAllLogs(true);
  AppEntryPoint = require('./.storybook').default;
}

export default AppEntryPoint;
