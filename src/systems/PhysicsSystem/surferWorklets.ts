import {
  SeaLayerComponentData,
  WaveData,
} from '@/Game/ecs-components/SeaLayer';
import { SurferArcadeState } from '@/Game/ecs-components/Surfer';
import { getSurferPhysicsConfig } from './surferPhysicsConfig';
import {
  LoadSceneRequestType,
  UnLoadSceneRequestType,
} from '@/containers/ReactNativeSkiaGameEngine/components-rntge/Scene/events';

/**
 * Calculate the water surface height at a specific x position for a sea layer
 * This matches the shader calculation in waveShader.ts exactly
 * Note: Shader uses normalized coordinates (0-1), so we need to scale by windowHeight
 */
export const getWaterSurfaceHeightAtPoint = (
  seaLayer: SeaLayerComponentData,
  x: number
): number => {
  'worklet';

  // Base water level - use the layer's Y position as the surface level
  let surfaceHeight = seaLayer.y - seaLayer.height / 2;

  // Normalize x coordinate (0-1 range, matching shader's uv.x = fragCoord / canvasSize)
  const normalizedX = x / seaLayer.windowWidth;

  const waveContributions: any[] = [];

  // Process waves - shader uses waves[0] as base flow wave and waves[1] as dynamic touch wave
  // We'll match this exactly: index 0 = base wave, index 1+ = dynamic waves
  seaLayer.waves.forEach((wave: WaveData, index: number) => {
    if (!wave.isFlowing) return;

    if (index === 0) {
      // Base wave (flow wave) - matches shader YPosition function
      // st.x += t where t = iTime * speed
      // d = st.x - (wave_x / canvasSize.x) where wave_x = 0
      // So: d = normalizedX + (time * speed)
      const t = wave.time * wave.speed; // iTime * speed in shader
      const stX = normalizedX + t; // st.x += t
      const d = stX - 0; // wave_x = 0 in shader, so d = stX
      // Calculate wave height - use amplitude directly (no scaling)
      const waveHeight =
        -wave.amplitude * Math.sin(d * wave.frequency * 0.5 + 0.5);
      waveContributions.push({
        index: 0,
        type: 'base',
        amplitude: wave.amplitude,
        d,
        sinValue: Math.sin(d * wave.frequency * 0.5 + 0.5),
        rawWaveHeight: waveHeight,
        finalWaveHeight: waveHeight,
      });
      surfaceHeight += waveHeight;
    } else {
      // Dynamic wave (touch wave or additional waves) - matches shader dynamic wave calculation exactly
      // In shader:
      //   vec2 dynamic_st = st;  // starts as uv (normalized 0-1)
      //   dynamic_st.x += dynamicWave.z * dynamicWave.w;  // speed * time
      //   float dynamicDistance = dynamic_st.x - (dynamicWaveX / canvasSize.x);
      //   st.y += -sin((dynamicDistance * dynamicWave.y)* 0.5 + 0.5) * dynamicWave.x * 0.05 * decayFactor;

      // Match shader calculation exactly:
      // In shader: dynamic_st.x = uv.x + dynamicWave.z * dynamicWave.w
      //           dynamicDistance = dynamic_st.x - (dynamicWaveX / canvasSize.x)
      //           dynamicWaveX = waves[1].x - windowWidth/2 (centered)
      //
      // The shader adds wave progression to the pixel coordinate, not to the wave origin.
      // This makes the wave pattern appear to move as we sample different positions.
      const dynamicStX = normalizedX + wave.speed * wave.time;

      // Wave origin in normalized space (NOT centered - using actual wave.x position)
      // The shader centers it, but that causes the peak to always be at center
      // For correct physics, we need the wave peak to be at the wave's actual position
      const waveOriginNormalized = wave.x / seaLayer.windowWidth;

      // Distance calculation: from current position (with progression) to wave origin
      // This will be 0 when the wave peak is at the surfer's position
      const dynamicDistance = dynamicStX - waveOriginNormalized;

      // Decay factor (matches shader: exp(-8. * abs(distance)))
      const decayFactor = Math.exp(-8.0 * Math.abs(dynamicDistance));

      // Wave height calculation
      // In shader, st.y is in normalized coordinates (0-1), and amplitude is used directly
      // When rendered, normalized coordinates are scaled by canvasSize.y (windowHeight)
      // So: shader adds to normalized st.y, which gets multiplied by windowHeight when rendered
      // We need to match this: use amplitude directly (it's already in the right range for shader)
      // Then scale by windowHeight to convert normalized to pixels
      const sinValue = Math.sin(dynamicDistance * wave.frequency * 0.5 + 0.5);
      const waveHeight =
        -wave.amplitude * 0.05 * decayFactor * sinValue * seaLayer.windowHeight; // Scale normalized coordinate to pixels

      waveContributions.push({
        index: 1,
        type: 'dynamic',
        amplitude: wave.amplitude,
        dynamicDistance,
        decayFactor,
        sinValue,
        rawWaveHeight: waveHeight,
        finalWaveHeight: waveHeight,
      });
      surfaceHeight += waveHeight;
    }
  });

  return surfaceHeight;
};

