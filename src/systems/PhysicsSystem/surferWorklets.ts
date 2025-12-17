import {
  SeaLayerComponentData,
  WaveData,
} from '@/Game/ecs-components/SeaLayer';
import { getSurferPhysicsConfig } from './surferPhysicsConfig';

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
 * Simple arcade-style physics: static positioning over water with slight buoyancy oscillation
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
  surferStateData?: any,
  setSurferStateData?: (data: any) => void
): void => {
  'worklet';

  const surferHeight = matterBody.bounds.max.y - matterBody.bounds.min.y;

  // Get water surface height at surfer's x position (primary movement)
  const waterSurfaceY = getWaterSurfaceHeightAtPoint(seaLayer, initialX);

  // Track time for buoyancy oscillation using state data or position-based phase
  let buoyancyTime = 0;
  if (surferStateData && setSurferStateData) {
    // Use state data to track accumulated time
    if (!surferStateData.buoyancyTime) {
      surferStateData.buoyancyTime = 0;
    }
    surferStateData.buoyancyTime += deltaTime / 1000; // Convert to seconds
    buoyancyTime = surferStateData.buoyancyTime;
    setSurferStateData(surferStateData);
  } else {
    // Fallback: use water surface Y as phase input for consistent oscillation
    buoyancyTime = waterSurfaceY * 0.01;
  }

  // Simple sine wave oscillation for buoyancy effect (not real force, just visual)
  // Gentle bobbing up and down on the water surface
  const physicsConfig = getSurferPhysicsConfig();
  const buoyancyAmplitude = physicsConfig.buoyancyAmplitude;
  const buoyancyFrequency = physicsConfig.buoyancyFrequency;
  const buoyancyOffset =
    Math.sin(buoyancyTime * buoyancyFrequency * Math.PI * 2) *
    buoyancyAmplitude;

  // Position surfer: water surface + buoyancy oscillation
  // bottom = position.y + surferHeight/2, so position.y = waterSurfaceY - surferHeight/2
  const targetY = waterSurfaceY - surferHeight / 2 + buoyancyOffset;

  // Set position directly every frame (static positioning, overrides gravity)
  // This manually keeps surfer in place, preventing gravity from pulling down
  setBodyPosition({ x: initialX, y: targetY });
};

/**
 * Set velocity to zero to prevent gravity from pulling surfer down
 */
export const applySurferFriction = (
  matterBody: any,
  seaLayer: SeaLayerComponentData,
  setBodyProperty: (property: string, value: any) => void
): void => {
  'worklet';
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
};
