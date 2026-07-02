import type {
  FeedbackFlashKind,
  FeedbackFlashSlot,
} from '@/Game/ecs-components/GameplayFeedbackManager';
import type { SkillPraiseEvent } from '@/Game/feedback/skillFeedbackTypes';

export const findInactiveSlot = (
  slots: FeedbackFlashSlot[],
  kind: FeedbackFlashKind,
  wordSlotCount: number
): number => {
  'worklet';
  for (let i = 0; i < slots.length; i++) {
    if (slots[i].active) continue;
    const isWordSlot = i < wordSlotCount;
    if (kind === 'word' && isWordSlot) return i;
    if (kind === 'bonus' && !isWordSlot) return i;
  }
  return -1;
};

export const findActiveWordSlotByText = (
  slots: FeedbackFlashSlot[],
  text: string,
  wordSlotCount: number
): number => {
  'worklet';
  for (let i = 0; i < wordSlotCount && i < slots.length; i++) {
    const slot = slots[i];
    if (slot.active && slot.kind === 'word' && slot.text === text) {
      return i;
    }
  }
  return -1;
};

const bumpActiveWordStacks = (
  slots: FeedbackFlashSlot[],
  wordSlotCount: number
): FeedbackFlashSlot[] => {
  'worklet';
  const next = slots.slice();
  for (let i = 0; i < wordSlotCount && i < next.length; i++) {
    const slot = next[i];
    if (slot.active && slot.kind === 'word') {
      const bumped = Math.min(2, slot.stackIndex + 1);
      next[i] = { ...slot, stackIndex: bumped };
    }
  }
  return next;
};

export const activateFlashSlot = (
  slots: FeedbackFlashSlot[],
  index: number,
  kind: FeedbackFlashKind,
  text: string,
  startMs: number,
  anchorX: number,
  anchorY: number,
  stackIndex = 0
): FeedbackFlashSlot[] => {
  'worklet';
  const next = slots.slice();
  const slot = next[index];
  if (!slot) return slots;
  next[index] = {
    ...slot,
    active: true,
    kind,
    text,
    startMs,
    anchorX,
    anchorY,
    stackIndex,
  };
  return next;
};

export const emitPraiseToSlots = (
  slots: FeedbackFlashSlot[],
  events: SkillPraiseEvent[],
  bonuses: number[],
  nowMs: number,
  wordSlotCount: number
): FeedbackFlashSlot[] => {
  'worklet';
  let next = slots;
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const bonus = bonuses[i] ?? 0;
    let wordIdx = -1;
    if (event.refreshExistingTap) {
      wordIdx = findActiveWordSlotByText(next, event.copy, wordSlotCount);
    }
    if (wordIdx < 0 && event.momentId !== 'tap_coach') {
      next = bumpActiveWordStacks(next, wordSlotCount);
    }
    if (wordIdx < 0) {
      wordIdx = findInactiveSlot(next, 'word', wordSlotCount);
    }
    if (wordIdx >= 0) {
      const stackIndex = event.refreshExistingTap
        ? next[wordIdx]?.stackIndex ?? 0
        : 0;
      next = activateFlashSlot(
        next,
        wordIdx,
        'word',
        event.copy,
        nowMs,
        event.anchorX,
        event.anchorY,
        stackIndex
      );
    }
    if (bonus > 0) {
      const bonusIdx = findInactiveSlot(next, 'bonus', wordSlotCount);
      if (bonusIdx >= 0) {
        next = activateFlashSlot(
          next,
          bonusIdx,
          'bonus',
          `+${bonus}`,
          nowMs,
          event.anchorX,
          event.anchorY,
          0
        );
      }
    }
  }
  return next;
};

export const deterministicRoll01 = (seed: number): number => {
  'worklet';
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};
