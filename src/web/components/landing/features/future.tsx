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

export const Future: FC = () => {
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
          This Is Not All Of It!
        </MontserratText>
      </Animated.View>
      <Animated.View
        entering={FadeInUp.delay(600).duration(500)}
        className="flex flex-col items-start justify-start"
      >
        <MontserratText weight="400" className="text-2xl">
          Waves Crash is just an experiment by me.
        </MontserratText>
        <MontserratText weight="400" className="text-2xl">
          To push the boundareis of my knowledge and skills.
        </MontserratText>
      </Animated.View>
      <Animated.View
        entering={FadeInUp.delay(600).duration(500)}
        className="flex flex-col items-start justify-start gap-4"
      >
        <MontserratText weight="400" className="text-gray-700 text-lg">
          There have been great advances in React Native libraries in recent
          years. Many things are possible to do with react-native. Creating
          games, is an elite version of it. In the asynchronous world of react,
          writing games that can run synchronously and on the UI thread is now a
          possibility.
        </MontserratText>
        <MontserratText weight="400" className="text-gray-700 text-lg">
          The current engine version is still in progress. It can have memory
          issues, it can have physics performance bottlenecks, and events are
          not processed synchronously.
        </MontserratText>
        <MontserratText weight="400" className="text-gray-700 text-lg">
          I'm doing a full re-write of the engine, progress visible in this{' '}
          <MontserratText
            weight="400"
            className="text-gray-700 text-lg border-b-2 border-gray-700 hover:text-blue-500 hover:border-blue-500"
            href="https://github.com/Alimobasheri/react_native_game/tree/38-refactor-systems-to-use-fully-workletized-functions"
          >
            branch
          </MontserratText>
          .
        </MontserratText>
      </Animated.View>
    </>
  );
};
