import { PositionComponentData } from './position';
import { BlendMode } from '@shopify/react-native-skia';
import { RenderLayer } from '../render/renderLayers';
import {
  RenderSortData,
  RenderSortMode,
  RenderSortOrigin,
  RenderSortTieBreaker,
} from '../render/renderSort';
import type { RenderLayerBackingData } from '../render/renderLayerBacking';
import type { RectangleBorderRadius } from '../render/renderShapes';

export { RenderLayer } from '../render/renderLayers';
export {
  RenderSortMode,
  RenderSortOrigin,
  RenderSortTieBreaker,
  type RenderSortData,
} from '../render/renderSort';
export {
  createRectLayerBacking,
  withRenderLayerBacking,
  computeGridExteriorBorderRadius,
  gapSetFromColumns,
  isSolidColumn,
  type RenderLayerBackingData,
} from '../render/renderLayerBacking';
export {
  borderRadiusHasAny,
  clampBorderRadii,
  normalizeBorderRadius,
  type RectangleBorderRadius,
  type NormalizedBorderRadii,
} from '../render/renderShapes';

export const RenderComponentName = 'render';

// Define shape type enum
export enum ShapeTypes {
  Rectangle = 'rectangle',
  Circle = 'circle',
  Polygon = 'polygon',
}

// Define the individual shape types for our discriminated union
export type RenderShapeRectangle = {
  type: ShapeTypes.Rectangle;
  width: number;
  height: number;
  /** Per-corner radius in pixels (local space). Omitted corners are square. */
  borderRadius?: RectangleBorderRadius | number;
};

export type RenderShapeCircle = {
  type: ShapeTypes.Circle;
  radius: number;
};

export type RenderShapePolygon = {
  type: ShapeTypes.Polygon;
  vertices: { x: number; y: number }[];
};

export interface ShaderInfo {
  key: string; // The key provided to the RNTGE component's `shaders` prop
  uniforms: Record<string, number | number[]>;
}

/** How renderSystem caches and redraws this entity each frame. */
export enum RenderPolicy {
  StaticPicture = 'staticPicture',
  LiveGroup = 'liveGroup',
  AnimatedComposite = 'animatedComposite',
}

export type CompositeShaderChildImage = {
  imageKey: string;
  tileModeX?: 'repeat' | 'clamp';
  tileModeY?: 'repeat' | 'clamp';
};

export type CompositeShaderInfo = {
  key: string;
  uniforms: Record<string, number | number[]>;
  /** Flat float uniform keys in SKSL declaration order (excluding `uniform shader`). */
  uniformKeys: readonly string[];
  /** Child image shaders — order matches `uniform shader` declarations in SKSL. */
  childImages: CompositeShaderChildImage[];
};

export interface SpriteInfo {
  frameWidth: number;
  frameHeight: number;
  totalFrames: number;
  framesPerRow: number;
  frameDuration: number; // Duration of each frame in milliseconds
  loop: boolean;
  currentFrame?: number; // Current frame index (managed by system)
  lastFrameTime?: number; // Last time frame was updated (managed by system)
}

/** Gooey metaball merge (blur + alpha threshold) for grouped render layers. */
export type GooeyMergeFilterData = {
  blurSigma: number;
  alphaMultiplier: number;
  alphaThreshold: number;
};

/** Alpha-following drop shadow / outer glow for image draws (Skia ImageFilter). */
export type ImageShadowData = {
  dx?: number;
  dy?: number;
  /** Gaussian sigma passed to Skia drop-shadow (typical range 2–8). */
  blur: number;
  color: string;
  /** When true (default), shadow is drawn in a pass behind the image. */
  shadowOnly?: boolean;
};

