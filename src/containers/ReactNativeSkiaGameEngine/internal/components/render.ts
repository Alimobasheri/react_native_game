import { PositionComponentData } from './position';
import { BlendMode } from '@shopify/react-native-skia';
import { RenderLayer } from '../render/renderLayers';
import {
  RenderSortData,
  RenderSortMode,
  RenderSortOrigin,
  RenderSortTieBreaker,
} from '../render/renderSort';

export { RenderLayer } from '../render/renderLayers';
export {
  RenderSortMode,
  RenderSortOrigin,
  RenderSortTieBreaker,
  type RenderSortData,
} from '../render/renderSort';

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
   * When set, entity renders as a composed group (Skia Group analogue):
   * all layers are recorded once into one SkPicture in parent-local space.
   * Parent `shape` (rectangle) defines recording bounds (width × height).
   * Top-level `image` / `fillColor` / `shader` are ignored when renderLayers is non-empty.
   *
   * v1: flat layers only; animated layer sprites rebuild the whole group picture.
   */
  renderLayers?: RenderLayerData[];
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
