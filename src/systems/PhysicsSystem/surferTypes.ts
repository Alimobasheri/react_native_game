/**
 * Types for the Surfer Physics System
 */

export interface SurferPhysicsConfig {
  /** Buoyancy force multiplier */
  buoyancyStrength: number;
  /** Water friction coefficient */
  waterFriction: number;
  /** Air friction coefficient */
  airFriction: number;
  /** Maximum submersion ratio before surfer is considered "sinking" */
  maxSubmersionRatio: number;
  /** Wave force influence multiplier */
  waveInfluenceStrength: number;
}

export interface SurferSubmersionData {
  /** How deep the surfer is in water (in pixels) */
  submergedDepth: number;
  /** Ratio of surfer submerged (0 = not submerged, 1 = fully submerged) */
  submergedRatio: number;
  /** Y position of water surface at surfer's X position */
  waterSurfaceY: number;
}

export interface SurferForceData {
  /** Position where force should be applied */
  position: { x: number; y: number };
  /** Force vector to apply */
  force: { x: number; y: number };
  /** Type of force being applied */
  forceType: 'buoyancy' | 'wave' | 'friction';
}

export interface SurferPhysicsState {
  /** Current submersion data */
  submersion: SurferSubmersionData;
  /** Forces currently being applied */
  activeForces: SurferForceData[];
  /** Whether the surfer is currently on a sea layer */
  isOnSea: boolean;
  /** Index of the sea layer the surfer is on */
  currentSeaLayerIndex: number;
}

/**
 * Default configuration for surfer physics
 */
export const DEFAULT_SURFER_PHYSICS_CONFIG: SurferPhysicsConfig = {
  buoyancyStrength: 1.0,
  waterFriction: 0.05,
  airFriction: 0.001,
  maxSubmersionRatio: 0.8,
  waveInfluenceStrength: 0.3,
};

/**
 * Callback type for applying forces to the surfer
 */
export type ApplyForceCallback = (
  position: { x: number; y: number },
  force: { x: number; y: number }
) => void;

/**
 * Callback type for setting body properties
 */
export type SetBodyPropertyCallback = (property: string, value: any) => void;

/**
 * Callback type for setting position
 */
export type SetPositionCallback = (x: number, y: number) => void;
