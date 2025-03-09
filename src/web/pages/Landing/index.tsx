import { View, StyleSheet, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FC, PropsWithChildren } from 'react';
import { MontserratText } from '@/web/components/ui/montserratText/MontserratText';
import { LoadGame } from 'Game/loadGame';

export const PhoneMockup: FC<PropsWithChildren> = ({ children }) => {
  return (
    <View className="relative mx-auto border-gray-800 dark:border-gray-800 bg-gray-800 border-[14px] rounded-[2.5rem] w-[600px] h-[300px]">
      <View className="w-[32px] h-[3px] bg-gray-800 dark:bg-gray-800 absolute -top-[17px] left-[72px] rounded-t-lg"></View>
      <View className="w-[46px] h-[3px] bg-gray-800 dark:bg-gray-800 absolute -top-[17px] left-[124px] rounded-t-lg"></View>
      <View className="w-[46px] h-[3px] bg-gray-800 dark:bg-gray-800 absolute -top-[17px] left-[178px] rounded-t-lg"></View>
      <View className="w-[64px] h-[3px] bg-gray-800 dark:bg-gray-800 absolute -bottom-[17px] left-[142px] rounded-b-lg"></View>
      <View className="rounded-[2rem] overflow-hidden h-[272px] w-[572px] bg-white dark:bg-gray-800">
        {children}
      </View>
    </View>
  );
};

export const Landing: FC = () => {
  return (
    <View style={[styles.container]}>
      <View className="flex-1">
        <View className="flex-1 p-10 flex-row items-center justify-between">
          <View className="flex-1 flex-col w-full h-full justify-center gap-12">
            <View className="flex flex-col justify-between items-start gap-8">
              <View className="flex-1 flex-col items-center justify-center">
                <MontserratText
                  weight="700"
                  className="text-8xl font-black font-montserrat-bold text-black"
                >
                  Waves Crash
                </MontserratText>
              </View>
              <View className="flex flex-col items-start justify-start">
                <MontserratText weight="400" className="text-3xl">
                  A Game Fully Developed in React Native
                </MontserratText>
                <MontserratText weight="400" className="text-3xl">
                  For Web, Android & iOS
                </MontserratText>
                <MontserratText
                  weight="300"
                  className="text-2xl text-gray-500 mt-2"
                >
                  Introducing The Most Capable React-Native Game Engine
                </MontserratText>
              </View>
            </View>
            <View className="flex flex-row justify-start items-center gap-5">
              <View>
                <MontserratText weight="300" className="text-xl">
                  |
                </MontserratText>
              </View>
              <Pressable className="cursor-pointer">
                <MontserratText
                  weight="300"
                  className="text-xl hover:text-blue-500"
                >
                  Download For Android (.apk)
                </MontserratText>
              </Pressable>
            </View>
          </View>
          <View className="flex-1">
            <PhoneMockup>
              <LoadGame />
            </PhoneMockup>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
