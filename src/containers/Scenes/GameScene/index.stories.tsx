import { ReactNativeSkiaGameEngine } from '@/containers/ReactNativeSkiaGameEngine';
import { StartingScene } from '.';
import type { Meta, StoryObj } from '@storybook/react';
import { Rect } from '@shopify/react-native-skia';
import { Dimensions, View } from 'react-native';
const { width: windowWidth, height: windowHeight } = Dimensions.get('window');
const width = windowWidth * 0.8;
const height = windowHeight * 0.8;

const meta = {
  title: 'Scenes/Start Scene',
  component: StartingScene,
  args: {},
} satisfies Meta<typeof StartingScene>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {},
  render: (args: any) => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ width, height }}>
        <ReactNativeSkiaGameEngine onEventListeners={{}}>
          <Rect x={0} y={0} width={width} height={height} color="blue" />
          <StartingScene />
        </ReactNativeSkiaGameEngine>
      </View>
    </View>
  ),
};
