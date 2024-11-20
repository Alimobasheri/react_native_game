import { ReactNativeSkiaGameEngine } from '@/containers/ReactNativeSkiaGameEngine';
import type { Meta, StoryObj } from '@storybook/react';
import { Rect, useFont } from '@shopify/react-native-skia';
import { Dimensions, View } from 'react-native';
import { GameOverTitle } from './GameOverTitle';
const { width: windowWidth, height: windowHeight } = Dimensions.get('window');
const width = windowWidth * 0.8;
const height = windowHeight * 0.8;

const meta: Meta<typeof GameOverTitle> = {
  title: 'Scenes/Game Over Scene/Game Over Title',
  component: GameOverTitle,
  args: {
    x: width / 2,
    y: 20,
  },
  argTypes: {
    x: {
      type: 'number',
    },
    y: {
      type: 'number',
    },
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
  render: (args: any) => {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ width, height }}>
          <ReactNativeSkiaGameEngine onEventListeners={{}}>
            <Rect x={0} y={0} width={width} height={height} color="blue" />
            <GameOverTitle {...args} />
          </ReactNativeSkiaGameEngine>
        </View>
      </View>
    );
  },
};
