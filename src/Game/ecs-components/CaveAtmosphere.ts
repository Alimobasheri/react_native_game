import { Component } from '@/containers/ReactNativeSkiaGameEngine/services-ecs';

export const CaveAtmosphereComponentName = 'CaveAtmosphere';

export type CaveAtmosphereRole = 'baseGradient' | 'edgeVignette';

export type CaveAtmosphereComponentData = {
  role: CaveAtmosphereRole;
  /** Obstacle-density vignette strength (edge vignette only; set by ObstacleDensityVignetteSystem). */
  vignetteStrength?: number;
  /** Last counted on-screen blocks; vignette updates only when this changes. */
  visibleBlockCount?: number;
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
