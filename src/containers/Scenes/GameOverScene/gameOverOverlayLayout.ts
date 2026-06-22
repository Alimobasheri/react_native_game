import {
  GAMEPLAY_CHANNEL_WIDTH_FRACTION,
  SWIMMER_UI_ASPECT,
} from '@/assets/swimmerUi';
import { refSize, type SafeAreaInsets } from '@/Game/ui/refLayout';

export type LayoutBox = {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
};

export const GAME_OVER_OVERLAY_Z = {
  dim: 400,
  panel: 410,
  content: 420,
  stats: 425,
  retry: 430,
  revive: 435,
} as const;

export function textPosition(box: LayoutBox): { x: number; y: number } {
  return { x: box.x, y: box.y };
}

export function rectCenter(box: LayoutBox): { x: number; y: number } {
  return { x: box.centerX, y: box.centerY };
}

function box(x: number, y: number, width: number, height: number): LayoutBox {
  return {
    x,
    y,
    width,
    height,
    centerX: x + width / 2,
    centerY: y + height / 2,
  };
}

function layoutIconTextRow(
  button: LayoutBox,
  iconHeight: number,
  iconAspect: number,
  textWidth: number,
  textHeight: number,
  gap: number
): { icon: LayoutBox; text: LayoutBox } {
  const iconW = iconHeight * iconAspect;
  const groupW = iconW + gap + textWidth;
  const groupH = Math.max(iconHeight, textHeight);
  const groupX = button.centerX - groupW / 2;
  const groupY = button.centerY - groupH / 2;
  return {
    icon: box(
      groupX,
      groupY + (groupH - iconHeight) / 2,
      iconW,
      iconHeight
    ),
    text: box(
      groupX + iconW + gap,
      groupY + (groupH - textHeight) / 2,
      textWidth,
      textHeight
    ),
  };
}

function layoutReviveIconText(
  button: LayoutBox,
  iconHeight: number,
  iconAspect: number,
  textWidth: number,
  titleHeight: number,
  subtitleHeight: number,
  gap: number
): { icon: LayoutBox; title: LayoutBox; subtitle: LayoutBox } {
  const iconW = iconHeight * iconAspect;
  const textBlockH = titleHeight + subtitleHeight - 2;
  const groupW = iconW + gap + textWidth;
  const groupH = Math.max(iconHeight, textBlockH);
  const groupX = button.centerX - groupW / 2;
  const groupY = button.centerY - groupH / 2;
  const textX = groupX + iconW + gap;
  const textY = groupY + (groupH - textBlockH) / 2;
  return {
    icon: box(
      groupX,
      groupY + (groupH - iconHeight) / 2,
      iconW,
      iconHeight
    ),
    title: box(textX, textY, textWidth, titleHeight),
    subtitle: box(textX, textY + titleHeight - 2, textWidth, subtitleHeight),
  };
}

function buttonHeightFromWidth(width: number): number {
  'worklet';
  return width / SWIMMER_UI_ASPECT.uiBtnBlue;
}

/**
 * Tall centered modal aligned to the gameplay channel (same width as play area).
 */
