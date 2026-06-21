import { Component } from '@/containers/ReactNativeSkiaGameEngine/services-ecs';

export const CaveAtmosphereComponentName = 'CaveAtmosphere';

export type CaveAtmosphereRole = 'baseGradient' | 'edgeVignette';

export type CaveAtmosphereComponentData = {
  role: CaveAtmosphereRole;
};

export const createCaveAtmosphereComponent = (
  data: CaveAtmosphereComponentData
): Component<CaveAtmosphereComponentData> => {
  'worklet';
  return {
    name: CaveAtmosphereComponentName,
    data,
  };
};
