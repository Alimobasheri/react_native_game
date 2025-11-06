import {
  SeaLayerComponentData,
  WaveData,
} from '@/Game/ecs-components/SeaLayer';
import {
  getSurferPhysicsConfig,
  SurferPhysicsConfig,
} from './surferPhysicsConfig';
import {
  SurferStateData,
  SurferArcadeState,
} from '@/Game/ecs-components/Surfer';

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
): {
  submergedDepth: number;
  submergedRatio: number;
  isInAir: boolean;
  distanceAboveWater: number;
} => {
  'worklet';

  const surferX = matterBody.position.x;
  const surferY = matterBody.position.y;
  const surferHeight = matterBody.bounds.max.y - matterBody.bounds.min.y;
  const surferBottom = matterBody.bounds.max.y;

  const waterSurfaceY = getWaterSurfaceHeightAtPoint(seaLayer, surferX);

  // Calculate submersion
  const submergedDepth = Math.max(0, surferBottom - waterSurfaceY);
  const submergedRatio = Math.min(1, submergedDepth / surferHeight);

  // Check if surfer is in air (bottom of surfer is above water surface)
  const distanceAboveWater = waterSurfaceY - surferBottom;
  const isInAir = distanceAboveWater > 2; // Small threshold to account for floating

  return { submergedDepth, submergedRatio, isInAir, distanceAboveWater };
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

  // Position surfer so bottom is at or slightly submerged in water surface
  // bottom = position.y + surferHeight/2, so position.y = waterSurfaceY - surferHeight/2
  // For slight submersion (5% by default), add a small amount
  const submersionDepth = surferHeight * 0.05; // 5% submerged for stability
  const targetY = waterSurfaceY - surferHeight / 2 - submersionDepth;

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
 * Calculate the wave slope (derivative) at a specific x position
 * This determines how much the surfer should rotate based on wave steepness
 */
export const getWaveSlopeAtPoint = (
  seaLayer: SeaLayerComponentData,
  x: number
): number => {
  'worklet';

  let totalSlope = 0;

  // Calculate slope contributions from all waves
  seaLayer.waves.forEach((wave: WaveData) => {
    if (!wave.isFlowing) return;

    // The derivative of sin(ax + bt) is a * cos(ax + bt)
    // So slope = amplitude * frequency * cos(normalizedX * frequency + time * speed)
    const normalizedX = (x / seaLayer.windowWidth) * 2 * Math.PI;
    const waveSlope =
      wave.amplitude *
      wave.frequency *
      Math.cos(normalizedX * wave.frequency + wave.time * wave.speed);

    totalSlope += waveSlope;
  });

  return totalSlope;
};

/**
 * Calculate the maximum wave height currently under the surfer
 */
export const getMaxWaveHeightAtPoint = (
  seaLayer: SeaLayerComponentData,
  x: number
): number => {
  'worklet';

  let maxAmplitude = 0;

  seaLayer.waves.forEach((wave: WaveData) => {
    if (!wave.isFlowing) return;

    // Check if wave is near this x position
    const distance = Math.abs(x - wave.x);
    const maxDistance = seaLayer.windowWidth * 0.3;

    if (distance < maxDistance) {
      const influence = 1 - distance / maxDistance;
      const effectiveAmplitude = wave.amplitude * influence;
      maxAmplitude = Math.max(maxAmplitude, effectiveAmplitude);
    }
  });

  return maxAmplitude;
};

/**
 * Determine surfer arcade state based on current body and wave conditions.
 */
export const determineSurferState = (
  matterBody: any,
  seaLayer: SeaLayerComponentData,
  prev: SurferStateData,
  config: SurferPhysicsConfig,
  initialX: number
): SurferStateData => {
  'worklet';

  const newData: SurferStateData = { ...prev };
  newData.timeInStateMs += 16; // approximate frame step; actual delta applied later if available

  const waveSlope = getWaveSlopeAtPoint(seaLayer, initialX);
  const absSlope = Math.abs(waveSlope);
  const maxWaveHeight = getMaxWaveHeightAtPoint(seaLayer, initialX);
  const { isInAir, distanceAboveWater } = calculateSurferSubmersion(
    matterBody,
    seaLayer
  );

  const nearWater = distanceAboveWater <= 6;
  const descending = matterBody.velocity.y > 0;

  const switchState = (s: SurferArcadeState) => {
    newData.state = s;
    newData.timeInStateMs = 0;
  };

  switch (prev.state) {
    case 'STABLE_SURFING': {
      if (
        maxWaveHeight >= config.minWaveHeightForLaunch &&
        absSlope >= config.minWaveSlopeForLaunch
      ) {
        newData.launchPower =
          (maxWaveHeight / Math.max(1, config.minWaveHeightForLaunch)) *
          (0.5 + absSlope);
        switchState('WAVE_LAUNCH');
      }
      break;
    }
    case 'WAVE_LAUNCH': {
      if (isInAir) {
        // decide rotations probabilistically
        const willRotate = Math.random() < config.rotationChanceOnLaunch;
        newData.targetRotations = willRotate
          ? config.rotationTargetChoices[
              0 +
                Math.floor(
                  Math.random() *
                    Math.min(2, config.rotationTargetChoices.length)
                )
            ]
          : 0;
        newData.currentRotationRad = 0;
        newData.rotationsCompleted = 0;
        switchState('AIR_ROTATION');
      }
      break;
    }
    case 'AIR_ROTATION': {
      if (nearWater && descending) {
        switchState('LANDING');
      }
      break;
    }
    case 'LANDING': {
      if (!isInAir) {
        // Touchdown: evaluate landing
        const normalizedAngle =
          ((matterBody.angle + Math.PI) % (2 * Math.PI)) - Math.PI;
        const perfectRotations =
          (newData.targetRotations ?? 0) === newData.rotationsCompleted;
        const upright =
          Math.abs(normalizedAngle) <= config.landingAngleToleranceRad;
        newData.lastLandingWasPerfect = perfectRotations && upright;
        if (newData.lastLandingWasPerfect) {
          newData.scorePending += Math.max(
            50,
            100 * (newData.targetRotations ?? 0)
          );
        }
        switchState('RECOVERY');
      }
      break;
    }
    case 'RECOVERY': {
      const normalizedAngle =
        ((matterBody.angle + Math.PI) % (2 * Math.PI)) - Math.PI;
      const uprightEnough = Math.abs(normalizedAngle) < 0.05;
      const { submergedRatio } = calculateSurferSubmersion(
        matterBody,
        seaLayer
      );
      if (uprightEnough && submergedRatio > 0) {
        switchState('STABLE_SURFING');
      }
      break;
    }
  }

  return newData;
};

/**
 * Apply behavior for the given arcade state; may apply forces/torque.
 */
export const applyStateBehavior = (
  stateData: SurferStateData,
  matterBody: any,
  seaLayer: SeaLayerComponentData,
  config: SurferPhysicsConfig,
  initialX: number,
  deltaTime: number,
  applyForce: (
    position: { x: number; y: number },
    force: { x: number; y: number }
  ) => void
): void => {
  'worklet';

  const bodyHeight = matterBody.bounds.max.y - matterBody.bounds.min.y;
  const leverArm = bodyHeight * 0.3;

  const applyTorque = (torque: number) => {
    const correctionForce = torque / leverArm;
    applyForce(
      { x: initialX, y: matterBody.bounds.min.y },
      { x: correctionForce, y: 0 }
    );
    applyForce(
      { x: initialX, y: matterBody.bounds.max.y },
      { x: -correctionForce, y: 0 }
    );
  };

  switch (stateData.state) {
    case 'STABLE_SURFING': {
      const slope = getWaveSlopeAtPoint(seaLayer, initialX);
      const targetAngle = Math.max(
        -config.waterTiltMaxAngleRad,
        Math.min(config.waterTiltMaxAngleRad, slope)
      );
      const angleError = targetAngle - matterBody.angle;
      if (Math.abs(slope) >= config.minWaveSlopeForWaterTilt) {
        const torque = angleError * config.waterTiltFollowStrength;
        applyTorque(torque);
      } else if (Math.abs(matterBody.angle) > 0.01) {
        const torque = -matterBody.angle * config.rotationDampingInWater;
        applyTorque(torque);
      }
      break;
    }
    case 'WAVE_LAUNCH': {
      const forcePosition = { x: initialX, y: matterBody.position.y };
      const launch = -stateData.launchPower * config.launchImpulseScale;
      applyForce(forcePosition, { x: 0, y: launch });
      // slight priming towards slope
      const slope = getWaveSlopeAtPoint(seaLayer, initialX);
      applyTorque(slope * 0.01);
      break;
    }
    case 'AIR_ROTATION': {
      // controlled angular velocity
      const desiredSpeed =
        (stateData.targetRotations ?? 0) > 0
          ? config.rotationAngularSpeedRad
          : 0;
      if (desiredSpeed > 0) {
        const direction = 1; // default backflip
        const current = matterBody.angularVelocity || 0;
        const error = direction * desiredSpeed - current;
        const torque = error * 0.02; // proportional control
        applyTorque(torque);
      }
      break;
    }
    case 'LANDING': {
      // ease toward upright
      const torque = -matterBody.angle * (config.rotationDampingInWater * 0.5);
      applyTorque(torque);
      break;
    }
    case 'RECOVERY': {
      const torque = -matterBody.angle * config.recoveryDamping;
      applyTorque(torque);
      break;
    }
  }
};

/**
 * Apply platformer-style physics to the surfer
 * - Locks x position (no horizontal movement)
 * - Applies vertical forces based on wave amplitude
 * - Rotates surfer based on wave slope (only when in air)
 * - Uses configurable physics parameters
 */
export const applyPlatformerSurferPhysics = (
  matterBody: any,
  seaLayer: SeaLayerComponentData,
  deltaTime: number,
  initialX: number,
  needsInitialPosition: boolean,
  applyForce: (
    position: { x: number; y: number },
    force: { x: number; y: number }
  ) => void,
  setBodyPosition: (position: { x: number; y: number }) => void,
  surferStateData?: SurferStateData,
  setSurferStateData?: (data: SurferStateData) => void
): void => {
  'worklet';

  const config = getSurferPhysicsConfig();

  // 1. Lock X position - platformer style, surfer doesn't move horizontally
  const currentX = matterBody.position.x;
  const currentY = matterBody.position.y;

  // 1.5. Initial positioning on water surface for first frame
  if (needsInitialPosition) {
    const waterSurfaceY = getWaterSurfaceHeightAtPoint(seaLayer, initialX);
    const surferHeight = matterBody.bounds.max.y - matterBody.bounds.min.y;
    // Position surfer so bottom is at or slightly submerged in water surface
    // bottom = position.y + surferHeight/2, so position.y = waterSurfaceY - surferHeight/2
    // For slight submersion, add a small amount: position.y = waterSurfaceY - surferHeight/2 - (surferHeight * submersionRatio)
    const submersionDepth = surferHeight * config.normalSubmersionRatio;
    const targetY = waterSurfaceY - surferHeight / 2 - submersionDepth;
    setBodyPosition({ x: initialX, y: targetY });
    return; // Skip physics for initial positioning
  }

  // If x position has drifted, force it back to initial position
  if (Math.abs(currentX - initialX) > 0.1) {
    setBodyPosition({ x: initialX, y: currentY });
  }

  // 2. Get current submersion state
  const { submergedRatio, isInAir, distanceAboveWater } =
    calculateSurferSubmersion(matterBody, seaLayer);

  // 3. Check wave conditions
  const maxWaveHeight = getMaxWaveHeightAtPoint(seaLayer, initialX);
  const waveSlope = getWaveSlopeAtPoint(seaLayer, initialX);
  const absWaveSlope = Math.abs(waveSlope);

  // 4. Apply buoyancy and wave forces at multiple points along the surfer's body
  const bodyWidth = matterBody.bounds.max.x - matterBody.bounds.min.x;
  const bodyHeight = matterBody.bounds.max.y - matterBody.bounds.min.y;
  const numberOfPoints = config.bodySamplePoints;

  for (let i = 0; i < numberOfPoints; i++) {
    const pointX =
      matterBody.bounds.min.x + (i * bodyWidth) / (numberOfPoints - 1);
    if (pointX > matterBody.bounds.max.x) break;

    // Calculate water surface at this point
    const waterSurfaceY = getWaterSurfaceHeightAtPoint(seaLayer, pointX);

    // Check how much of the surfer's bottom is submerged
    // The bottom of the surfer is at matterBody.bounds.max.y
    const surferBottomY = matterBody.bounds.max.y;
    const currentSubmergedDepth = Math.max(0, surferBottomY - waterSurfaceY);
    const isPointSubmerged = currentSubmergedDepth > 0;

    if (isPointSubmerged) {
      // Calculate wave force at this point
      let waveForceY = 0;
      seaLayer.waves.forEach((wave: WaveData) => {
        if (!wave.isFlowing) return;

        const distance = Math.abs(pointX - wave.x);
        const maxDistance = seaLayer.windowWidth * 0.3;

        if (distance < maxDistance) {
          const influence = 1 - distance / maxDistance;
          const waveContribution =
            wave.amplitude *
            wave.frequency *
            influence *
            config.waveForceMultiplier;
          waveForceY += waveContribution;
        }
      });

      // Apply wave force at this point
      const forcePosition = { x: pointX, y: waterSurfaceY };
      applyForce(forcePosition, { x: 0, y: waveForceY });

      // Calculate subtle, clamped buoyancy force for realistic bobbing effect
      // Only apply when meaningfully submerged (not just surface contact)
      const submersionRatio = currentSubmergedDepth / bodyHeight;

      if (submersionRatio >= config.minSubmersionForBuoyancy) {
        // Calculate buoyancy proportional to excess submersion beyond target
        // This creates a gentle restoring force that creates bobbing motion
        const excessRatio = Math.max(
          0,
          submersionRatio - config.normalSubmersionRatio
        );

        // Base gentle buoyancy for realistic bobbing (proportional to excess)
        let buoyancyForce = excessRatio * config.buoyancyStrength;

        // Add small base buoyancy when at target to counteract gravity
        if (submersionRatio >= config.normalSubmersionRatio * 0.8) {
          buoyancyForce += config.buoyancyStrength * 0.3;
        }

        // Increase strength gradually as surfer goes deeper (for stronger restoring force)
        if (submersionRatio >= config.strongBuoyancySubmersionThreshold) {
          const deepExcess =
            submersionRatio - config.strongBuoyancySubmersionThreshold;
          buoyancyForce += deepExcess * config.buoyancyStrength * 2.0; // Stronger when deeper
        }

        // Clamp to maximum to prevent sudden bursts
        buoyancyForce = Math.min(buoyancyForce, config.maxBuoyancyForce);

        if (buoyancyForce > 0) {
          applyForce(forcePosition, { x: 0, y: -buoyancyForce });
        }
      }
    }
  }

  // 5. Handle jumping on big waves
  if (maxWaveHeight >= config.minWaveHeightForJump && !isInAir) {
    // Apply extra upward force to launch surfer
    const launchForce =
      (maxWaveHeight / config.minWaveHeightForJump) *
      0.005 *
      config.buoyancyMultiplier;
    const forcePosition = { x: initialX, y: currentY };
    applyForce(forcePosition, { x: 0, y: -launchForce });
  }

  // 6. State-driven rotation and control
  if (surferStateData && setSurferStateData) {
    const prev = surferStateData;
    const next = determineSurferState(
      matterBody,
      seaLayer,
      prev,
      config,
      initialX
    );
    // rotation accumulation/counter during AIR_ROTATION
    if (next.state === 'AIR_ROTATION') {
      const angularSpeed = Math.abs(matterBody.angularVelocity || 0);
      next.currentRotationRad += angularSpeed * (deltaTime / 1000);
      const nextThreshold = (next.rotationsCompleted + 1) * 2 * Math.PI;
      if (next.currentRotationRad >= nextThreshold) {
        next.rotationsCompleted += 1;
      }
    }

    applyStateBehavior(
      next,
      matterBody,
      seaLayer,
      config,
      initialX,
      deltaTime,
      applyForce
    );

    setSurferStateData(next);
  } else {
    // Fallback: gentle tilt in water if no state provided
    if (!isInAir) {
      const targetAngle = Math.max(
        -config.waterTiltMaxAngleRad,
        Math.min(config.waterTiltMaxAngleRad, waveSlope)
      );
      const angleError = targetAngle - matterBody.angle;
      if (Math.abs(angleError) > 0.001) {
        const leverArm = bodyHeight * 0.3;
        const torque = angleError * config.waterTiltFollowStrength;
        const correctionForce = torque / leverArm;
        applyForce(
          { x: initialX, y: matterBody.bounds.min.y },
          { x: correctionForce, y: 0 }
        );
        applyForce(
          { x: initialX, y: matterBody.bounds.max.y },
          { x: -correctionForce, y: 0 }
        );
      }
    }
  }

  // 7. Apply anti-gravity when not submerged
  if (submergedRatio <= 0 && !isInAir) {
    const antiGravityForce = { x: 0, y: -config.antiGravityForce };
    const forcePosition = { x: initialX, y: currentY };
    applyForce(forcePosition, antiGravityForce);
  }

  // 8. Apply velocity damping to prevent excessive bouncing
  if (Math.abs(matterBody.velocity.y) > 0.1) {
    const dampingForce = -matterBody.velocity.y * config.velocityDamping;
    const forcePosition = { x: initialX, y: currentY };
    applyForce(forcePosition, { x: 0, y: dampingForce });
  }

  // 9. Position correction if surfer drifts too far from ideal floating position
  if (!isInAir && submergedRatio > 0) {
    const waterSurfaceY = getWaterSurfaceHeightAtPoint(seaLayer, initialX);
    const surferHeight = bodyHeight;
    // Position surfer so bottom is at or slightly submerged in water surface
    const submersionDepth = surferHeight * config.normalSubmersionRatio;
    const idealY = waterSurfaceY - surferHeight / 2 - submersionDepth;
    const yDifference = currentY - idealY;

    if (Math.abs(yDifference) > config.positionCorrectionThreshold) {
      // Apply gentle correction force
      const correctionForce = -yDifference * 0.0001;
      applyForce({ x: initialX, y: currentY }, { x: 0, y: correctionForce });
    }
  }
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

  const config = getSurferPhysicsConfig();
  const { submergedRatio, isInAir } = calculateSurferSubmersion(
    matterBody,
    seaLayer
  );

  if (submergedRatio > 0 && !isInAir) {
    // In water - apply water friction
    const waterFriction = config.frictionAir * 1.5 + submergedRatio * 0.08; // Increase friction with submersion
    setBodyProperty('frictionAir', waterFriction);

    // Apply angular damping to prevent spinning in water
    setBodyProperty('frictionStatic', 0.5);
    setBodyProperty('friction', 0.8);
  } else {
    // In air - use configured friction
    setBodyProperty('frictionAir', config.frictionAir);
    setBodyProperty('frictionStatic', 0.1);
    setBodyProperty('friction', 0.1);
  }
};
