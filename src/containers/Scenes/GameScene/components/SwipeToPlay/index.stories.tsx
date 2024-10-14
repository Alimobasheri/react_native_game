import { ReactNativeSkiaGameEngine } from '@/containers/ReactNativeSkiaGameEngine';
import type { Meta, StoryObj } from '@storybook/react';
import { Rect, useFont } from '@shopify/react-native-skia';
import { Dimensions, View } from 'react-native';
import { SwipeToPlay } from '.';
const { width: windowWidth, height: windowHeight } = Dimensions.get('window');
const width = windowWidth * 0.8;
const height = windowHeight * 0.8;

const meta = {
  title: 'Scenes/Start Scene/Swipe To Play',
  component: SwipeToPlay,
  args: {
    text: 'SWIPE UP TO START',
    x: 100,
    y: 100,
    width: 500,
    height: 300,
    amplitude: 3,
    frequency: 0.05,
    color: 'white',
  },
  argTypes: {
    text: 'string',
    x: 'number',
    y: 'number',
    width: 'number',
    height: 'number',
    amplitude: 'number',
    frequency: 'number',
    color: {
      control: {
        type: 'color',
      },
    },
  },
} satisfies Meta<typeof SwipeToPlay>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
  render: (args: any) => {
    const font = useFont(
      require('../../../../../../assets/fonts/Montserrat-SemiBold.ttf'),
      16
    );
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ width, height }}>
          <ReactNativeSkiaGameEngine onEventListeners={{}}>
            <Rect x={0} y={0} width={width} height={height} color="blue" />
            <SwipeToPlay {...args} font={font} />
          </ReactNativeSkiaGameEngine>
        </View>
      </View>
    );
  },
};
