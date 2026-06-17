import { Component } from '@/containers/ReactNativeSkiaGameEngine/services-ecs';

export const GameOverScoreComponentName = 'GameOverScore';

export type GameOverScoreComponentData = Record<string, never>;

export const createGameOverScoreComponent =
  (): Component<GameOverScoreComponentData> => {
    'worklet';
    return {
      name: GameOverScoreComponentName,
      data: {},
    };
  };
