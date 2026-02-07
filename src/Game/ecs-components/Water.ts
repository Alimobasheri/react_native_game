import { Component } from '@/containers/ReactNativeSkiaGameEngine/services-ecs';

export const WaterComponentName = 'Water';

export type WaterComponentData = {
  containerEntityId: number; // Reference to container entity
  raisingSpeed: number; // Pixels per second - speed at which water rises
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
