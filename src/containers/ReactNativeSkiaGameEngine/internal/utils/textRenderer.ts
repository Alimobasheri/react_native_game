import {
  Skia,
  SkParagraphStyle,
  SkTextStyle,
  SkTypeface,
  SkTypefaceFontProvider,
  SkCanvas,
  SkParagraph,
} from '@shopify/react-native-skia';
import {
  TextComponentData,
  TextShadowData,
} from '../components/text';
import { Entity } from '../../services-ecs/entity';
import { RenderComponentData } from '../components/render';

export const textShadowBleedPadding = (shadow?: TextShadowData): number => {
  'worklet';
  if (!shadow) {
    return 0;
  }
  return (
    shadow.blur * 3 +
    Math.abs(shadow.dx ?? 0) +
    Math.abs(shadow.dy ?? 0)
  );
};

function shallowTextPropsHash(tc: TextComponentData) {
  'worklet';
  const shadow = tc.textShadow;
  const shadowKey = shadow
    ? `${shadow.dx ?? 0}|${shadow.dy ?? 0}|${shadow.blur}|${shadow.color}|${shadow.shadowOnly ?? true}`
    : '';
  return [
    tc.text,
    tc.fontAssetId,
    tc.fontSize,
    tc.color,
    tc.align,
    tc.maxWidth,
    tc.wrap,
    tc.lineHeight,
    tc.letterSpacing,
    tc.strokeColor,
    tc.strokeWidth,
    tc.locale,
    shadowKey,
  ].join('|');
}

/**
 * Resolve Typeface from cached font assets; falls back to undefined.
 * fontAssetId maps to global._RNTGE_.fontCache[fontAssetId].typeface
 */
export function resolveTypeface(fontAssetId?: string): SkTypeface | undefined {
  'worklet';
  if (!fontAssetId) return undefined;
  const cache = global._RNTGE_.fontCache || {};
  const entry = cache[fontAssetId];
  if (!entry) return undefined;
  return entry.typeface;
}

/**
 * Create a Paragraph for given text component.
 * Returns a Paragraph and measured width/height.
 */
export function buildParagraphForText(textComponent: TextComponentData) {
  'worklet';
  const {
    fontAssetId,
    fontSize,
    color,
    align,
    lineHeight,
    letterSpacing,
    decoration,
  } = textComponent;

  const typeface = resolveTypeface(fontAssetId);
  if (!typeface) {
    console.warn('Typeface not resolved for ID:', textComponent.fontAssetId);
    return null;
  }

  const fontFamilyName = textComponent.fontAssetId;
  const fontMgr = Skia.TypefaceFontProvider.Make();
  fontMgr.registerFont(typeface, fontFamilyName);

  const SkparagraphStyle: SkParagraphStyle = {
    textAlign: align,
    ellipsis: textComponent.ellipsis || '...',
  };

  const SktextStyle: SkTextStyle = {
    fontFamilies: [fontFamilyName],
    fontSize: fontSize,
    color: color,
  };

  if (letterSpacing != null) SktextStyle.letterSpacing = letterSpacing;
  if (lineHeight != null) SktextStyle.heightMultiplier = lineHeight;
  if (decoration) {
    SktextStyle.decoration = decoration;
  }

  const builder = Skia.ParagraphBuilder.Make(SkparagraphStyle, fontMgr);
  builder.pushStyle(SktextStyle);
  builder.addText(textComponent.text || '');

  const paragraph = builder.build();
  const layoutWidth = textComponent.maxWidth || Number.MAX_SAFE_INTEGER;
  paragraph.layout(layoutWidth);

  return {
    paragraph,
    width: paragraph.getMaxIntrinsicWidth(),
    height: paragraph.getHeight(),
  };
};

export const paintParagraphAt = (
  canvas: SkCanvas,
  paragraph: SkParagraph,
  x: number,
  y: number,
  textShadow?: TextShadowData
): void => {
  'worklet';
  if (!textShadow) {
    paragraph.paint(canvas, x, y);
    return;
  }

  const dx = textShadow.dx ?? 0;
  const dy = textShadow.dy ?? 0;
  const sigma = textShadow.blur;
  const shadowColor = Skia.Color(textShadow.color);
  const shadowOnly = textShadow.shadowOnly !== false;

  const shadowPaint = Skia.Paint();
  shadowPaint.setAntiAlias(true);
  shadowPaint.setImageFilter(
    Skia.ImageFilter.MakeDropShadowOnly(
      dx,
      dy,
      sigma,
      sigma,
      shadowColor,
      null
    )
  );

  canvas.save();
  canvas.translate(x, y);
  canvas.saveLayer(shadowPaint);
  paragraph.paint(canvas, 0, 0);
  canvas.restore();
  if (shadowOnly) {
    paragraph.paint(canvas, 0, 0);
  }
  canvas.restore();
};

/**
 * Render text for entity into the canvas (Skia Canvas).
 */
export function renderTextForEntity(
  canvas: SkCanvas,
  entityId: Entity,
  renderComponent: RenderComponentData,
  textComponent: TextComponentData,
  originX = 0,
  originY = 0
) {
  'worklet';
  if (!textComponent || !renderComponent || !canvas) return;

  const cache = (global._RNTGE_.textCache = global._RNTGE_.textCache || {});
  const key = entityId;

  const newHash = shallowTextPropsHash(textComponent);
  const cached = cache[key];

  let paragraphEntry = cached && cached.lastHash === newHash ? cached : null;

  if (!paragraphEntry || textComponent.isDirty) {
    try {
      const built = buildParagraphForText(textComponent);
      if (!built) {
        console.warn(
          '[RNTGE] Failed to build paragraph for text entity 1',
          entityId
        );
        return null;
      }
      cache[key] = {
        ...built,
        lastHash: newHash,
      };
      textComponent.isDirty = false;
      paintParagraphAt(
        canvas,
        built.paragraph,
        originX,
        originY,
        textComponent.textShadow
      );
      return cache[key];
    } catch (e) {
      console.warn(
        '[RNTGE] Failed to build paragraph for text entity',
        entityId,
        e
      );
      return null;
    }
  }

  paintParagraphAt(
    canvas,
    paragraphEntry.paragraph,
    originX,
    originY,
    textComponent.textShadow
  );
  return paragraphEntry;
}
