import { Component } from '@/containers/ReactNativeSkiaGameEngine/services-ecs';
import { Entity } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/entity';

export const WaterSurfaceFoamComponentName = 'WaterSurfaceFoam';

export type WaterSurfaceFoamComponentData = {
  waterEntityId: Entity;
  foamAge: number;
  foamSeed: number;
  /** Smoothed gap span used for placement — trails target gap on row change. */
  displayStartNorm: number;
  displayEndNorm: number;
};

export const createWaterSurfaceFoamComponent = (
  data: WaterSurfaceFoamComponentData
): Component<WaterSurfaceFoamComponentData> => {
  'worklet';
  return {
    name: WaterSurfaceFoamComponentName,
    data,
  };
};
