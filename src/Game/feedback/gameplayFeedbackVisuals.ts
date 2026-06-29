import { COLOR_CAVE_DEEP, COLOR_REWARD_YELLOW, COLOR_TEXT_WHITE } from '@/Game/ui/swimmerTheme';

export const GAMEPLAY_FLASH_COLORS = {
  fill: COLOR_TEXT_WHITE,
  stroke: COLOR_CAVE_DEEP,
  bonusFill: COLOR_REWARD_YELLOW,
  sparkFill: 'rgba(255, 212, 59, 0.55)',
  sparkStroke: COLOR_REWARD_YELLOW,
} as const;
