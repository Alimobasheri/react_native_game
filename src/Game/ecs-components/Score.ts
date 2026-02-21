import { Component } from '@/containers/ReactNativeSkiaGameEngine/services-ecs';

export const ScoreComponentName = 'Score';

export type ScoreComponentData = {
  score: number;
  /** Accumulated ms toward next 30ms score tick. */
  accumulatedTime: number;
};

export const createScoreComponent = (
  data: ScoreComponentData
): Component<ScoreComponentData> => {
  'worklet';
  return {
    name: ScoreComponentName,
    data,
  };
};
