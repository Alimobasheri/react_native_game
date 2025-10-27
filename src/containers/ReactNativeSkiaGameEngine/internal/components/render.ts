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

// The new RenderComponentData using the discriminated union for shapes
export interface RenderComponentData {
  shape: RenderShapeRectangle | RenderShapeCircle | RenderShapePolygon;
  position?: PositionComponentData; // For static objects without a physics body
  visible?: boolean;
  fillColor?: string;
  strokeColor?: string;
  lineWidth?: number;
  opacity?: number;
  image?: string;
  sprite?: SpriteInfo; // Sprite animation data
  zIndex?: number;
  isDirty?: boolean;
  shader?: ShaderInfo;
  blendMode?: BlendMode;
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
