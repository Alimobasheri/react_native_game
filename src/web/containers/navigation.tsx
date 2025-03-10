import * as React from 'react';
import { createStaticNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Landing } from '../pages/Landing';
import { Header } from '../components/navigation/header';

const RootStack = createNativeStackNavigator({
  initialRouteName: 'home',
  screenOptions: {
    header: Header,
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
