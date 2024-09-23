import type { Meta, StoryObj } from '@storybook/react';
import { ReactNativeSkiaGameEngine } from './RNSGE';
import { Text, View } from 'react-native';
import { FC, useCallback, useEffect, useRef } from 'react';
import { useAddEntity } from './hooks/useAddEntity';
import Animated, { runOnUI, useAnimatedStyle } from 'react-native-reanimated';
import { useEntityValue } from './hooks/useEntityValue';
import { useSystem } from './hooks/useSystem';
import { Entities } from './services/Entities';
import { SeaGroup } from '@/components/SeaGroupRenderer/SeaGroup-rnsge';
import { useReRenderCount } from '@/hooks/useReRenderCount';
import { Canvas } from '@shopify/react-native-skia';
import { SkyBackground } from '@/components/SkyBackground';
import { StarsView } from '@/components/StarsView/StarsView-rnsge';
import { Physics } from '@/components/Physics';
import { Swipe } from '@/components/Swipe';
import { Collisions } from '@/components/Collisions';
import { StateEntity } from '@/components/State';
import { StartingScene } from '../Scenes/GameScene';

const SubComponent: FC<{}> = (props) => {
  const renderCount = useReRenderCount();
  console.log(`rendered subComponent1 for ${renderCount.current} times`);
  return <Text>Sub Component 1</Text>;
};

const SubComponentTwo: FC<{}> = (props) => {
  const renderCount = useReRenderCount();
  const entity = useAddEntity({ translateX: -10 });
  const translateX = useEntityValue<{ translateX: number }, number>(
    entity.id,
    'translateX'
  );
  console.log(`rendered subComponent2 for ${renderCount.current} times`);

  const updateTranslateX = useCallback((entities: Entities['entities']) => {
    'worklet';
    const target = entities.get(entity.id);
    if (target) {
      if (target.data.translateX < 200) target.data.translateX += 1;
    }
  }, []);
  useSystem((entities) => {
    updateTranslateX(entities);
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value ? translateX.value : 0 }],
    };
  }, [translateX.value]);
  return (
    <Animated.View style={animatedStyle}>
      <Text>Sub Component 2</Text>
    </Animated.View>
  );
};

const meta = {
  title: 'React Native Skia Game Engine',
  component: ReactNativeSkiaGameEngine,
  args: {},
} satisfies Meta<typeof ReactNativeSkiaGameEngine>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  args: {},
  render: (args: any) => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ flex: 1, width: '100%', height: '100%' }}>
        <ReactNativeSkiaGameEngine {...args}>
          <StateEntity isRunning={false} />
          <SkyBackground />
          <StarsView />
          <SeaGroup />
          <Physics />
          <Collisions />
          <Swipe />
          <StartingScene />
        </ReactNativeSkiaGameEngine>
      </View>
    </View>
  ),
};
