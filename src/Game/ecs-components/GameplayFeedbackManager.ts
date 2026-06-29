import { Component } from '@/containers/ReactNativeSkiaGameEngine/services-ecs';
import {
  createDefaultSkillFeedbackState,
  type SkillFeedbackState,
} from '@/Game/feedback/skillFeedbackTypes';
import { gameplayFeedbackTuning } from '@/config/gameplayFeedback';

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
  skillFeedback: SkillFeedbackState;
  slots: FeedbackFlashSlot[];
};

export const createDefaultFeedbackSlots = (
  count: number
): FeedbackFlashSlot[] => {
  'worklet';
  const wordCount = gameplayFeedbackTuning.WORD_SLOT_COUNT;
  const slots: FeedbackFlashSlot[] = [];
  for (let i = 0; i < count; i++) {
    slots.push({
      active: false,
      kind: i < wordCount ? 'word' : 'bonus',
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
  slotCount: number = gameplayFeedbackTuning.FLASH_POOL_SIZE
): Component<GameplayFeedbackManagerData> => {
  'worklet';
  return {
    name: GameplayFeedbackManagerComponentName,
    data: {
      skillFeedback: createDefaultSkillFeedbackState(),
      slots: createDefaultFeedbackSlots(slotCount),
    },
  };
};