/**
 * Detect when wave peak is passing by surfer and calculate wave force impact
 * Returns detection result and state recommendations
 */
export const detectWavePeakInteraction = (
  surferX: number,
  wave: WaveData,
  seaLayer: SeaLayerComponentData
): {
  isPeakPassing: boolean;
  waveForce: number;
  shouldLoseBalance: boolean;
  shouldLaunch: boolean;
} => {
  'worklet';

  // If wave is not flowing, no interaction
  if (!wave.isFlowing) {
    return {
      isPeakPassing: false,
      waveForce: 0,
      shouldLoseBalance: false,
      shouldLaunch: false,
    };
  }

  const physicsConfig = getSurferPhysicsConfig();

  // Normalize surfer X coordinate (0-1 range)
  const normalizedSurferX = surferX / seaLayer.windowWidth;

  // Calculate wave peak position using same logic as getWaterSurfaceHeightAtPoint
  // dynamicStX = normalizedSurferX + wave.speed * wave.time
  const dynamicStX = normalizedSurferX + wave.speed * wave.time;

  // Wave origin in normalized space
  const waveOriginNormalized = wave.x / seaLayer.windowWidth;

  // Distance calculation: from current position (with progression) to wave origin
  // This will be 0 when the wave peak is at the surfer's position
  const dynamicDistance = dynamicStX - waveOriginNormalized;

  // Check if peak is passing (within detection threshold)
  const isPeakPassing =
    Math.abs(dynamicDistance) < physicsConfig.wavePeakDetectionThreshold;

  if (!isPeakPassing) {
    return {
      isPeakPassing: false,
      waveForce: 0,
      shouldLoseBalance: false,
      shouldLaunch: false,
    };
  }

  // Check if wave is coming from behind surfer
  const isFromBehind = wave.x < surferX;
  const behindPenalty = isFromBehind
    ? physicsConfig.waveFromBehindPenalty
    : 1.0;

  // Calculate wave force: effective amplitude * effective speed * behind penalty
  const waveForce = wave.amplitude * wave.speed * behindPenalty;

  // Determine state based on thresholds
  const shouldLoseBalance =
    waveForce >= physicsConfig.waveForceLosingBalanceThreshold;
  const shouldLaunch =
    !shouldLoseBalance && waveForce >= physicsConfig.waveForceLaunchThreshold;

  return {
    isPeakPassing: true,
    waveForce,
    shouldLoseBalance,
    shouldLaunch,
  };
};

