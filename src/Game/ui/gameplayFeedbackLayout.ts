import { refSize } from '@/Game/ui/refLayout';
import { gameplayFeedbackTuning } from '@/config/gameplayFeedback';

export type GameplayFeedbackLayout = {
  fontSize: number;
  risePx: number;
  anchorAboveSwimmerPx: number;
  bonusOffsetX: number;
  bonusOffsetY: number;
  sparkRadius: number;
  flashWidth: number;
  flashHeight: number;
  stackGapPx: number;
};

export const layoutGameplayFeedback = (
  screenW: number,
  screenH: number
): GameplayFeedbackLayout => {
  'worklet';
  const fontSize = refSize(gameplayFeedbackTuning.FLASH_FONT_REF_PX, screenW, screenH);
  const risePx = refSize(gameplayFeedbackTuning.FLASH_RISE_REF_PX, screenW, screenH);
  const anchorAboveSwimmerPx = refSize(
    gameplayFeedbackTuning.ANCHOR_ABOVE_SWIMMER_REF_PX,
    screenW,
    screenH
  );
  const bonusOffsetX = refSize(
    gameplayFeedbackTuning.BONUS_OFFSET_X_REF_PX,
    screenW,
    screenH
  );
  const bonusOffsetY = refSize(
    gameplayFeedbackTuning.BONUS_OFFSET_Y_REF_PX,
    screenW,
    screenH
  );
  const stackGapPx = refSize(
    gameplayFeedbackTuning.WORD_STACK_GAP_REF_PX,
    screenW,
    screenH
  );
  return {
    fontSize,
    risePx,
    anchorAboveSwimmerPx,
    bonusOffsetX,
    bonusOffsetY,
    sparkRadius: fontSize * gameplayFeedbackTuning.SPARK_RADIUS_FONT_MULT,
    flashWidth: fontSize * 4,
    flashHeight: fontSize * 1.4,
    stackGapPx,
  };
};
