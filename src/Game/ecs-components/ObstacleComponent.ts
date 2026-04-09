import { Component } from '@/containers/ReactNativeSkiaGameEngine/services-ecs';

export const ObstacleComponentName = 'Obstacle';

export enum ObstacleTypes {
  Stone = 'Stone',
}

export type ObstacleComponentData = {
  type: ObstacleTypes;
  width: number;
  height: number;
  initialPosition: { x: number; y: number };
};

export const createObstacleComponent = (
  data: ObstacleComponentData
): Component<ObstacleComponentData> => {
  'worklet';
  return {
    name: ObstacleComponentName,
    data,
  };
};