/** One child draw inside a grouped RenderComponent (local space). Flat only in v1. */
export type RenderLayerData = {
  /** Offset from parent group center, in pixels. Default {0,0}. */
  position?: { x: number; y: number };
  /** Rotation in radians in layer-local space. */
  angle?: number;
  shape: RenderShapeRectangle | RenderShapeCircle | RenderShapePolygon;
  visible?: boolean;
  fillColor?: string;
  strokeColor?: string;
  lineWidth?: number;
  opacity?: number;
  image?: string;
  sprite?: SpriteInfo;
  blendMode?: BlendMode;
  imageShadow?: ImageShadowData;
  /** Horizontal skew factor (Skia canvas skew sx) applied after translate, before rotate. */
  skewX?: number;
  /**
   * When true, clip this layer to the parent group's rectangle bounds before drawing.
   * Use for internal overlays that must stay inside the body hitbox.
   */
  clipToGroupBounds?: boolean;
  /**
   * Opaque underlay drawn before this layer's image/fill/stroke.
   * Blocks content behind the layer (e.g. water) from showing through
   * transparent sprite corners without changing shaders.
   */
  backing?: RenderLayerBackingData;
};

// The new RenderComponentData using the discriminated union for shapes
export interface RenderComponentData {
  shape: RenderShapeRectangle | RenderShapeCircle | RenderShapePolygon;
  position?: PositionComponentData; // For static objects without a physics body
  /** Rotation in radians when transform is not driven by a Matter body. */
  angle?: number;
  visible?: boolean;
  fillColor?: string;
  strokeColor?: string;
  lineWidth?: number;
  opacity?: number;
  image?: string;
  sprite?: SpriteInfo; // Sprite animation data
  imageShadow?: ImageShadowData;
  /**
   * Coarse render pass. Lower layers draw first.
   * When set, takes precedence over `zIndex` for layer sorting.
   */
  renderLayer?: number;
  /**
   * Per-entity rendering order within a scene (legacy alias for `renderLayer`).
   * - Lower values are rendered first (further back).
   * - Higher values are rendered later (in front).
   * - If omitted, layer defaults to 0.
   *
   * Scenes themselves are still ordered by SceneComponentData.zIndex.
   */
  zIndex?: number;
  /**
   * Depth sort policy within a render layer. Computed each frame by renderSystem.
   * Omit for Fixed/manual ordering (entity id tie-break only).
   */
  sort?: RenderSortData;
  isDirty?: boolean;
  shader?: ShaderInfo;
  blendMode?: BlendMode;
  /**
   * When true, the shader fill is recorded into a cached SkPicture and replayed
   * until `isDirty`. Use for screen overlays whose uniforms only change on layout
   * or resize. Animated / per-frame shaders (e.g. water) must leave this unset.
   */
  shaderCacheStatic?: boolean;
  /**
   * Masked multi-pass body shader drawn first in local space, then `renderLayers` on top.
   * Mutually exclusive with top-level `shader` (water entities use `shader` alone).
   */
  compositeShader?: CompositeShaderInfo;
  /** Controls picture caching. `AnimatedComposite` never picture-caches. */
  renderPolicy?: RenderPolicy;
  /**
   * Overlay image layers (eyes, crest) drawn above `compositeShader`.
   * When `compositeShader` is set, layers must not include the body image.
   */
  renderLayers?: RenderLayerData[];
  /**
   * When set with renderLayers, records the group through a gooey merge filter
   * so overlapping circles blend into a continuous foam-like mass.
   */
  gooeyMerge?: GooeyMergeFilterData;
}

// Update the creation utility function
export const createRenderComponent = (
  options: Omit<RenderComponentData, 'isDirty'>
) => {
  'worklet';
  return {
    name: RenderComponentName,
    data: {
      ...options,
      isDirty: true, // Always start as dirty to force initial render
    },
  };
};

/** Preset: world-Y depth sort (higher Y draws in front). */
export const createWorldYSortedRenderComponent = (
  options: Omit<RenderComponentData, 'sort' | 'isDirty'> & {
    origin?: RenderSortOrigin;
    originOffset?: number;
    renderLayer?: number;
    tieBreaker?: RenderSortTieBreaker;
  }
) => {
  'worklet';
  const {
    origin = RenderSortOrigin.Bottom,
    originOffset,
    renderLayer = RenderLayer.World,
    tieBreaker,
    ...rest
  } = options;

  return createRenderComponent({
    ...rest,
    renderLayer,
    sort: {
      mode: RenderSortMode.WorldY,
      origin,
      originOffset,
      tieBreaker,
    },
  });
};
