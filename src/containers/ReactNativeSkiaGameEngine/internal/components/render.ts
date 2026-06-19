import { PositionComponentData } from './position';
import { BlendMode } from '@shopify/react-native-skia';

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
  /**
   * Per-entity rendering order within a scene.
   * - Lower values are rendered first (further back).
   * - Higher values are rendered later (in front).
   * - If omitted, zIndex defaults to 0.
   *
   * Scenes themselves are still ordered by SceneComponentData.zIndex.
   */
  zIndex?: number;
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
