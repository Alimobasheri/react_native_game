import type { Meta, StoryObj } from '@storybook/react';
import { Game } from './index-rnsge';

const meta = {
  title: 'Game/Index',
  component: Game,
  args: {},
} satisfies Meta<typeof Game>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  args: {},
};
