import { Component } from '@/containers/ReactNativeSkiaGameEngine/services-ecs';

/** Tags a full-screen cave parallax tile (render image `cave_bg`). */
export const CaveBackgroundSegmentComponentName = 'CaveBackgroundSegment';

export type CaveBackgroundSegmentComponentData = Record<string, never>;

export const createCaveBackgroundSegmentComponent = (): Component<CaveBackgroundSegmentComponentData> => {
  'worklet';
  return {
    name: CaveBackgroundSegmentComponentName,
    data: {},
  };
};
