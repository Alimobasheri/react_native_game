import { refRect, refSize, type SafeAreaInsets } from '@/Game/ui/refLayout';
import { SWIMMER_UI_ASPECT } from '@/assets/swimmerUi';

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
  comboBadgeWidth: 72,
  comboBadgeHeight: 40,
  comboBadgeFont: 34,
  comboBadgeOffsetX: -8,
  comboBadgeOffsetY: 4,
} as const;

export type ScoreHudLayout = {
  panel: ScoreHudLayoutBox;
  crown: ScoreHudLayoutBox;
  value: ScoreHudLayoutBox;
  bestLabel: ScoreHudLayoutBox;
  bestValue: ScoreHudLayoutBox;
  newBest: ScoreHudLayoutBox;
  comboBadge: ScoreHudLayoutBox;
  borderRadius: number;
  fonts: {
    value: number;
    bestLabel: number;
    bestValue: number;
    newBest: number;
    comboBadge: number;
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

  const comboW = refSize(SCORE_HUD_REF.comboBadgeWidth, screenW, screenH);
  const comboH = refSize(SCORE_HUD_REF.comboBadgeHeight, screenW, screenH);
  const comboBadge = box(
    value.x + value.width - comboW + SCORE_HUD_REF.comboBadgeOffsetX * s,
    value.y + SCORE_HUD_REF.comboBadgeOffsetY * s,
    comboW,
    comboH
  );

  return {
    panel,
    crown,
    value,
    bestLabel,
    bestValue,
    newBest,
    comboBadge,
    borderRadius: refSize(SCORE_HUD_REF.panelBorderRadius, screenW, screenH),
    fonts: {
      value: refSize(SCORE_HUD_REF.scoreFont, screenW, screenH),
      bestLabel: refSize(SCORE_HUD_REF.bestLabelFont, screenW, screenH),
      bestValue: refSize(SCORE_HUD_REF.bestValueFont, screenW, screenH),
      newBest: refSize(SCORE_HUD_REF.newBestFont, screenW, screenH),
      comboBadge: refSize(SCORE_HUD_REF.comboBadgeFont, screenW, screenH),
    },
  };
}