export function layoutGameOverOverlay(
  screenW: number,
  screenH: number,
  insets: SafeAreaInsets
) {
  const horizontalPad = refSize(24, screenW, screenH);
  const panelWidth = Math.min(
    screenW * GAMEPLAY_CHANNEL_WIDTH_FRACTION,
    screenW - horizontalPad * 2
  );
  const panelHeight = Math.min(
    refSize(1180, screenW, screenH),
    screenH * 0.62
  );
  const panelX = (screenW - panelWidth) / 2;
  const panelY = screenH * 0.2;
  const panel = box(panelX, panelY, panelWidth, panelHeight);
  const borderRadius = refSize(48, screenW, screenH);
  const innerPadX = refSize(36, screenW, screenH);

  const title = box(
    panel.x + innerPadX,
    panel.y + refSize(40, screenW, screenH),
    panel.width - innerPadX * 2,
    refSize(88, screenW, screenH)
  );

  const subtitle = box(
    panel.x + innerPadX,
    title.y + title.height + refSize(8, screenW, screenH),
    panel.width - innerPadX * 2,
    refSize(40, screenW, screenH)
  );

  const statsY = subtitle.y + subtitle.height + refSize(28, screenW, screenH);
  const statsHeight = refSize(260, screenW, screenH);
  const statsRow = box(
    panel.x + innerPadX,
    statsY,
    panel.width - innerPadX * 2,
    statsHeight
  );

  const dividerW = refSize(4, screenW, screenH);
  const halfW = (statsRow.width - dividerW) / 2;
  const scoreColumn = box(statsRow.x, statsRow.y, halfW, statsRow.height);
  const statsDivider = box(
    statsRow.x + halfW,
    statsRow.y + refSize(16, screenW, screenH),
    dividerW,
    statsRow.height - refSize(32, screenW, screenH)
  );
  const bestColumn = box(
    statsRow.x + halfW + dividerW,
    statsRow.y,
    halfW,
    statsRow.height
  );

  const labelH = refSize(36, screenW, screenH);
  const valueH = refSize(140, screenW, screenH);
  const scoreLabel = box(
    scoreColumn.x,
    scoreColumn.y + refSize(16, screenW, screenH),
    scoreColumn.width,
    labelH
  );
  const scoreValue = box(
    scoreColumn.x,
    scoreLabel.y + labelH + refSize(4, screenW, screenH),
    scoreColumn.width,
    valueH
  );
  const bestLabel = box(
    bestColumn.x,
    bestColumn.y + refSize(16, screenW, screenH),
    bestColumn.width,
    labelH
  );
  const bestValue = box(
    bestColumn.x,
    bestLabel.y + labelH + refSize(4, screenW, screenH),
    bestColumn.width,
    valueH
  );

  const newBestTag = box(
    bestColumn.centerX - refSize(80, screenW, screenH),
    bestColumn.y - refSize(10, screenW, screenH),
    refSize(160, screenW, screenH),
    refSize(32, screenW, screenH)
  );

  const innerContentWidth = panel.width - innerPadX * 2;
  const buttonWidth = innerContentWidth * 0.76;
  const buttonX = panel.x + (panel.width - buttonWidth) / 2;
  const buttonHeight = buttonHeightFromWidth(buttonWidth);
  const buttonGap = refSize(12, screenW, screenH);
  const bottomPad = refSize(40, screenW, screenH);

  const revive = box(
    buttonX,
    panel.y + panel.height - bottomPad - buttonHeight,
    buttonWidth,
    buttonHeight
  );
  const retry = box(
    buttonX,
    revive.y - buttonGap - buttonHeight,
    buttonWidth,
    buttonHeight
  );

  const iconTextGap = refSize(14, screenW, screenH);
  const retryIconH = refSize(52, screenW, screenH);
  const retryTextH = refSize(64, screenW, screenH);
  const retryTextW = refSize(200, screenW, screenH);
  const retryContent = layoutIconTextRow(
    retry,
    retryIconH,
    SWIMMER_UI_ASPECT.retryIcon,
    retryTextW,
    retryTextH,
    iconTextGap
  );
  const retryIcon = retryContent.icon;
  const retryLabel = retryContent.text;

  const reviveIconH = refSize(48, screenW, screenH);
  const reviveTitleH = refSize(56, screenW, screenH);
  const reviveSubtitleH = refSize(32, screenW, screenH);
  const reviveTextW = refSize(280, screenW, screenH);
  const reviveContent = layoutReviveIconText(
    revive,
    reviveIconH,
    SWIMMER_UI_ASPECT.playVideoIcon,
    reviveTextW,
    reviveTitleH,
    reviveSubtitleH,
    iconTextGap
  );
  const reviveIcon = reviveContent.icon;
  const reviveTitle = reviveContent.title;
  const reviveSubtitle = reviveContent.subtitle;

  const dim = box(0, 0, screenW, screenH);

  return {
    dim,
    panel,
    borderRadius,
    title,
    subtitle,
    statsRow,
    statsDivider,
    scoreColumn,
    bestColumn,
    scoreLabel,
    scoreValue,
    bestLabel,
    bestValue,
    newBestTag,
    retry,
    retryIcon,
    retryLabel,
    revive,
    reviveIcon,
    reviveTitle,
    reviveSubtitle,
    insets,
    fonts: {
      title: refSize(76, screenW, screenH),
      subtitle: refSize(30, screenW, screenH),
      label: refSize(32, screenW, screenH),
      value: refSize(124, screenW, screenH),
      retry: refSize(64, screenW, screenH),
      reviveTitle: refSize(54, screenW, screenH),
      reviveSubtitle: refSize(26, screenW, screenH),
      newBest: refSize(24, screenW, screenH),
    },
  };
}
