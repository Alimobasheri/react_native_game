/**
 * Minimal physics config for Matter.js body properties
 * Since we're using static positioning, only basic body properties are needed
 */

export interface SurferPhysicsConfig {
  /** Body density - affects mass and how forces impact the surfer */
  density: number;
  /** Air friction - slows down movement over time (0 = no friction, 1 = high friction) */
  frictionAir: number;
  /** Moment of inertia - controls rotation resistance (higher = slower rotation, Infinity = no rotation) */
  inertia: number;
  /** Restitution - bounciness (0 = no bounce, 1 = perfectly elastic) */
  restitution: number;
  /** Buoyancy bobbing amplitude in pixels (gentle up/down oscillation) */
  buoyancyAmplitude: number;
  /** Buoyancy bobbing frequency in cycles per second */
  buoyancyFrequency: number;
}

/**
 * Default physics configuration
 */
export const DEFAULT_SURFER_PHYSICS_CONFIG: SurferPhysicsConfig = {
  density: 0.001, // Light body
  frictionAir: 0.001, // Low air resistance
  inertia: 50000, // Moderate rotation resistance
  restitution: 0.3, // Low bounce
  buoyancyAmplitude: 2, // Small amplitude (2-3 pixels) for gentle bobbing
  buoyancyFrequency: 1.5, // cycles per second
};

/**
 * Get physics config
 */
export const getSurferPhysicsConfig = (): SurferPhysicsConfig => {
  'worklet';
  return DEFAULT_SURFER_PHYSICS_CONFIG;
};
