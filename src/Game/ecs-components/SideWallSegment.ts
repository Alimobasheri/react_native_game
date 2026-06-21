import { Component } from '@/containers/ReactNativeSkiaGameEngine/services-ecs';

/** Tags a vertically tiling side-wall parallax band (left + right rock strips). */
export const SideWallSegmentComponentName = 'SideWallSegment';

export type SideWallSegmentComponentData = Record<string, never>;

export const createSideWallSegmentComponent =
  (): Component<SideWallSegmentComponentData> => {
    'worklet';
    return {
      name: SideWallSegmentComponentName,
      data: {},
    };
  };
