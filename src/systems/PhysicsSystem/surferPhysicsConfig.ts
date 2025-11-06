/**
 * Configurable physics constants for the surfer
 * Tweak these values to adjust the surfer's behavior
 */

export interface SurferPhysicsConfig {
  // === MATTER.JS BODY PROPERTIES ===
  /** Body density - affects mass and how forces impact the surfer */
  density: number;

  /** Air friction - slows down movement over time (0 = no friction, 1 = high friction) */
  frictionAir: number;

  /** Moment of inertia - controls rotation resistance (higher = slower rotation, Infinity = no rotation) */
  inertia: number;

  /** Restitution - bounciness (0 = no bounce, 1 = perfectly elastic) */
  restitution: number;

  // === BUOYANCY & SUBMERSION ===
  /** Target submersion ratio when floating normally on water (0 = fully above, 1 = fully submerged) */
  normalSubmersionRatio: number;

  /** Water density multiplier for buoyancy calculations */
  waterDensity: number;

  /** Buoyancy force multiplier */
  buoyancyMultiplier: number;

  /** Base buoyancy strength for gentle bobbing effect (small value, e.g., 0.0001) */
  buoyancyStrength: number;

  /** Maximum buoyancy force to prevent sudden bursts (clamp value) */
  maxBuoyancyForce: number;

  /** Minimum submersion ratio before buoyancy kicks in (prevents surface-only contact) */
  minSubmersionForBuoyancy: number;

  /** Submersion ratio threshold where buoyancy becomes stronger (for deeper submersion) */
  strongBuoyancySubmersionThreshold: number;

  // === WAVE INTERACTION ===
  /** Minimum wave height (amplitude) required to lift surfer into air */
  minWaveHeightForJump: number;

  /** Wave force multiplier - how much waves push the surfer */
  waveForceMultiplier: number;

  /** Number of sample points along body for wave force calculation (more = smoother but slower) */
  bodySamplePoints: number;

  // === ROTATION BEHAVIOR ===
  /** Minimum wave slope (steepness) required for rotation to occur */
  minWaveSlopeForRotation: number;

  /** Maximum rotation angle in radians (e.g., Math.PI / 4 = 45 degrees) */
  maxRotationAngle: number;

  /** Rotation damping when in water (higher = returns to upright faster) */
  rotationDampingInWater: number;

  /** Rotation damping in air (higher = less spinning) */
  rotationDampingInAir: number;

  /** Only allow rotation when surfer is in air */
  onlyRotateInAir: boolean;

  // === ARCADE STATE ADDITIONS ===
  /** Max lean angle while in water (radians) */
  waterTiltMaxAngleRad: number;
  /** How strongly the surfer follows the wave slope while in water */
  waterTiltFollowStrength: number;
  /** Min slope to consider a launch */
  minWaveSlopeForLaunch: number;
  /** Min wave height to consider a launch (more permissive than jump) */
  minWaveHeightForLaunch: number;
  /** Multiplier that maps launch power to upward impulse */
  launchImpulseScale: number;
  /** Probability of initiating rotation on launch */
  rotationChanceOnLaunch: number;
  /** Allowed target rotations to pick from on launch */
  rotationTargetChoices: number[];
  /** Controlled angular speed during AIR_ROTATION (rad/s) */
  rotationAngularSpeedRad: number;
  /** Specific air damping used during AIR_ROTATION */
  airAngularDamping: number;
  /** Tolerance for perfect landing upright angle (radians) */
  landingAngleToleranceRad: number;
  /** Damping used in RECOVERY to return upright */
  recoveryDamping: number;
  /** Min slope for water tilting response */
  minWaveSlopeForWaterTilt: number;

  // === VERTICAL MOVEMENT ===
  /** Velocity damping multiplier (reduces bounce) */
  velocityDamping: number;

  /** Anti-gravity force when not submerged (prevents sinking) */
  antiGravityForce: number;

  /** Threshold for position correction (pixels) */
  positionCorrectionThreshold: number;
}

/**
 * Default physics configuration - START HERE for tweaking
 */
export const DEFAULT_SURFER_PHYSICS_CONFIG: SurferPhysicsConfig = {
  // === MATTER.JS BODY PROPERTIES ===
  density: 0.001, // Light body - easier to move with waves
  frictionAir: 0.001, // Low air resistance
  inertia: 50000, // Moderate rotation resistance (increase to slow rotation, use Infinity to disable)
  restitution: 0.3, // Low bounce

  // === BUOYANCY & SUBMERSION ===
  normalSubmersionRatio: 0.05, // Only 5% submerged (board keeps surfer above water)
  waterDensity: 0.001,
  buoyancyMultiplier: 0.1, // Strong buoyancy to keep surfer on surface
  buoyancyStrength: 0.001, // Gentle base strength for bobbing effect
  maxBuoyancyForce: 0.01, // Maximum force to prevent sudden bursts
  minSubmersionForBuoyancy: 0.02, // Need at least 2% submerged before buoyancy applies
  strongBuoyancySubmersionThreshold: 0.1, // At 10% submersion, buoyancy becomes stronger

  // === WAVE INTERACTION ===
  minWaveHeightForJump: 50, // Minimum wave amplitude needed to launch surfer
  waveForceMultiplier: 0.001, // How strong wave forces are
  bodySamplePoints: 20, // Sample points for force distribution (reduced from 50)

  // === ROTATION BEHAVIOR ===
  minWaveSlopeForRotation: 0.1, // Lowered for subtle leaning
  maxRotationAngle: Math.PI / 4, // 45 degrees max rotation
  rotationDampingInWater: 0.06, // Gentler damping in water for arcade feel
  rotationDampingInAir: 0.03, // Light damping in air (allows flips)
  onlyRotateInAir: false, // Allow gentle tilt in water; flips controlled by state

  // === ARCADE STATE ADDITIONS ===
  waterTiltMaxAngleRad: 0.25,
  waterTiltFollowStrength: 0.12,
  minWaveSlopeForLaunch: 0.25,
  minWaveHeightForLaunch: 30,
  launchImpulseScale: 0.006,
  rotationChanceOnLaunch: 0.55,
  rotationTargetChoices: [1, 2],
  rotationAngularSpeedRad: 2.8,
  airAngularDamping: 0.02,
  landingAngleToleranceRad: 0.18,
  recoveryDamping: 0.09,
  minWaveSlopeForWaterTilt: 0.05,

  // === VERTICAL MOVEMENT ===
  velocityDamping: 0.01, // Gentle velocity damping
  antiGravityForce: 0.001, // Slight upward force when not submerged
  positionCorrectionThreshold: 5, // Pixels before position correction kicks in
};

/**
 * Get physics config (can be extended to support multiple profiles)
 */
export const getSurferPhysicsConfig = (): SurferPhysicsConfig => {
  'worklet';
  return DEFAULT_SURFER_PHYSICS_CONFIG;
};
