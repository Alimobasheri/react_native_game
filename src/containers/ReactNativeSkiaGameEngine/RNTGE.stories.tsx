import { Meta, StoryObj } from '@storybook/react/*';
import { ReactNativeTurboGameEngine } from './RNTGE';
import { Dimensions, View } from 'react-native';
import { MemoizedContainer } from './components/MemoizedContainer';
import { ShipView } from '@/components/ShipView/ShipView-rntge';
import { SkyBackground } from '@/components/SkyBackground/SkyBackground-rntge';
import { StarsView } from '@/components/StarsView/StarsView-rntge/StarsView-rntge';
import { ship, star } from '../../assets/images';

const meta = {
  title: 'React Native Turbo Game Engine',
  component: ReactNativeTurboGameEngine,
  args: {},
} satisfies Meta<typeof ReactNativeTurboGameEngine>;

export default meta;

type Story = StoryObj<typeof meta>;

const { width: windowWidth } = Dimensions.get('window');

export const Basic: Story = {
  args: { componentNames: ['star'], images: { ship: ship, star: star } },
  render: (args: any) => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ flex: 1, width: '100%', height: '100%' }}>
        <ReactNativeTurboGameEngine {...args}>
          <SkyBackground />
          <StarsView />
          <ShipView x={windowWidth / 2} />
        </ReactNativeTurboGameEngine>
      </View>
    </View>
  ),
};
