import { Component } from '@/containers/ReactNativeSkiaGameEngine/services-ecs';
import { Entity } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/entity';

export const ObstacleRowComponentName = 'ObstacleRow';

export type ObstacleRowComponentData = {
  y: number;
  gaps: number[];
  obstacles: Entity[];
  prevRowEntity: Entity | null;
};

export const createObstacleRowComponent = (
  data: ObstacleRowComponentData
): Component<ObstacleRowComponentData> => {
  'worklet';
  return {
    name: ObstacleRowComponentName,
    data,
  };
};
