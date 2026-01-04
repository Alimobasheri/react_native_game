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
  /** Distance threshold for detecting wave peak passing (normalized, 0-1 range) */
  wavePeakDetectionThreshold: number;
  /** Minimum wave force to trigger LOSING_BALANCE state */
  waveForceLosingBalanceThreshold: number;
  /** Minimum wave force to trigger WAVE_LAUNCH state */
  waveForceLaunchThreshold: number;
  /** Multiplier for waves originating close to/under surfer position */
  waveOriginProximityMultiplier: number;
  /** Penalty multiplier for waves coming from behind surfer (wave.x < surferX) */
  waveFromBehindPenalty: number;
  /** Base friction when falling (LOSING_BALANCE state) */
  fallingFrictionBase: number;
  /** Friction increase per pixel depth underwater */
  fallingFrictionMultiplier: number;
  /** Depth below water surface to trigger game over (pixels) */
  sinkDepthThreshold: number;
  /** Multiplier for launch power to velocity (WAVE_LAUNCH state) */
  launchVelocityMultiplier: number;
  /** Height above water to start rotation (pixels) */
  launchHeightThreshold: number;
  /** Radians per second for backflip rotation (AIR_ROTATION state) */
  rotationSpeed: number;
  /** Pixels per second descent speed (LANDING state) */
  landingSpeed: number;
  /** Distance from water surface to consider landed (pixels) */
  landingThreshold: number;
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
  wavePeakDetectionThreshold: 0.05, // Normalized distance threshold (5% of screen width)
  waveForceLosingBalanceThreshold: 0.9, // High threshold for losing balance
  waveForceLaunchThreshold: 0.3, // Lower threshold for wave launch
  waveOriginProximityMultiplier: 50, // Multiplier for close waves
  waveFromBehindPenalty: 1.5, // 50% increase in force for waves from behind
  fallingFrictionBase: 0.1, // Base friction when falling
  fallingFrictionMultiplier: 0.01, // Friction increase per pixel depth
  sinkDepthThreshold: 100, // Depth below water surface to trigger game over (pixels)
  launchVelocityMultiplier: 5, // Multiplier for launch power to velocity
  launchHeightThreshold: 10, // Height above water to start rotation (pixels)
  rotationSpeed: 8 * Math.PI, // Radians per second for backflip (~0.25s for 360°)
  landingSpeed: 200, // Pixels per second descent speed
  landingThreshold: 5, // Distance from water surface to consider landed (pixels)
};

/**
 * Get physics config
 */
export const getSurferPhysicsConfig = (): SurferPhysicsConfig => {
  'worklet';
  return DEFAULT_SURFER_PHYSICS_CONFIG;
};
