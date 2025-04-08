import { Body } from 'matter-js';

export type MatterBodyOptions = Partial<Body>;

// Options for Bodies.rectangle
export interface MatterRectangleArgs {
  x: number;
  y: number;
  width: number;
  height: number;
  options?: MatterBodyOptions & {
    chamfer?: {
      radius: number;
      quality?: number;
      qualityMin?: number;
      qualityMax?: number;
    };
  };
}

// Options for Bodies.trapezoid
export interface MatterTrapezoidArgs {
  x: number;
  y: number;
  width: number;
  height: number;
  slope: number; // Must be < 1
  options?: MatterBodyOptions & {
    chamfer?: {
      radius: number;
      quality?: number;
      qualityMin?: number;
      qualityMax?: number;
    };
  };
}

// Options for Bodies.circle
export interface MatterCircleArgs {
  x: number;
  y: number;
  radius: number;
  maxSides?: number;
  options?: MatterBodyOptions; // No chamfer for circles
}

// Options for Bodies.polygon
export interface MatterPolygonArgs {
  x: number;
  y: number;
  sides: number;
  radius: number;
  options?: MatterBodyOptions & {
    chamfer?: {
      radius: number;
      quality?: number;
      qualityMin?: number;
      qualityMax?: number;
    };
  };
}

// Options for Bodies.fromVertices
export interface MatterFromVerticesArgs {
  x: number;
  y: number;
  vertexSets: { x: number; y: number }[][];
  options?: MatterBodyOptions;
  flagInternal?: boolean;
  removeCollinear?: number;
  minimumArea?: number;
  removeDuplicatePoints?: number;
}

export type CreateMatterBodyArgs =
  | { type: 'rectangle'; options: MatterRectangleArgs }
  | { type: 'trapezoid'; options: MatterTrapezoidArgs }
  | { type: 'circle'; options: MatterCircleArgs }
  | { type: 'polygon'; options: MatterPolygonArgs }
  | { type: 'fromVertices'; options: MatterFromVerticesArgs };
