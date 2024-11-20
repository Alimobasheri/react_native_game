import type { Meta, StoryObj } from '@storybook/react';
import { Game } from './index-rnsge';
import { View } from 'react-native';

const meta = {
  title: 'Game/Index',
  component: Game,
  args: {},
} satisfies Meta<typeof Game>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  args: {},
  decorators: [
    (Story) => {
      return (
        <View
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
        >
          <View style={{ flex: 1, width: 400, height: 100 }}>
            <Story />
          </View>
        </View>
      );
    },
  ],
};
