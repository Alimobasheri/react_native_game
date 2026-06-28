import { Component } from '@/containers/ReactNativeSkiaGameEngine/services-ecs';

export const ScoreHudTagComponentName = 'ScoreHudTag';

export type ScoreHudRole =
  | 'panel'
  | 'crown'
  | 'value'
  | 'bestLabel'
  | 'bestValue'
  | 'newBest'
  | 'comboBadge';

export type ScoreHudTagComponentData = {
  role: ScoreHudRole;
  baseX: number;
  baseY: number;
  baseWidth: number;
  baseHeight: number;
  /** When true, render position uses rect center (images). */
  centerAnchored?: boolean;
};

export const createScoreHudTagComponent = (
  data: ScoreHudTagComponentData
): Component<ScoreHudTagComponentData> => {
  'worklet';
  return {
    name: ScoreHudTagComponentName,
    data,
  };
};
