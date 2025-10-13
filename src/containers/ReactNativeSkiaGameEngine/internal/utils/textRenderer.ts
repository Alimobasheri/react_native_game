import {
  Skia,
  SkParagraphStyle,
  SkTextStyle,
  SkTypeface,
  FontStyle,
  SkFont,
  SkTypefaceFontProvider,
  SkCanvas,
} from '@shopify/react-native-skia';
import { TextComponentData } from '../components/text';
import { Entity } from '../../services-ecs/entity';
import { RenderComponentData } from '../components/render';

function shallowTextPropsHash(tc: TextComponentData) {
  'worklet';
  // hashed string to decide invalidation
  // include everything that affects layout/appearance
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
  ].join('|');
}

/**
 * Imperatively creates and registers a typeface to be used by ParagraphBuilder.
 */
function createAndRegisterFontMgr(
  typeface: SkTypeface,
  familyName: string
): SkTypefaceFontProvider {
  'worklet';

  // Create the Font Provider (this type should expose registration methods)
  const fontMgr = Skia.TypefaceFontProvider.Make();

  // Use 'registerFont' instead of 'registerTypeface' as the more robust/common alternative
  // The official API often prefers "registerFont" when working with TypefaceFontProvider
  // The first argument is the typeface, the second is the family name string.
  fontMgr.registerFont(typeface, familyName);

  return fontMgr;
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
    text,
    fontAssetId,
    fontSize,
    color,
    align,
    maxWidth,
    lineHeight,
    letterSpacing,
    locale,
    decoration,
    wrap,
  } = textComponent;

  // Typeface
  const typeface = resolveTypeface(fontAssetId);
  if (!typeface) {
    console.warn('Typeface not resolved for ID:', textComponent.fontAssetId);
    return null;
  }

  const fontFamilyName = textComponent.fontAssetId;

  // --- 1. Create and Register FontMgr (Imperative) ---
  const fontMgr = Skia.TypefaceFontProvider.Make();
  // Use registerFont to register the typeface with the unique family name
  fontMgr.registerFont(typeface, fontFamilyName);

  const SkparagraphStyle: SkParagraphStyle = {
    textAlign: align,
    maxLines: wrap ? 0 : 1, // 0 => unlimited
    ellipsis: textComponent.ellipsis,
    heightMultiplier: lineHeight ? lineHeight / fontSize : 1,
  };

  // SkTextStyle
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

  // 2. Compute Layout on the SKParagraph object
  const layoutWidth = textComponent.maxWidth || Number.MAX_SAFE_INTEGER;
  paragraph.layout(layoutWidth); // <- 'layout' called on the paragraph object

  // 3. Get Dimensions from the SKParagraph object
  const width = paragraph.getMaxIntrinsicWidth(); // <- 'getMaxIntrinsicWidth' called on the paragraph object
  const height = paragraph.getHeight();

  // 4. Return Results
  return {
    paragraph,
    width: paragraph.getMaxIntrinsicWidth(),
    height: paragraph.getHeight(),
  };
}

/**
 * Render text for entity into the canvas (Skia Canvas).
 *
 * canvas: the render context the renderSystem provides (Skia Canvas or draw context).
 * entityId: entity identifier
 * renderComponent: the RenderComponent for transform info
 * textComponent: the TextComponent
 */
export function renderTextForEntity(
  canvas: SkCanvas,
  entityId: Entity,
  renderComponent: RenderComponentData,
  textComponent: TextComponentData
) {
  'worklet';
  if (!textComponent || !renderComponent || !canvas) return;

  // Prepare cache entry
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
        paragraph: built.paragraph,
        width: built.width,
        height: built.height,
        lastHash: newHash,
      };
      textComponent.isDirty = false;
      built.paragraph.paint(
        canvas,
        renderComponent.position?.x || 0,
        renderComponent.position?.y || 0
      );
      return built;
      return null;
    } catch (e) {
      console.warn(
        '[RNTGE] Failed to build paragraph for text entit 2',
        entityId,
        e
      );
      return null;
    }
  } else {
    // Use cached paragraph
    paragraphEntry.paragraph.paint(
      canvas,
      renderComponent.position?.x || 0,
      renderComponent.position?.y || 0
    );
    return paragraphEntry;
  }
}
