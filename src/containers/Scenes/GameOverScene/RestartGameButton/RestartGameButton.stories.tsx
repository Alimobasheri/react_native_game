import { ReactNativeSkiaGameEngine } from '@/containers/ReactNativeSkiaGameEngine';
import type { Meta, StoryObj } from '@storybook/react';
import { Rect, useFont } from '@shopify/react-native-skia';
import { Dimensions, View } from 'react-native';
import { RestartGameButton } from './RestartGameButton';
const { width: windowWidth, height: windowHeight } = Dimensions.get('window');
const width = windowWidth * 0.8;
const height = windowHeight * 0.8;

const meta: Meta<typeof RestartGameButton> = {
  title: 'Scenes/Game Over Scene/Restart Game Button',
  component: RestartGameButton,
  args: {
    x: width / 2,
    y: height - 20,
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
            <RestartGameButton {...args} />
          </ReactNativeSkiaGameEngine>
        </View>
      </View>
    );
  },
};
