import { refSize } from '@/Game/ui/refLayout';
import { stageOverlayTuning } from '@/config/stageOverlayTuning';

export type StageOverlayLayout = {
  centerX: number;
  centerY: number;
  doneX: number;
  doneY: number;
  hudX: number;
  hudY: number;
  centerTextWidth: number;
  introFontSize: number;
  doneFontSize: number;
  nextFontSize: number;
  persistentFontSize: number;
};

export const layoutStageOverlay = (
  screenW: number,
  screenH: number,
  safeTopPx: number
): StageOverlayLayout => {
  'worklet';
  return {
    centerX: screenW * 0.5,
    centerY: screenH * 0.42,
    doneX: screenW * 0.5,
    doneY: safeTopPx + refSize(stageOverlayTuning.DONE_TOP_REF_PX, screenW, screenH),
    hudX: screenW * 0.5,
    hudY: safeTopPx + refSize(stageOverlayTuning.PERSISTENT_TOP_REF_PX, screenW, screenH),
    centerTextWidth: refSize(
      stageOverlayTuning.CENTER_TEXT_MAX_WIDTH_REF_PX,
      screenW,
      screenH
    ),
    introFontSize: refSize(stageOverlayTuning.INTRO_FONT_REF_PX, screenW, screenH),
    doneFontSize: refSize(stageOverlayTuning.DONE_FONT_REF_PX, screenW, screenH),
    nextFontSize: refSize(stageOverlayTuning.NEXT_FONT_REF_PX, screenW, screenH),
    persistentFontSize: refSize(
      stageOverlayTuning.PERSISTENT_FONT_REF_PX,
      screenW,
      screenH
    ),
  };
};
