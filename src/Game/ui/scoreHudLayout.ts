import { refRect, refSize, type SafeAreaInsets } from '@/Game/ui/refLayout';
import { SWIMMER_UI_ASPECT } from '@/assets/swimmerUi';
import { scoreHudTuning } from '@/config/scoreHudTuning';

export type ScoreHudLayoutBox = {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
};

/**
 * Reference layout on 1080×1920 — crown, huge score, BEST row on opaque dark panel.
 */
export const SCORE_HUD_REF = {
  x: 44,
  y: 44,
  stackWidth: 300,
  panelPadX: 24,
  panelPadTop: 20,
  panelPadBottom: 18,
  panelBorderRadius: 28,
  crownWidth: 72,
  crownGapBelow: 8,
  scoreHeight: 128,
  bestGapBelow: 2,
  bestRowHeight: 48,
  bestLabelWidth: 108,
  bestLabelGap: 10,
  scoreFont: 118,
  bestLabelFont: 38,
  bestValueFont: 38,
  newBestFont: 30,
  newBestOffsetY: -12,
  newBestHeight: 36,
} as const;

export type ScoreHudLayout = {
  panel: ScoreHudLayoutBox;
  crown: ScoreHudLayoutBox;
  value: ScoreHudLayoutBox;
  bestLabel: ScoreHudLayoutBox;
  bestValue: ScoreHudLayoutBox;
  newBest: ScoreHudLayoutBox;
  comboBadge: ScoreHudLayoutBox;
  comboStreakLabel: ScoreHudLayoutBox;
  borderRadius: number;
  fonts: {
    value: number;
    bestLabel: number;
    bestValue: number;
    newBest: number;
    comboBadge: number;
    comboStreakLabel: number;
  };
};

function box(
  x: number,
  y: number,
  width: number,
  height: number
): ScoreHudLayoutBox {
  'worklet';
  return {
    x,
    y,
    width,
    height,
    centerX: x + width / 2,
    centerY: y + height / 2,
  };
}

export function layoutScoreHud(
  screenW: number,
  screenH: number,
  insets: SafeAreaInsets = { top: 0, bottom: 0, left: 0, right: 0 }
): ScoreHudLayout {
  'worklet';
  const s = refSize(1, screenW, screenH);
  const outer = refRect(
    SCORE_HUD_REF.x,
    SCORE_HUD_REF.y,
    SCORE_HUD_REF.stackWidth,
    1,
    screenW,
    screenH,
    insets
  );
  const padX = refSize(SCORE_HUD_REF.panelPadX, screenW, screenH);
  const padTop = refSize(SCORE_HUD_REF.panelPadTop, screenW, screenH);
  const padBottom = refSize(SCORE_HUD_REF.panelPadBottom, screenW, screenH);
  const stackW = refSize(SCORE_HUD_REF.stackWidth, screenW, screenH);
  const left = outer.x + padX;
  let top = outer.y + padTop;

  const crownW = refSize(SCORE_HUD_REF.crownWidth, screenW, screenH);
  const crownH = crownW / SWIMMER_UI_ASPECT.iconCrownGold;

  const crown = box(left, top, crownW, crownH);
  top += crownH + SCORE_HUD_REF.crownGapBelow * s;

  const scoreH = refSize(SCORE_HUD_REF.scoreHeight, screenW, screenH);
  const value = box(left, top, stackW, scoreH);
  top += scoreH + SCORE_HUD_REF.bestGapBelow * s;

  const bestH = refSize(SCORE_HUD_REF.bestRowHeight, screenW, screenH);
  const bestLabelW = refSize(SCORE_HUD_REF.bestLabelWidth, screenW, screenH);
  const bestGap = refSize(SCORE_HUD_REF.bestLabelGap, screenW, screenH);
  const bestLabel = box(left, top, bestLabelW, bestH);
  const bestValue = box(left + bestLabelW + bestGap, top, stackW - bestLabelW - bestGap, bestH);

  const contentBottom = bestLabel.y + bestH;
  const panel = box(
    outer.x,
    outer.y,
    stackW + padX * 2,
    contentBottom - outer.y + padBottom
  );

  const newBest = box(
    left,
    crown.y + SCORE_HUD_REF.newBestOffsetY * s,
    stackW,
    refSize(SCORE_HUD_REF.newBestHeight, screenW, screenH)
  );

  const comboW = refSize(scoreHudTuning.COMBO_BADGE_WIDTH, screenW, screenH);
  const comboH = refSize(scoreHudTuning.COMBO_BADGE_HEIGHT, screenW, screenH);
  const comboGap = refSize(scoreHudTuning.COMBO_PANEL_GAP, screenW, screenH);
  const comboBadge = box(
    panel.x + panel.width + comboGap,
    value.y,
    comboW,
    comboH
  );

  const streakGap = refSize(scoreHudTuning.COMBO_STREAK_LABEL_GAP, screenW, screenH);
  const streakH = refSize(scoreHudTuning.COMBO_STREAK_LABEL_HEIGHT, screenW, screenH);
  const streakW = refSize(scoreHudTuning.COMBO_STREAK_LABEL_WIDTH, screenW, screenH);
  const comboStreakLabel = box(
    comboBadge.centerX - streakW / 2,
    comboBadge.y + comboH + streakGap,
    streakW,
    streakH
  );

  return {
    panel,
    crown,
    value,
    bestLabel,
    bestValue,
    newBest,
    comboBadge,
    comboStreakLabel,
    borderRadius: refSize(SCORE_HUD_REF.panelBorderRadius, screenW, screenH),
    fonts: {
      value: refSize(SCORE_HUD_REF.scoreFont, screenW, screenH),
      bestLabel: refSize(SCORE_HUD_REF.bestLabelFont, screenW, screenH),
      bestValue: refSize(SCORE_HUD_REF.bestValueFont, screenW, screenH),
      newBest: refSize(SCORE_HUD_REF.newBestFont, screenW, screenH),
      comboBadge: refSize(scoreHudTuning.COMBO_BADGE_FONT, screenW, screenH),
      comboStreakLabel: refSize(
        scoreHudTuning.COMBO_STREAK_LABEL_FONT,
        screenW,
        screenH
      ),
    },
  };
}
