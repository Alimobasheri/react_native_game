import type { ObstacleRowComponentData } from '@/Game/ecs-components/ObstacleRowComponent';

export const rowEntityBeatIndexFromRow = (
  row: ObstacleRowComponentData
): number | null => {
  'worklet';
  return row.beatRowIndex ?? null;
};
