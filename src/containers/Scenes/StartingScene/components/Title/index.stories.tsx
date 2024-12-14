import { ReactNativeSkiaGameEngine } from '@/containers/ReactNativeSkiaGameEngine';
import type { Meta, StoryObj } from '@storybook/react';
import { Rect, useFont } from '@shopify/react-native-skia';
import { Dimensions, View } from 'react-native';
import { Title } from '.';
const { width: windowWidth, height: windowHeight } = Dimensions.get('window');
const width = windowWidth * 0.8;
const height = windowHeight * 0.8;

const titleWidth = Math.min(windowWidth * 0.2, 100);

const meta = {
  title: 'Scenes/Start Scene/Game Title',
  component: Title,
  args: {
    x: width / 2 - titleWidth / 2,
    y: 20,
    width: titleWidth,
    height: titleWidth * 0.5,
  },
  argTypes: {
    x: {
      type: 'number',
    },
    y: {
      type: 'number',
    },
    width: {
      control: {
        type: 'range',
        min: 0,
        max: windowWidth,
        step: 1,
      },
    },
    height: {
      control: {
        type: 'range',
        min: 0,
        max: windowHeight,
        step: 1,
      },
    },
  },
} satisfies Meta<typeof Title>;

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
            <Title {...args} />
          </ReactNativeSkiaGameEngine>
        </View>
      </View>
    );
  },
};
