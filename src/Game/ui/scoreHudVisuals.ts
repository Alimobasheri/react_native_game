import {
  RenderLayerData,
  ShapeTypes,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';

export const SCORE_HUD_COLORS = {
  /** Dark panel fill — drawn at SCORE_HUD_PANEL_OPACITY so cave shows through. */
  panelFill: '#141024',
  panelBorder: '#4A4588',
  panelBorderNewBest: '#FFD84A',
  fill: '#1D1647',
  fillGlow: '#211852',
  border: '#5C5AD8',
  borderNewBest: '#FFD84A',
  innerHighlight: '#8FEAFF',
  shadow: '#0A0518',
  gloss: '#FFFFFF',
} as const;

/** Panel background alpha (0–1). ~0.7 = semi-opaque dark veil. */
export const SCORE_HUD_PANEL_OPACITY = 0.72;

export function createScoreHudBoxLayers(
  width: number,
  height: number,
  borderRadius: number,
  options?: { glowBorder?: boolean }
): RenderLayerData[] {
  'worklet';
  const glow = options?.glowBorder === true;
  const borderColor = glow ? SCORE_HUD_COLORS.borderNewBest : SCORE_HUD_COLORS.border;

  return [
    {
      position: { x: 2, y: 5 },
      shape: {
        type: ShapeTypes.Rectangle,
        width,
        height,
        borderRadius,
      },
      fillColor: SCORE_HUD_COLORS.shadow,
      opacity: 0.42,
    },
    {
      shape: {
        type: ShapeTypes.Rectangle,
        width,
        height,
        borderRadius,
      },
      fillColor: SCORE_HUD_COLORS.fill,
    },
    {
      position: { x: 0, y: -height * 0.38 },
      shape: {
        type: ShapeTypes.Rectangle,
        width: width * 0.72,
        height: Math.max(8, height * 0.12),
        borderRadius: Math.max(4, borderRadius * 0.35),
      },
      fillColor: SCORE_HUD_COLORS.innerHighlight,
      opacity: 0.14,
    },
    {
      position: { x: -width * 0.22, y: -height * 0.24 },
      shape: {
        type: ShapeTypes.Rectangle,
        width: width * 0.34,
        height: height * 0.22,
        borderRadius: Math.max(4, borderRadius * 0.3),
      },
      fillColor: SCORE_HUD_COLORS.gloss,
      opacity: 0.07,
    },
    {
      shape: {
        type: ShapeTypes.Rectangle,
        width,
        height,
        borderRadius,
      },
      strokeColor: borderColor,
      lineWidth: glow ? 2.5 : 2,
    },
  ];
}
