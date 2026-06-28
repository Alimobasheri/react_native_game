import { Component } from '@/containers/ReactNativeSkiaGameEngine/services-ecs';
import type { NearMissState } from '@/Game/feedback/nearMissDetection';
import { createDefaultNearMissState } from '@/Game/feedback/nearMissDetection';

export const GameplayFeedbackManagerComponentName = 'GameplayFeedbackManager';

export type FeedbackFlashKind = 'word' | 'bonus';

export type FeedbackFlashSlot = {
  active: boolean;
  kind: FeedbackFlashKind;
  text: string;
  startMs: number;
  anchorX: number;
  anchorY: number;
  entityId: number;
};

export type GameplayFeedbackManagerData = {
  nearMiss: NearMissState;
  slots: FeedbackFlashSlot[];
};

export const createDefaultFeedbackSlots = (
  count: number
): FeedbackFlashSlot[] => {
  'worklet';
  const slots: FeedbackFlashSlot[] = [];
  for (let i = 0; i < count; i++) {
    slots.push({
      active: false,
      kind: i < 2 ? 'word' : 'bonus',
      text: '',
      startMs: 0,
      anchorX: 0,
      anchorY: 0,
      entityId: -1,
    });
  }
  return slots;
};

export const createGameplayFeedbackManagerComponent = (
  slotCount: number = 4
): Component<GameplayFeedbackManagerData> => {
  'worklet';
  return {
    name: GameplayFeedbackManagerComponentName,
    data: {
      nearMiss: createDefaultNearMissState(),
      slots: createDefaultFeedbackSlots(slotCount),
    },
  };
};
