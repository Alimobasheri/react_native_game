import * as React from 'react';
import { createStaticNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Landing } from '../pages/Landing';
import { Header } from '../components/navigation/header';
import { View } from 'react-native';

const RootStack = createNativeStackNavigator({
  initialRouteName: 'home',
  screenOptions: {
    header: Header,
    headerStyle: { backgroundColor: 'transparent' },
    contentStyle: { backgroundColor: '#fff' },
  },
  screens: {
    home: {
      screen: Landing,
      options: {
        title: 'Home',
      },
    },
  },
});

const Navigation = createStaticNavigation(RootStack);

export default function App() {
  return <Navigation />;
}