/**
 * Simple arcade-style physics: static positioning over water with slight buoyancy oscillation
 * Handles multiple states: STABLE_SURFING, LOSING_BALANCE, WAVE_LAUNCH, AIR_ROTATION, LANDING
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
  setBodyProperty: (property: string, value: any) => void,
  surferStateData?: any,
  setSurferStateData?: (data: any) => void,
  eventQueue?: any
): void => {
  'worklet';

  const surferHeight = matterBody.bounds.max.y - matterBody.bounds.min.y;
  const physicsConfig = getSurferPhysicsConfig();

  // Get water surface height at surfer's x position
  const waterSurfaceY = getWaterSurfaceHeightAtPoint(seaLayer, initialX);

  // Update time in state
  if (surferStateData && setSurferStateData) {
    surferStateData.timeInStateMs += deltaTime;
    if (!surferStateData.buoyancyTime) {
      surferStateData.buoyancyTime = 0;
    }
    surferStateData.buoyancyTime += deltaTime / 1000; // Convert to seconds
  }

  const currentState =
    surferStateData?.state || SurferArcadeState.STABLE_SURFING;

  // Handle state-specific physics
  if (currentState === SurferArcadeState.LOSING_BALANCE) {
    // LOSING_BALANCE: Let gravity pull surfer down, apply depth-based friction
    const currentY = matterBody.position.y;
    const surferCenterY = currentY + surferHeight / 2;
    const depth = surferCenterY - waterSurfaceY; // Positive = underwater

    // Lock X position by correcting drift (but don't interfere with Y/gravity)
    // Only correct X if it has drifted significantly
    if (Math.abs(matterBody.position.x - initialX) > 1) {
      // Use applyForce to push X back to initialX without affecting Y
      const xDiff = initialX - matterBody.position.x;
      const correctionForce = xDiff * 0.1; // Gentle correction
      applyForce(
        { x: matterBody.position.x, y: matterBody.position.y },
        { x: correctionForce, y: 0 }
      );
    }

    // Lock X velocity to prevent horizontal drift
    if (matterBody.velocity) {
      matterBody.velocity.x = 0;
    }
    setBodyProperty('velocity', { x: 0, y: matterBody.velocity?.y || 0 });

    // Apply increasing friction based on depth
    if (depth > 0) {
      const friction =
        physicsConfig.fallingFrictionBase +
        depth * physicsConfig.fallingFrictionMultiplier;
      const frictionValue = Math.min(friction, 0.99); // Cap friction
      setBodyProperty('frictionAir', frictionValue);
    }

    // Check if surfer has sunk below threshold
    if (depth >= physicsConfig.sinkDepthThreshold) {
      // Dispatch game over event (only once)
      if (
        eventQueue &&
        eventQueue.addEvent &&
        (!surferStateData || !surferStateData.gameOverDispatched)
      ) {
        eventQueue.addEvent({
          type: LoadSceneRequestType,
          payload: {
            sceneKey: 'gameOver',
          },
        });
        eventQueue.addEvent({
          type: UnLoadSceneRequestType,
          payload: {
            sceneKey: 'Root',
          },
        });
        if (surferStateData && setSurferStateData) {
          surferStateData.gameOverDispatched = true;
          setSurferStateData(surferStateData);
        }
      }
    }
    return;
  }

  if (currentState === SurferArcadeState.WAVE_LAUNCH) {
    // WAVE_LAUNCH: Boost velocity upward, transition to AIR_ROTATION when above water
    const currentY = matterBody.position.y;
    const surferCenterY = currentY + surferHeight / 2;
    const heightAboveWater = waterSurfaceY - surferCenterY; // Positive = above water

    // Lock X position by correcting drift (but don't interfere with Y/gravity)
    if (Math.abs(matterBody.position.x - initialX) > 1) {
      const xDiff = initialX - matterBody.position.x;
      const correctionForce = xDiff * 0.1; // Gentle correction
      applyForce(
        { x: matterBody.position.x, y: matterBody.position.y },
        { x: correctionForce, y: 0 }
      );
    }

    // Apply launch velocity boost (only once, at start)
    if (surferStateData && surferStateData.timeInStateMs < deltaTime * 2) {
      const launchVelocity =
        surferStateData.launchPower * physicsConfig.launchVelocityMultiplier;
      if (matterBody.velocity) {
        matterBody.velocity.y = -launchVelocity; // Negative Y = upward
      }
      setBodyProperty('velocity', { x: 0, y: -launchVelocity });
    } else {
      // Lock X velocity to prevent horizontal drift
      if (matterBody.velocity) {
        matterBody.velocity.x = 0;
        setBodyProperty('velocity', { x: 0, y: matterBody.velocity.y });
      }
    }

    // Transition to AIR_ROTATION when surfer is above water threshold
    // This happens when leaving the water surface after being launched
    if (heightAboveWater >= physicsConfig.launchHeightThreshold) {
      // Transition to AIR_ROTATION
      if (surferStateData && setSurferStateData) {
        surferStateData.state = SurferArcadeState.AIR_ROTATION;
        surferStateData.timeInStateMs = 0;
        surferStateData.currentRotationRad = 0;
        setSurferStateData(surferStateData);
      }
    }
    return;
  }

  if (currentState === SurferArcadeState.AIR_ROTATION) {
    // AIR_ROTATION: Rotate surfer 360°, then transition to LANDING
    // Lock X position by correcting drift (but don't interfere with Y/gravity)
    if (Math.abs(matterBody.position.x - initialX) > 1) {
      const xDiff = initialX - matterBody.position.x;
      const correctionForce = xDiff * 0.1; // Gentle correction
      applyForce(
        { x: matterBody.position.x, y: matterBody.position.y },
        { x: correctionForce, y: 0 }
      );
    }

    // Lock X velocity to prevent horizontal drift
    if (matterBody.velocity) {
      matterBody.velocity.x = 0;
      setBodyProperty('velocity', { x: 0, y: matterBody.velocity.y });
    }

    if (surferStateData && setSurferStateData) {
      const deltaTimeSeconds = deltaTime / 1000;
      surferStateData.currentRotationRad +=
        -Math.sign(surferStateData.waveForce || 1) *
        physicsConfig.rotationSpeed *
        deltaTimeSeconds;

      // Check if rotation is complete (360° = 2π)
      if (Math.abs(surferStateData.currentRotationRad) >= 2 * Math.PI) {
        surferStateData.state = SurferArcadeState.LANDING;
        surferStateData.timeInStateMs = 0;
        surferStateData.rotationsCompleted = 1;
        surferStateData.currentRotationRad = 0; // Reset for landing
        setSurferStateData(surferStateData);
        // Set angle to 0 for landing
        setBodyProperty('angle', 0);
      } else {
        // Apply rotation
        setBodyProperty('angle', surferStateData.currentRotationRad);
        setSurferStateData(surferStateData);
      }
    }
    return;
  }

  if (currentState === SurferArcadeState.LANDING) {
    // LANDING: Gradually lower surfer to water surface, then transition to STABLE_SURFING
    const currentY = matterBody.position.y;
    const surferCenterY = currentY + surferHeight / 2;
    const targetCenterY = waterSurfaceY;
    const distanceToSurface = surferCenterY - targetCenterY;

    // Keep surfer straight
    setBodyProperty('angle', 0);

    // Check if we've reached the water surface
    if (distanceToSurface <= physicsConfig.landingThreshold) {
      // Transition to STABLE_SURFING
      if (surferStateData && setSurferStateData) {
        surferStateData.state = SurferArcadeState.STABLE_SURFING;
        surferStateData.timeInStateMs = 0;
        surferStateData.launchPower = 0;
        surferStateData.rotationsCompleted = 0;
        setSurferStateData(surferStateData);
      }
      // Position at water surface
      const targetY = waterSurfaceY - surferHeight / 2;
      setBodyPosition({ x: initialX, y: targetY });
      return;
    }

    // Gradually lower surfer
    const deltaTimeSeconds = deltaTime / 1000;
    const descentDistance = physicsConfig.landingSpeed * deltaTimeSeconds;
    const newCenterY = Math.max(surferCenterY - descentDistance, targetCenterY);
    const newY = newCenterY - surferHeight / 2;
    setBodyPosition({ x: initialX, y: newY });
    return;
  }

  // STABLE_SURFING: Normal platformer physics with buoyancy
  // Track time for buoyancy oscillation
  let buoyancyTime = 0;
  if (surferStateData && setSurferStateData) {
    buoyancyTime = surferStateData.buoyancyTime;
  } else {
    // Fallback: use water surface Y as phase input for consistent oscillation
    buoyancyTime = waterSurfaceY * 0.01;
  }

  // Simple sine wave oscillation for buoyancy effect (not real force, just visual)
  // Gentle bobbing up and down on the water surface
  const buoyancyAmplitude = physicsConfig.buoyancyAmplitude;
  const buoyancyFrequency = physicsConfig.buoyancyFrequency;
  const buoyancyOffset =
    Math.sin(buoyancyTime * buoyancyFrequency * Math.PI * 2) *
    buoyancyAmplitude;

  // Check wave interaction only when surfer is in STABLE_SURFING state
  if (surferStateData && setSurferStateData && seaLayer.waves.length > 1) {
    // Use wave[1] as the dynamic touch wave
    const dynamicWave = seaLayer.waves[1];
    if (dynamicWave && dynamicWave.isFlowing) {
      const waveInteraction = detectWavePeakInteraction(
        initialX,
        dynamicWave,
        seaLayer
      );

      if (waveInteraction.isPeakPassing) {
        // Update state based on wave force
        if (waveInteraction.shouldLoseBalance) {
          surferStateData.state = SurferArcadeState.LOSING_BALANCE;
          surferStateData.timeInStateMs = 0;
        } else if (waveInteraction.shouldLaunch) {
          surferStateData.state = SurferArcadeState.WAVE_LAUNCH;
          surferStateData.timeInStateMs = 0;
          surferStateData.launchPower = waveInteraction.waveForce;
        }
        // Otherwise stay in STABLE_SURFING
        setSurferStateData(surferStateData);
      }
    }
  }

  // Position surfer: water surface + buoyancy oscillation
  // bottom = position.y + surferHeight/2, so position.y = waterSurfaceY - surferHeight/2
  const targetY = waterSurfaceY - surferHeight / 2 + buoyancyOffset;

  // Set position directly every frame (static positioning, overrides gravity)
  // This manually keeps surfer in place, preventing gravity from pulling down
  setBodyPosition({ x: initialX, y: targetY });
};

/**
 * Set velocity to zero to prevent gravity from pulling surfer down
 * Only applies friction in STABLE_SURFING and LANDING states
 */
export const applySurferFriction = (
  matterBody: any,
  seaLayer: SeaLayerComponentData,
  setBodyProperty: (property: string, value: any) => void,
  surferStateData?: any
): void => {
  'worklet';

  const currentState =
    surferStateData?.state || SurferArcadeState.STABLE_SURFING;

  // Only apply friction in STABLE_SURFING and LANDING states
  // In LOSING_BALANCE, WAVE_LAUNCH, and AIR_ROTATION, allow natural physics
  if (
    currentState === SurferArcadeState.STABLE_SURFING ||
    currentState === SurferArcadeState.LANDING
  ) {
    // Set velocity to zero every frame to override gravity
    // This works with static positioning to keep surfer in place
    if (matterBody.velocity) {
      matterBody.velocity.x = 0;
      matterBody.velocity.y = 0;
    }
    if (matterBody.angularVelocity !== undefined) {
      matterBody.angularVelocity = 0;
    }
    // Also use setBodyProperty as backup
    setBodyProperty('velocity', { x: 0, y: 0 });
    setBodyProperty('angularVelocity', 0);
  }
  // In other states, don't apply friction - let physics work naturally
};
