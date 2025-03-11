import { View, Pressable } from 'react-native';
import { FC } from 'react';
import { MontserratText } from '@/web/components/ui/montserratText/MontserratText';
import Animated, { Easing, FadeIn, FadeInUp } from 'react-native-reanimated';
import { CodeBlock } from '../../ui/codeBlock/codeBlock';

export const inputsCode = `const touchHandler = useTouchHandler();
const gesture = useMemo(
  () => ({
    gesture: Gesture.Pan()
      .onChange((event) => {
        if (!isRunning.value) return;
        prevAcceleration.value = currentAcceleration.value;
        currentAcceleration.value = event.velocityY - prevAcceleration.value;
        runOnJS(initWave)(event, currentAcceleration.value);
      })
      .onEnd((event) => {
        if (!isRunning.value) return;
        currentAcceleration.value = 0;
        runOnJS(onEnd)();
      }),
    rect: {
      x,
      y,
      width,
      height,
    },
  }),
  []
);
`;

export const Inputs: FC = () => {
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
          Handle Gestures Like A Breeze!
        </MontserratText>
      </Animated.View>
      <Animated.View
        entering={FadeInUp.delay(600).duration(500)}
        className="flex flex-col items-start justify-start"
      >
        <MontserratText weight="400" className="text-2xl">
          Respond to gestures as soon as the user touches the screen.
        </MontserratText>
        <MontserratText weight="400" className="text-2xl">
          Running on UI thread.
        </MontserratText>
      </Animated.View>
      <Animated.View
        entering={FadeInUp.delay(600).duration(500)}
        className="flex flex-col items-start justify-start"
      >
        <MontserratText weight="400" className="text-gray-500 text-lg">
          An internal TouchDOM was implemented in order to facilitate
          registering gestures and tracking them all over the canvas. Worklet
          callbacks are attached to react-native-gesture-handler Gestures, and
          shared values are used to create gesture rects and update them
          dynamically.
        </MontserratText>
      </Animated.View>
    </>
  );
};
