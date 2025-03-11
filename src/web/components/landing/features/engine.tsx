import { View, Pressable } from 'react-native';
import { FC } from 'react';
import { MontserratText } from '@/web/components/ui/montserratText/MontserratText';
import Animated, { Easing, FadeIn, FadeInUp } from 'react-native-reanimated';
import { CodeBlock } from '../../ui/codeBlock/codeBlock';

export const engineCode = `import RNTGE from 'rntge'
                
<RNTGE>
  <Scene
  defaultSceneName="gameScene"
  isActive={true}
  >
    <Sky />
    <Sea>
      <Boat />
    </Sea>
  </Scene>
</RNTGE>`;

export const Engine: FC = () => {
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
          A Declarative Game Engine
        </MontserratText>
      </Animated.View>
      <Animated.View
        entering={FadeInUp.delay(600).duration(500)}
        className="flex flex-col items-start justify-start"
      >
        <MontserratText weight="400" className="text-2xl">
          React components are lovely. Writing games with components?
        </MontserratText>
        <MontserratText weight="400" className="text-2xl">
          That's even more lovely.
        </MontserratText>
      </Animated.View>
      <Animated.View
        entering={FadeInUp.delay(600).duration(500)}
        className="flex flex-col items-start justify-start"
      >
        <MontserratText weight="400" className="text-gray-500 text-lg">
          JSX syntax, components, contexts, hooks, and whatever that makes the
          React ecosystem great. All of these are supported, along ready-made
          components and hooks, following the best and cleanest practices.
        </MontserratText>
      </Animated.View>
    </>
  );
};
