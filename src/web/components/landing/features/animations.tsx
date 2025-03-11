import { View, Pressable } from 'react-native';
import { FC } from 'react';
import { MontserratText } from '@/web/components/ui/montserratText/MontserratText';
import Animated, { Easing, FadeIn, FadeInUp } from 'react-native-reanimated';
import { CodeBlock } from '../../ui/codeBlock/codeBlock';

export const animationsCode = `const position = useSharedValue(0);
const { registerAnimation, remove } = useCreateAnimation({
    sharedValue: position,
    animation: {
      update: (currentTime, sharedValue, progress, isBackward, onAnimate) => {
        'worklet';
        sharedValue.value = progress;
        if (progress >= 1) runOnJS(onAnimate)(true);
      },
    },
    config: {
      duration: 500,
      loop: -1,
      loopInterval: 1000,
    },
  });

useEffect(() => {
  registerAnimation({ isRunning: true });

  return () => {
    remove();
  };
}, []);
`;

export const Animations: FC = () => {
  return (
    <>
      <Animated.View
        entering={FadeInUp.easing(Easing.in(Easing.ease)).duration(500)}
        className="flex-col items-center justify-center"
      >
        <MontserratText
          weight="700"
          className="text-5xl font-black font-montserrat-bold text-black"
        >
          Powerful Animations System
        </MontserratText>
      </Animated.View>
      <Animated.View
        entering={FadeInUp.delay(600).duration(500)}
        className="flex flex-col items-start justify-start"
      >
        <MontserratText weight="400" className="text-2xl">
          Use Shared Values, Animate them however you like.
        </MontserratText>
        <MontserratText weight="400" className="text-2xl">
          And never lose a frame.
        </MontserratText>
      </Animated.View>
      <Animated.View
        entering={FadeInUp.delay(600).duration(500)}
        className="flex flex-col items-start justify-start"
      >
        <MontserratText weight="400" className="text-gray-500 text-lg">
          With the help of the inner Game Loop, you can add animations, attach
          them to your entities, and control them with helper hooks and
          functions. Fully leveraged to utilize latest react-native-reanimated
          v3 features, all animations run directly on UI thread.
        </MontserratText>
      </Animated.View>
    </>
  );
};
