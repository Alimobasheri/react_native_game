import { Meta, StoryObj } from '@storybook/react/*';
import { ReactNativeTurboGameEngine } from './RNTGE';
import { View } from 'react-native';
import { MemoizedContainer } from './components/MemoizedContainer';
import { ShipView } from '@/components/ShipView/ShipView-rntge';

const meta = {
  title: 'React Native Turbo Game Engine',
  component: ReactNativeTurboGameEngine,
  args: {},
} satisfies Meta<typeof ReactNativeTurboGameEngine>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  args: {},
  render: (args: any) => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ flex: 1, width: '100%', height: '100%' }}>
        <ReactNativeTurboGameEngine {...args}>
          <ShipView />
        </ReactNativeTurboGameEngine>
      </View>
    </View>
  ),
};
