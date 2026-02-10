import { Component } from '@/containers/ReactNativeSkiaGameEngine/services-ecs';

export const SwimmerComponentName = 'Swimmer';

export type SwimmerComponentData = {
  velocityX: number; // Horizontal velocity for left/right movement
  /** Normalized horizontal input from controls (-1..1). Used for tap-based hyper-casual movement. */
  inputX?: number;
  waterSurfaceY: number; // Current water surface Y position
  containerWidth: number; // Width of the container
  containerCenterX: number; // Center X of container
  containerCenterY: number; // Center Y of container
  isInInitialPhase: boolean; // Whether we're in the initial water rising phase
  isCollidingWithObstacle: boolean; // Whether swimmer is currently colliding with an obstacle
  fallingVelocityY: number; // Vertical velocity when falling after collision
  /** When true, swimmer X is driven by column (tap-to-move); when false, by velocityX (pan) */
  useColumnControl?: boolean;
  /** Current grid column index (0..COLUMNS-1); used when useColumnControl is true */
  column?: number;
  /** Internal phase accumulator for gentle bobbing on the water surface */
  bobbingPhase?: number;
  /** Visual tilt angle in radians, derived from horizontal velocity. */
  angle?: number;
};

export const createSwimmerComponent = (
  data: SwimmerComponentData
): Component<SwimmerComponentData> => {
  'worklet';
  return {
    name: SwimmerComponentName,
    data,
  };
};
