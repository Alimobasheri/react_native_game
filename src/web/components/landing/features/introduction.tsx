import { View, Pressable } from 'react-native';
import { FC } from 'react';
import { MontserratText } from '@/web/components/ui/montserratText/MontserratText';
import Animated, { Easing, FadeIn, FadeInUp } from 'react-native-reanimated';

export const Introduction: FC = () => {
  return (
    <>
      <Animated.View
        entering={FadeInUp.easing(Easing.in(Easing.ease)).duration(500)}
        className="flex-1 flex-col items-center justify-center"
      >
        <MontserratText
          weight="700"
          className="text-8xl font-black font-montserrat-bold text-black"
        >
          Waves Crash
        </MontserratText>
      </Animated.View>
      <Animated.View
        entering={FadeInUp.delay(600).duration(500)}
        className="flex flex-col items-start justify-start"
      >
        <MontserratText weight="400" className="text-3xl">
          A Game Fully Developed in React Native
        </MontserratText>
        <MontserratText weight="400" className="text-3xl">
          For Web, Android & iOS
        </MontserratText>
        <MontserratText weight="300" className="text-2xl text-gray-500 mt-2">
          Introducing The Most Capable React-Native Game Engine
        </MontserratText>
      </Animated.View>
      <Animated.View
        entering={FadeIn.delay(1000).duration(500)}
        className="flex flex-row justify-start items-center gap-5"
      >
        <View>
          <MontserratText weight="300" className="text-xl">
            |
          </MontserratText>
        </View>
        <Pressable className="cursor-pointer">
          <MontserratText weight="300" className="text-xl hover:text-blue-500">
            Download For Android (.apk)
          </MontserratText>
        </Pressable>
      </Animated.View>
    </>
  );
};
