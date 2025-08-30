import { IBodyDefinition } from 'matter-js';
import { PositionComponentData } from './position';
import { SharedValue } from 'react-native-reanimated';

export const RenderComponentName = 'render';

// Define the individual shape types for our discriminated union
export type RenderShapeRectangle = {
  type: 'rectangle';
  width: number;
  height: number;
};

export type RenderShapeCircle = {
  type: 'circle';
  radius: number;
};

export type RenderShapePolygon = {
  type: 'polygon';
  vertices: { x: number; y: number }[];
};

export interface ShaderInfo {
  key: string; // The key provided to the RNTGE component's `shaders` prop
  uniforms: Record<string, SharedValue<number | number[]>>;
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
  zIndex?: number;
  isDirty?: boolean;
  shader?: ShaderInfo;
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
