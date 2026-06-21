import type { RenderShapeRectangle } from '../components/render';

export type RectangleBorderRadius = {
  tl?: number;
  tr?: number;
  bl?: number;
  br?: number;
};

export type NormalizedBorderRadii = {
  tl: number;
  tr: number;
  bl: number;
  br: number;
};

export function normalizeBorderRadius(
  borderRadius: RectangleBorderRadius | number | undefined
): NormalizedBorderRadii {
  'worklet';
  if (borderRadius === undefined) {
    return { tl: 0, tr: 0, bl: 0, br: 0 };
  }
  if (typeof borderRadius === 'number') {
    return {
      tl: borderRadius,
      tr: borderRadius,
      bl: borderRadius,
      br: borderRadius,
    };
  }
  return {
    tl: borderRadius.tl ?? 0,
    tr: borderRadius.tr ?? 0,
    bl: borderRadius.bl ?? 0,
    br: borderRadius.br ?? 0,
  };
}

export function borderRadiusHasAny(
  borderRadius: RectangleBorderRadius | number | undefined
): boolean {
  'worklet';
  const radii = normalizeBorderRadius(borderRadius);
  return !!(radii.tl || radii.tr || radii.bl || radii.br);
}

/** Clamp per-corner radii so adjacent corners do not overlap (CSS border-radius rules). */
export function clampBorderRadii(
  width: number,
  height: number,
  radii: NormalizedBorderRadii
): NormalizedBorderRadii {
  'worklet';
  let { tl, tr, bl, br } = radii;
  if (width <= 0 || height <= 0) {
    return { tl: 0, tr: 0, bl: 0, br: 0 };
  }

  let scale = 1;
  if (tl + tr > width) {
    scale = Math.min(scale, width / (tl + tr));
  }
  if (bl + br > width) {
    scale = Math.min(scale, width / (bl + br));
  }
  if (tl + bl > height) {
    scale = Math.min(scale, height / (tl + bl));
  }
  if (tr + br > height) {
    scale = Math.min(scale, height / (tr + br));
  }

  if (scale < 1) {
    tl *= scale;
    tr *= scale;
    bl *= scale;
    br *= scale;
  }

  return { tl, tr, bl, br };
}

export function getRectangleBorderRadius(
  shape: RenderShapeRectangle
): RectangleBorderRadius | number | undefined {
  'worklet';
  return shape.borderRadius;
}
