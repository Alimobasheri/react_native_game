import { Component } from '@/containers/ReactNativeSkiaGameEngine/services-ecs';

export const WaterComponentName = 'Water';

export type WaterComponentData = {
  containerEntityId: number; // Reference to container entity
  baseSpeed: number;
  raisingSpeed: number; // Pixels per second - speed at which water rises
  centerRowEntity?: number;
  forceDirection?: number;
};

export const createWaterComponent = (
  data: WaterComponentData
): Component<WaterComponentData> => {
  'worklet';
  return {
    name: WaterComponentName,
    data,
  };
};
