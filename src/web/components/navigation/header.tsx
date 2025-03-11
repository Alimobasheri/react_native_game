import { NativeStackHeaderProps } from '@react-navigation/native-stack';
import { FC } from 'react';
import { View } from 'react-native';
import { MontserratText } from '../ui/montserratText/MontserratText';
import { Link } from '@react-navigation/native';

export const Header: FC<NativeStackHeaderProps> = (props) => {
  return (
    <View
      className={
        'w-full h-[40px] flex-row justify-between items-center p-8 bg-transparent'
      }
    >
      <View className="flex-col jusity-center items-center">
        <MontserratText weight="600" className="text-xl text-blue-500">
          Waves Crash
        </MontserratText>
      </View>
      <View className="flex flex-row justify-end items-center gap-8">
        <Link screen={'about-me'}>
          <MontserratText
            weight="400"
            className={`text-xl hover:text-blue-500 ${
              props.route.path === '/about-me' ? 'text-blue-500' : 'text-black'
            }`}
          >
            About Me
          </MontserratText>
        </Link>
        <Link screen={'expo'}>
          <MontserratText
            weight="400"
            className={`text-xl hover:text-blue-500 ${
              props.route.path === '/about-me' ? 'text-blue-500' : 'text-black'
            }`}
          >
            Expo
          </MontserratText>
        </Link>
      </View>
    </View>
  );
};
