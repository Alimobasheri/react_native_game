import {
  Entity,
  ReactNativeSkiaGameEngine,
  useAddEntity,
} from '@/containers/ReactNativeSkiaGameEngine';
import { GameOverScene } from '.';
import type { Meta, StoryObj } from '@storybook/react';
import { Rect } from '@shopify/react-native-skia';
import { Dimensions, View } from 'react-native';
import { FC } from 'react';
import { State } from '@/Game/Entities/State/State';
import { ENTITIES_KEYS } from '@/constants/configs';
import { InitialGameState } from '@/constants/gameState';
const { width: windowWidth, height: windowHeight } = Dimensions.get('window');
const width = windowWidth * 0.8;
const height = windowHeight * 0.8;

const meta = {
  title: 'Scenes/Game Over Scene',
  component: GameOverScene,
  args: {},
} satisfies Meta<typeof GameOverScene>;

export default meta;

type Story = StoryObj<typeof meta>;

const GameStateEntity: FC<{}> = () => {
  useAddEntity(new State({ ...InitialGameState, isGameOver: true }), {
    label: ENTITIES_KEYS.STATE,
  });
  return null;
};

export const Primary: Story = {
  args: {},
  render: (args: any) => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ width, height }}>
        <ReactNativeSkiaGameEngine onEventListeners={{}}>
          <Rect x={0} y={0} width={width} height={height} color="blue" />
          <GameStateEntity />
          <GameOverScene />
        </ReactNativeSkiaGameEngine>
      </View>
    </View>
  ),
};
