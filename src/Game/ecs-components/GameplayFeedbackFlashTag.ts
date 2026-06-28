import { Component } from '@/containers/ReactNativeSkiaGameEngine/services-ecs';
import type { FeedbackFlashKind } from '@/Game/ecs-components/GameplayFeedbackManager';

export const GameplayFeedbackFlashTagComponentName = 'GameplayFeedbackFlashTag';

export type GameplayFeedbackFlashTagData = {
  slotIndex: number;
  role: FeedbackFlashKind;
  baseWidth: number;
  baseHeight: number;
};

export const createGameplayFeedbackFlashTagComponent = (
  data: GameplayFeedbackFlashTagData
): Component<GameplayFeedbackFlashTagData> => {
  'worklet';
  return {
    name: GameplayFeedbackFlashTagComponentName,
    data,
  };
};
