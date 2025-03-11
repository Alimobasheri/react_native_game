import { View, Pressable, useWindowDimensions } from 'react-native';
import { FC, useMemo } from 'react';
import { MontserratText } from '@/web/components/ui/montserratText/MontserratText';
import Animated, {
  Easing,
  FadeIn,
  FadeInUp,
  measure,
  SharedValue,
  useAnimatedRef,
  useAnimatedStyle,
} from 'react-native-reanimated';

export type IntroductionProps = {
  mouseX: SharedValue<number>;
  mouseY: SharedValue<number>;
};

export type WaveCharAnimateProps = {
  char: string;
  index: number;
  mouseX: SharedValue<number>;
  mouseY: SharedValue<number>;
};

export const WaveCharAnimate: FC<WaveCharAnimateProps> = ({
  char,
  index,
  mouseX,
  mouseY,
}) => {
  const { height, width } = useWindowDimensions();
  const wavyStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY:
            Math.sin((height / 2 - mouseY.value) * 0.01) *
            (index % 2 === 0 ? -1 : 1) *
            10,
        },
        {
          translateX:
            Math.cos((width / 2 - mouseX.value) * 0.01) *
            (index % 2 === 0 ? -1 : 1) *
            5,
        },
        {
          rotateY: `${(height / 2 - mouseY.value) * 0.05}deg`,
        },
        {
          rotateX: `${(width / 2 - mouseX.value) * 0.05}deg`,
        },
        {
          perspective: 1000,
        },
      ],
    };
  });
  return (
    <Animated.View style={wavyStyle}>
      <MontserratText
        weight="700"
        className="text-8xl font-black font-montserrat-bold text-white mix-blend-exclusion drop-shadow-md"
      >
        {char}
      </MontserratText>
    </Animated.View>
  );
};

export type WaveTextAniamteProps = {
  text: string;
  mouseX: SharedValue<number>;
  mouseY: SharedValue<number>;
};

export const WaveTextAnimate: FC<WaveTextAniamteProps> = ({
  text,
  mouseX,
  mouseY,
}) => {
  const chars = useMemo(() => text.split(''), [text]);

  return (
    <View className="flex-row">
      {chars.map((char, index) => (
        <WaveCharAnimate
          key={index}
          char={char}
          index={index}
          mouseX={mouseX}
          mouseY={mouseY}
        />
      ))}
    </View>
  );
};

export const Introduction: FC<IntroductionProps> = ({ mouseX, mouseY }) => {
  return (
    <>
      <Animated.View
        entering={FadeInUp.easing(Easing.in(Easing.ease)).duration(500)}
        className="flex-col items-center justify-center bg-wave"
      >
        <WaveTextAnimate text="Waves Crash" mouseX={mouseX} mouseY={mouseY} />
      </Animated.View>
      <Animated.View
        entering={FadeInUp.delay(600).duration(500)}
        className="flex flex-col items-center justify-start"
      >
        <MontserratText weight="400" className="text-3xl text-white">
          A Game Fully Developed in React Native
        </MontserratText>
        <MontserratText weight="400" className="text-3xl text-white">
          For Web, Android & iOS
        </MontserratText>
        {/* <MontserratText weight="300" className="text-2xl text-gray-800 mt-2">
          Introducing The Most Capable React-Native Game Engine
        </MontserratText> */}
      </Animated.View>
      {/* <Animated.View
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
      </Animated.View> */}
    </>
  );
};
