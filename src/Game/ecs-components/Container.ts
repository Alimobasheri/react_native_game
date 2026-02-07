import { Component } from '@/containers/ReactNativeSkiaGameEngine/services-ecs';

export const ContainerComponentName = 'Container';

export type ContainerComponentData = {
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  waterSurfaceY: number; // Current water surface Y position
  waterRiseSpeed: number; // Pixels per second
};

export const createContainerComponent = (
  data: ContainerComponentData
): Component<ContainerComponentData> => {
  'worklet';
  return {
    name: ContainerComponentName,
    data,
  };
};
