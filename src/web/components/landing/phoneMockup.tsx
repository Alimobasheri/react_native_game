import { FC, PropsWithChildren, useMemo } from 'react';
import { View } from 'react-native';

export const PhoneMockup: FC<PropsWithChildren> = ({ children }) => {
  return (
    <View className="relative mx-auto border-gray-800 dark:border-gray-800 bg-gray-800 border-[14px] rounded-[2.5rem] w-[600px] h-[300px] z-4">
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
