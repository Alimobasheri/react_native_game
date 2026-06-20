import {
  GAMEPLAY_CHANNEL_WIDTH_FRACTION,
  SWIMMER_UI_ASPECT,
  SWIMMER_UI_REF,
  TAP_CURSOR_SPRITE,
} from '@/assets/swimmerUi';
import { refSize, type SafeAreaInsets } from '@/Game/ui/refLayout';
import { getTapCursorChannelPositions } from '@/Game/ui/tapCursorChannelPositions';

export type LayoutBox = {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
};

export const OVERLAY_Z = {
  chip: 120,
  title: 130,
  tutorial: 140,
  cta: 300,
  shop: 250,
} as const;

/** RNTGE text paints from the entity origin — use top-left of the layout box. */
export function textPosition(box: LayoutBox): { x: number; y: number } {
  return { x: box.x, y: box.y };
}

/** Solid rects and images are drawn centered on position in RNTGE. */
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

function refSquareChip(
  refSizePx: number,
  refX: number,
  refY: number,
  screenW: number,
  screenH: number,
  insets: SafeAreaInsets,
  alignRight = false
): LayoutBox {
  const width = refSize(refSizePx, screenW, screenH);
  const height = width / SWIMMER_UI_ASPECT.uiChipPanel;
  const x = alignRight
    ? screenW - insets.right - refSize(refX, screenW, screenH) - width
    : insets.left + refSize(refX, screenW, screenH);
  const y = insets.top + refSize(refY, screenW, screenH);
  return box(x, y, width, height);
}

export function layoutStartOverlay(
  screenW: number,
  screenH: number,
  insets: SafeAreaInsets
) {
  const best = refSquareChip(
    SWIMMER_UI_REF.chipSize,
    SWIMMER_UI_REF.chipInsetX,
    SWIMMER_UI_REF.chipTop,
    screenW,
    screenH,
    insets,
    false
  );

  const shop = refSquareChip(
    SWIMMER_UI_REF.chipSize,
    SWIMMER_UI_REF.chipInsetX,
    SWIMMER_UI_REF.chipTop,
    screenW,
    screenH,
    insets,
    true
  );

  const title = (() => {
    const width = screenW * GAMEPLAY_CHANNEL_WIDTH_FRACTION;
    const height = width / SWIMMER_UI_ASPECT.titleFloodRush;
    const x = (screenW - width) / 2;
    const chipRowBottom = Math.max(
      best.y + best.height,
      shop.y + shop.height
    );
    const y =
      chipRowBottom +
      refSize(SWIMMER_UI_REF.titleGapBelowChip, screenW, screenH);
    return box(x, y, width, height);
  })();

  const cta = (() => {
    const width = refSize(SWIMMER_UI_REF.ctaWidth, screenW, screenH);
    const height = width / SWIMMER_UI_ASPECT.uiBtnStartGreen;
    const x = (screenW - width) / 2;
    const y =
      screenH -
      insets.bottom -
      refSize(SWIMMER_UI_REF.ctaBottom, screenW, screenH) -
      height;
    return box(x, y, width, height);
  })();

  const tutorial = (() => {
    const { tapLeftX, tapRightX } = getTapCursorChannelPositions(
      screenW,
      screenH
    );
    const cursorW = refSize(
      SWIMMER_UI_REF.tapCursorDisplayWidth,
      screenW,
      screenH
    );
    const cursorH = cursorW / TAP_CURSOR_SPRITE.frameAspect;
    const textH = refSize(
      SWIMMER_UI_REF.tutorialTextHeight,
      screenW,
      screenH
    );
    const rowH = Math.max(textH, cursorH);
    const rowY =
      cta.y -
      refSize(SWIMMER_UI_REF.tutorialGapAboveCta, screenW, screenH) -
      rowH;
    const textW = Math.max(0, tapRightX - tapLeftX - cursorW);
    const textX = (tapLeftX + tapRightX) / 2 - textW / 2;
    const text = box(textX, rowY + (rowH - textH) / 2, textW, textH);
    const cursor = box(
      tapLeftX - cursorW / 2,
      rowY + (rowH - cursorH) / 2,
      cursorW,
      cursorH
    );
    return { text, cursor };
  })();

  const crownWidth = best.width * 0.38;
  const crownHeight = crownWidth / SWIMMER_UI_ASPECT.iconCrownGold;
  const crown = box(
    best.centerX - crownWidth / 2,
    best.y + best.height * 0.1,
    crownWidth,
    crownHeight
  );

  const bestLabelHeight = refSize(22, screenW, screenH);
  const bestLabel = box(
    best.x,
    best.y + best.height * 0.38,
    best.width,
    bestLabelHeight
  );

  const bestScoreHeight = refSize(36, screenW, screenH);
  const bestScore = box(
    best.x,
    best.y + best.height * 0.58,
    best.width,
    bestScoreHeight
  );

  const shopIconWidth = shop.width * 0.72;
  const shopIconHeight = shopIconWidth / SWIMMER_UI_ASPECT.iconShopCart;
  const shopIcon = box(
    shop.centerX - shopIconWidth / 2,
    shop.centerY - shopIconHeight / 2,
    shopIconWidth,
    shopIconHeight
  );

  const ctaLabelHeight = refSize(34, screenW, screenH);
  const ctaLabel = box(
    cta.x,
    cta.y + (cta.height - ctaLabelHeight) / 2,
    cta.width,
    ctaLabelHeight
  );

  return {
    title,
    best,
    shop,
    crown,
    bestLabel,
    bestScore,
    shopIcon,
    tutorialText: tutorial.text,
    tapCursor: tutorial.cursor,
    cta,
    ctaLabel,
  };
}
