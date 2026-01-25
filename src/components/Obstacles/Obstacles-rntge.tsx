import { useAddSystem } from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs';
import { obstaclesSystem } from '@/systems/ObstaclesSystem/ObstaclesSystems';
import { FC } from 'react';

export const Obstacles: FC<{}> = () => {
  useAddSystem({ system: obstaclesSystem });
  return null;
};
