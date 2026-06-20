import { Component } from '@/containers/ReactNativeSkiaGameEngine/services-ecs';

export const StartOverlayTagComponentName = 'StartOverlayTag';

export type StartOverlayRole =
  | 'titleLogo'
  | 'bestScorePanel'
  | 'bestScoreCrown'
  | 'bestScoreLabel'
  | 'bestScoreValue'
  | 'shopPanel'
  | 'shop'
  | 'tutorialLabel'
  | 'tapCursor'
  | 'cta'
  | 'ctaLabel';

export type StartOverlayTagComponentData = {
  role: StartOverlayRole;
  baseX: number;
  baseY: number;
  baseWidth: number;
  baseHeight: number;
};

export const createStartOverlayTagComponent = (
  data: StartOverlayTagComponentData
): Component<StartOverlayTagComponentData> => {
  'worklet';
  return {
    name: StartOverlayTagComponentName,
    data,
  };
};
