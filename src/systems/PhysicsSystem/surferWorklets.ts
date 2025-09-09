import {
  SeaLayerComponentData,
  WaveData,
} from '@/Game/ecs-components/SeaLayer';

/**
 * Calculate the water surface height at a specific x position for a sea layer
 * This mimics the wave calculation from the sea shader
 */
export const getWaterSurfaceHeightAtPoint = (
  seaLayer: SeaLayerComponentData,
  x: number
): number => {
  'worklet';

  // Base water level - use the layer's Y position as the surface level
  let surfaceHeight = seaLayer.y - seaLayer.height / 2;

  // Calculate wave contributions
  seaLayer.waves.forEach((wave: WaveData) => {
    if (!wave.isFlowing) return;

    // Calculate wave height at this x position
    // This follows the same pattern as the wave shader
    const normalizedX = (x / seaLayer.windowWidth) * 2 * Math.PI;
    const waveHeight =
      wave.amplitude *
      Math.sin(normalizedX * wave.frequency + wave.time * wave.speed);

    surfaceHeight += waveHeight;
  });

  return surfaceHeight;
};

/**
 * Calculate how much of the surfer is submerged in water
 */
export const calculateSurferSubmersion = (
  matterBody: any,
  seaLayer: SeaLayerComponentData
): { submergedDepth: number; submergedRatio: number } => {
  'worklet';

  const surferX = matterBody.position.x;
  const surferY = matterBody.position.y;
  const surferHeight = matterBody.bounds.max.y - matterBody.bounds.min.y;
  const surferBottom = matterBody.bounds.max.y;

  const waterSurfaceY = getWaterSurfaceHeightAtPoint(seaLayer, surferX);

  // Calculate submersion
  const submergedDepth = Math.max(0, surferBottom - waterSurfaceY);
  const submergedRatio = Math.min(1, submergedDepth / surferHeight);

  return { submergedDepth, submergedRatio };
};

/**
 * Position the surfer on the sea surface
 * This ensures the surfer stays on or near the water surface
 */
export const positionSurferOnSea = (
  matterBody: any,
  seaLayer: SeaLayerComponentData,
  setPosition: (x: number, y: number) => void,
  forceUpdate: boolean = false
): void => {
  'worklet';

  const surferX = matterBody.position.x;
  const surferHeight = matterBody.bounds.max.y - matterBody.bounds.min.y;

  // Get water surface height at surfer's x position
  const waterSurfaceY = getWaterSurfaceHeightAtPoint(seaLayer, surferX);

  // Position surfer so they're floating on the surface
  // The surfer's center should be at the water surface level
  const targetY = waterSurfaceY - surferHeight * 0.4; // 40% submerged for stability

  // Update position if forced or if there's a significant difference
  const currentY = matterBody.position.y;
  const threshold = forceUpdate ? 0 : 8; // Force initial positioning, then allow some movement

  if (Math.abs(currentY - targetY) > threshold) {
    setPosition(surferX, targetY);
  }
};

/**
 * Apply buoyancy forces to the surfer based on water displacement
 */
export const applySurferBuoyancy = (
  matterBody: any,
  seaLayer: SeaLayerComponentData,
  deltaTime: number,
  applyForce: (
    position: { x: number; y: number },
    force: { x: number; y: number }
  ) => void
): void => {
  'worklet';

  const { submergedDepth, submergedRatio } = calculateSurferSubmersion(
    matterBody,
    seaLayer
  );

  if (submergedRatio <= 0) {
    // Apply slight upward force even when not submerged to prevent sinking
    const antiGravityForce = {
      x: 0,
      y: -0.001, // Small upward force to counteract gravity
    };
    const position = {
      x: matterBody.position.x,
      y: matterBody.position.y,
    };
    applyForce(position, antiGravityForce);
    return;
  }

  // Calculate buoyancy force
  // F = ρ * g * V_displaced (Archimedes' principle)
  const waterDensity = 0.001; // kg/m³
  const gravity = 9.81; // m/s²
  const surferWidth = matterBody.bounds.max.x - matterBody.bounds.min.x;
  const surferHeight = matterBody.bounds.max.y - matterBody.bounds.min.y;
  const surferVolume = surferWidth * surferHeight * 10; // Assume 10 units depth for 2D

  const displacedVolume = surferVolume * submergedRatio;
  const buoyancyForce = waterDensity * gravity * displacedVolume * 0.001; // Increased scale for stronger buoyancy

  // Apply upward buoyancy force - make it stronger and more responsive
  const baseForce = buoyancyForce * Math.min(3.0, submergedRatio * 4); // Very strong force

  // Add extra force if surfer is sinking too much
  const extraForce =
    submergedRatio > 0.5 ? buoyancyForce * (submergedRatio - 0.5) * 8 : 0;

  // Add immediate correction force if too deep
  const emergencyForce = submergedRatio > 0.8 ? buoyancyForce * 10 : 0;

  const force = {
    x: 0,
    y: -(baseForce + extraForce + emergencyForce), // Very strong upward force
  };

  const position = {
    x: matterBody.position.x,
    y: matterBody.position.y,
  };

  applyForce(position, force);

  // Apply wave forces from the sea layer
  seaLayer.waves.forEach((wave: WaveData, index: number) => {
    if (!wave.isFlowing || index === 0) return; // Skip static flow wave

    const distance = Math.abs(matterBody.position.x - wave.x);
    const maxDistance = seaLayer.windowWidth * 0.3; // Wave influence range

    if (distance < maxDistance) {
      const influence = 1 - distance / maxDistance;
      const waveForce = wave.amplitude * influence * submergedRatio * 0.001;

      // Apply horizontal wave force
      const horizontalForce = {
        x: wave.speed > 0 ? waveForce : -waveForce,
        y: waveForce * 0.5, // Small vertical component
      };

      applyForce(position, horizontalForce);
    }
  });
};

/**
 * Apply friction forces when the surfer is in contact with water
 */
export const applySurferFriction = (
  matterBody: any,
  seaLayer: SeaLayerComponentData,
  setBodyProperty: (property: string, value: any) => void
): void => {
  'worklet';

  const { submergedRatio } = calculateSurferSubmersion(matterBody, seaLayer);

  if (submergedRatio > 0) {
    // In water - apply water friction
    const waterFriction = 0.02 + submergedRatio * 0.08; // Increase friction with submersion
    setBodyProperty('frictionAir', waterFriction);

    // Also apply some angular damping to prevent excessive spinning
    setBodyProperty('frictionStatic', 0.5);
    setBodyProperty('friction', 0.8);
  } else {
    // In air - minimal friction
    setBodyProperty('frictionAir', 0.001);
    setBodyProperty('frictionStatic', 0.1);
    setBodyProperty('friction', 0.1);
  }
};
