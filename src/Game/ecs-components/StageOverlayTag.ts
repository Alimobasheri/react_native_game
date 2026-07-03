import { Component } from '@/containers/ReactNativeSkiaGameEngine/services-ecs';

export const StageOverlayTagComponentName = 'StageOverlayTag';

export type StageOverlayRole = 'center' | 'topDone' | 'persistentHud';

export type StageOverlayTagComponentData = {
  role: StageOverlayRole;
  baseX: number;
  baseY: number;
};

export const createStageOverlayTagComponent = (
  data: StageOverlayTagComponentData
): Component<StageOverlayTagComponentData> => {
  'worklet';
  return {
    name: StageOverlayTagComponentName,
    data,
  };
};
